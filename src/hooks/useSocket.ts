import { useEffect, useRef } from 'react';
import { socketService } from '@/services/socket';

export const useSocket = (event: string, handler: (data: unknown) => void): void => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (data: unknown): void => handlerRef.current(data);
    socketService.on(event, listener);
    return () => { socketService.off(event, listener); };
  }, [event]);
};
