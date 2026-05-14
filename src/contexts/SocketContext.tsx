import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { socketService } from '@/services/socket';
import {
  attachCallGroupSocketToRedux,
  resetCallGroupSocketReduxAttachment,
} from '@/services/callGroupReduxSync';
import { useAuth } from '@/hooks/useAuth';
import { GlobalChatSocketBridge } from '@/components/GlobalChatSocketBridge';
import { authApi } from '@/store/api/authApi';
import type { AppDispatch } from '@/store/store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SocketContextValue {
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ isConnected: false });

/** Lấy sessionId từ access JWT (payload) — không verify chữ ký, chỉ để so sánh UI. */
function getSessionIdFromAccessToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
  try {
    const segment = raw.split('.')[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);
    const payload = JSON.parse(atob(padded)) as { sessionId?: string };
    return typeof payload.sessionId === 'string' ? payload.sessionId : null;
  } catch {
    return null;
  }
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [newDeviceModal, setNewDeviceModal] = useState<{ open: boolean; ip?: string }>({
    open: false,
  });
  const { accessToken } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    resetCallGroupSocketReduxAttachment();
    socketService.connect(accessToken);

    const handleSocketConnect = () => {
      setIsConnected(true);
      attachCallGroupSocketToRedux();
      socketService.emit('friend:statusChanged', 'online');
    };

    const handleSocketDisconnect = () => {
      setIsConnected(false);
      resetCallGroupSocketReduxAttachment();
    };

    const handleForceLogout = (_data: unknown) => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      socketService.disconnect();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    const handleAuthSessionsChanged = () => {
      dispatch(authApi.util.invalidateTags(['AuthSessions']));
    };

    const handleNewDeviceLogin = (data: unknown) => {
      const p = data as { sessionId?: string; ipAddress?: string };
      if (!p?.sessionId) return;
      const current = getSessionIdFromAccessToken(localStorage.getItem('accessToken'));
      if (current && current === p.sessionId) return;
      setNewDeviceModal({ open: true, ip: p.ipAddress });
      dispatch(authApi.util.invalidateTags(['AuthSessions']));
    };

    socketService.on('connect', handleSocketConnect);
    socketService.on('disconnect', handleSocketDisconnect);
    socketService.on('auth:force_logout', handleForceLogout);
    socketService.on('auth:sessions_changed', handleAuthSessionsChanged);
    socketService.on('auth:new_device_login', handleNewDeviceLogin);

    try {
      if (socketService.getSocket().connected) {
        handleSocketConnect();
      }
    } catch {
      /* socket chưa tạo — chờ sự kiện connect */
    }

    return () => {
      socketService.off('connect', handleSocketConnect);
      socketService.off('disconnect', handleSocketDisconnect);
      socketService.off('auth:force_logout', handleForceLogout);
      socketService.off('auth:sessions_changed', handleAuthSessionsChanged);
      socketService.off('auth:new_device_login', handleNewDeviceLogin);
      resetCallGroupSocketReduxAttachment();
      socketService.disconnect();
    };
  }, [accessToken, dispatch]);

  return (
    <SocketContext.Provider value={{ isConnected }}>
      <GlobalChatSocketBridge />
      {children}

      <Dialog
        open={newDeviceModal.open}
        onOpenChange={(open) => setNewDeviceModal((m) => ({ ...m, open }))}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Thiết bị mới đăng nhập</DialogTitle>
            <DialogDescription asChild>
              <div>
                <p>
                  Có phiên đăng nhập mới trên tài khoản của bạn. Nếu không phải bạn, hãy thu hồi
                  phiên trong mục thiết bị trên trang hồ sơ.
                </p>
                {newDeviceModal.ip ? (
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    IP: {newDeviceModal.ip}
                  </p>
                ) : null}
                <p className="mt-3">
                  <Link to="/profile" className="font-semibold underline underline-offset-4">
                    Mở trang Hồ sơ
                  </Link>{' '}
                  để xem danh sách phiên và thu hồi nếu cần.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t-0 pt-0 sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewDeviceModal({ open: false })}
            >
              Là tôi
            </Button>
            <Button type="button" asChild>
              <Link to="/profile" onClick={() => setNewDeviceModal({ open: false })}>
                Đi tới Hồ sơ
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SocketContext.Provider>
  );
};

export const useSocketContext = (): SocketContextValue => useContext(SocketContext);
