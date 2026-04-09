import { useRef, useCallback, useState } from 'react';

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallActive: boolean;
  startCall: (targetUserId: string) => Promise<void>;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
}

export const useWebRTC = (): UseWebRTCReturn => {
  const [isCallActive, setIsCallActive] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const startCall = useCallback(async (_targetUserId: string): Promise<void> => {
    // TODO: Khởi tạo WebRTC peer, lấy media stream, gửi offer qua signaling
    setIsCallActive(true);
  }, []);

  const endCall = useCallback((): void => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setIsCallActive(false);
  }, []);

  const toggleAudio = useCallback((): void => {
    // TODO: Bật/tắt audio track
  }, []);

  const toggleVideo = useCallback((): void => {
    // TODO: Bật/tắt video track
  }, []);

  return {
    localStream: localStreamRef.current,
    remoteStream: remoteStreamRef.current,
    isCallActive,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
  };
};
