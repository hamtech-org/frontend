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
    if (accessToken) {
      resetCallGroupSocketReduxAttachment();
      socketService.connect(accessToken);

      const handleSocketConnect = () => {
        setIsConnected(true);
        attachCallGroupSocketToRedux();
        socketService.emit('friend:statusChanged', 'online');
      };

      socketService.on('connect', handleSocketConnect);
      try {
        if (socketService.getSocket().connected) {
          handleSocketConnect();
        }
      } catch {
        /* socket chưa tạo — chờ sự kiện connect */
      }

      socketService.on('disconnect', () => {
        setIsConnected(false);
        resetCallGroupSocketReduxAttachment();
      });
    }
    return () => {
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
