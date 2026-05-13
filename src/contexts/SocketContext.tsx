import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '@/services/socket';
import {
  attachCallGroupSocketToRedux,
  resetCallGroupSocketReduxAttachment,
} from '@/services/callGroupReduxSync';
import { useAuth } from '@/hooks/useAuth';
import { GlobalChatSocketBridge } from '@/components/GlobalChatSocketBridge';

interface SocketContextValue {
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ isConnected: false });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuth();

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

    socketService.on('connect', handleSocketConnect);
    socketService.on('disconnect', handleSocketDisconnect);
    socketService.on('auth:force_logout', handleForceLogout);

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
      resetCallGroupSocketReduxAttachment();
      socketService.disconnect();
    };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ isConnected }}>
      <GlobalChatSocketBridge />
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = (): SocketContextValue => useContext(SocketContext);
