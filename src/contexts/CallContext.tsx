import React, { createContext, useContext } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';

type CallContextValue = ReturnType<typeof useWebRTC>;

const CallContext = createContext<CallContextValue | null>(null);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const webrtc = useWebRTC();
  return <CallContext.Provider value={webrtc}>{children}</CallContext.Provider>;
};

export const useCallContext = (): CallContextValue => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCallContext phải dùng trong CallProvider');
  return ctx;
};
