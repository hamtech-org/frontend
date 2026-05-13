import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { socketService } from '@/services/socket';
import {
  attachCallGroupSocketToRedux,
  resetCallGroupSocketReduxAttachment,
} from '@/services/callGroupReduxSync';
import { useAuth } from '@/hooks/useAuth';
import { GlobalChatSocketBridge } from '@/components/GlobalChatSocketBridge';
import { authApi } from '@/store/api/authApi';
import type { AppDispatch } from '@/store/store';

interface SocketContextValue {
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ isConnected: false });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
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

    socketService.on('connect', handleSocketConnect);
    socketService.on('disconnect', handleSocketDisconnect);
    socketService.on('auth:force_logout', handleForceLogout);
    socketService.on('auth:sessions_changed', handleAuthSessionsChanged);

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
      resetCallGroupSocketReduxAttachment();
      socketService.disconnect();
    };
  }, [accessToken, dispatch]);

  return (
    <SocketContext.Provider value={{ isConnected }}>
      <GlobalChatSocketBridge />
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = (): SocketContextValue => useContext(SocketContext);
