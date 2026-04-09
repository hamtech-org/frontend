import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '@/services/socket';
import { useAuth } from '@/hooks/useAuth';

interface SocketContextValue {
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ isConnected: false });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuth();

  useEffect(() => {
    if (accessToken) {
      socketService.connect(accessToken);
      socketService.on('connect', () => setIsConnected(true));
      socketService.on('disconnect', () => setIsConnected(false));
    }
    return () => { socketService.disconnect(); };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = (): SocketContextValue => useContext(SocketContext);
