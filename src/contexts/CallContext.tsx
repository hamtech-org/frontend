import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { socketService } from '@/services/socket';
import { apiClient } from '@/services/api';
import type { RootState, AppDispatch } from '@/store/store';
import type { CallType, IncomingCallData } from '@/types/call.types';
import {
  setOutgoingCall,
  setIncomingCall,
  setCallAccepted,
  setCallEnded,
  setReturnTo,
  setEndReason,
  toggleMic,
  toggleCamera,
  resetCall,
  setUpgradePendingOutgoing,
  setUpgradePendingIncoming,
  setUpgradeAccepted,
  resetUpgrade,
} from '@/store/slices/callSlice';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || '8d20dc4c559344829aade9c1a38ddd62';

interface AgoraTokenResponse {
  token: string;
  uid: number;
  channel: string;
}

interface CallContextValue {
  initiateCall: (calleeId: string, type: CallType) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: (meta?: { durationSec?: number; result?: 'completed' | 'missed' | 'rejected' }) => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  requestUpgradeToVideo: () => void;
  respondUpgradeToVideo: (accepted: boolean) => void;
  fetchAgoraToken: (channelName: string) => Promise<AgoraTokenResponse>;
  appId: string;
}

const CallContext = createContext<CallContextValue | null>(null);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();
  const callState = useSelector((state: RootState) => state.call);

  const getConversationIdFromPath = (pathname: string): string | null => {
    // /chat/:conversationId
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] !== 'chat') return null;
    return parts[1] ?? null;
  };

  useEffect(() => {
    const onIncoming = (data: unknown) => {
      const payload = data as IncomingCallData;
      // Lưu route hiện tại để sau khi kết thúc call quay lại đúng cuộc chat
      dispatch(setReturnTo(location.pathname));
      dispatch(setIncomingCall(payload));
    };

    const onAccepted = () => {
      dispatch(setCallAccepted());
    };

    const onRejected = () => {
      dispatch(setEndReason('rejected'));
      dispatch(setCallEnded());
    };

    const onEnded = () => {
      // Nếu đang rung ở phía người nhận mà bị kết thúc (caller cancel/timeout) => coi như call nhỡ
      if (callState.status === 'incoming-ringing') {
        dispatch(setEndReason('missed'));
      }
      dispatch(setCallEnded());
    };

    const onUpgradeRequest = () => {
      dispatch(setUpgradePendingIncoming());
    };

    const onUpgradeResponse = (data: unknown) => {
      const payload = data as { accepted: boolean };
      if (payload.accepted) {
        dispatch(setUpgradeAccepted());
      } else {
        dispatch(resetUpgrade());
      }
    };

    socketService.on('call:incoming', onIncoming);
    socketService.on('call:accepted', onAccepted);
    socketService.on('call:rejected', onRejected);
    socketService.on('call:ended', onEnded);
    socketService.on('call:upgrade-request', onUpgradeRequest);
    socketService.on('call:upgrade-response', onUpgradeResponse);

    return () => {
      socketService.off('call:incoming', onIncoming);
      socketService.off('call:accepted', onAccepted);
      socketService.off('call:rejected', onRejected);
      socketService.off('call:ended', onEnded);
      socketService.off('call:upgrade-request', onUpgradeRequest);
      socketService.off('call:upgrade-response', onUpgradeResponse);
    };
  }, [dispatch, navigate, callState.status]);

  const fetchAgoraToken = useCallback(
    async (channelName: string): Promise<AgoraTokenResponse> => {
      const res = await apiClient.get('/agora/rtc-token', {
        params: { channelName },
      });
      return res.data.data;
    },
    [],
  );

  const initiateCall = useCallback(
    (calleeId: string, type: CallType) => {
      if (callState.status !== 'idle') return;

      // Nếu đang ở /chat/:conversationId thì ưu tiên quay lại đúng màn hình này
      dispatch(setReturnTo(location.pathname));
      const conversationId = getConversationIdFromPath(location.pathname);
      if (!conversationId) return;
      socketService.emit('call:initiate', { calleeId, type, conversationId });

      // once: tránh chồng listener khi bấm gọi nhanh / StrictMode; tự gỡ sau 1 lần nhận
      socketService.once('call:channel-ready', (data: unknown) => {
        const payload = data as { channelName: string; conversationId?: string };
        dispatch(
          setOutgoingCall({
            calleeId,
            callType: type,
            channelName: payload.channelName,
            conversationId: payload.conversationId ?? conversationId,
            returnTo: location.pathname,
          }),
        );
        navigate(
          `/call?channel=${payload.channelName}&type=${type}&conversationId=${encodeURIComponent(
            payload.conversationId ?? conversationId,
          )}&returnTo=${encodeURIComponent(location.pathname)}`,
        );
      });
    },
    [callState.status, dispatch, navigate, location.pathname],
  );

  const acceptCall = useCallback(() => {
    if (callState.status !== 'incoming-ringing' || !callState.channelName || !callState.callerId) return;

    socketService.emit('call:accept', {
      channelName: callState.channelName,
      callerId: callState.callerId,
      conversationId: callState.conversationId,
      type: callState.callType || 'audio',
    });
    dispatch(setCallAccepted());
    const rt = callState.returnTo ?? location.pathname;
    navigate(
      `/call?channel=${callState.channelName}&type=${callState.callType || 'audio'}&conversationId=${encodeURIComponent(
        callState.conversationId || '',
      )}&returnTo=${encodeURIComponent(rt)}`,
    );
  }, [callState, dispatch, navigate]);

  const rejectCall = useCallback(() => {
    if (!callState.channelName || !callState.callerId) return;

    socketService.emit('call:reject', {
      channelName: callState.channelName,
      callerId: callState.callerId,
      conversationId: callState.conversationId,
      type: callState.callType || 'audio',
    });
    dispatch(resetCall());
  }, [callState, dispatch]);

  const endCall = useCallback((meta?: { durationSec?: number; result?: 'completed' | 'missed' | 'rejected' }) => {
    const peerId = callState.callerId || callState.calleeId;
    if (!callState.channelName || !peerId || !callState.conversationId) return;

    socketService.emit('call:end', {
      channelName: callState.channelName,
      peerId,
      conversationId: callState.conversationId,
      type: callState.callType || 'audio',
      durationSec: meta?.durationSec,
      result: meta?.result,
    });
    dispatch(setCallEnded());
  }, [callState, dispatch]);

  const requestUpgradeToVideo = useCallback(() => {
    const peerId = callState.callerId || callState.calleeId;
    if (!callState.channelName || !peerId) return;

    socketService.emit('call:upgrade-request', {
      peerId,
      channelName: callState.channelName,
    });
    dispatch(setUpgradePendingOutgoing());
  }, [callState, dispatch]);

  const respondUpgradeToVideo = useCallback((accepted: boolean) => {
    const peerId = callState.callerId || callState.calleeId;
    if (!callState.channelName || !peerId) return;

    socketService.emit('call:upgrade-response', {
      peerId,
      channelName: callState.channelName,
      accepted,
    });
    if (accepted) {
      dispatch(setUpgradeAccepted());
    } else {
      dispatch(resetUpgrade());
    }
  }, [callState, dispatch]);

  const onToggleMic = useCallback(() => dispatch(toggleMic()), [dispatch]);
  const onToggleCamera = useCallback(() => dispatch(toggleCamera()), [dispatch]);

  return (
    <CallContext.Provider
      value={{
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        onToggleMic,
        onToggleCamera,
        requestUpgradeToVideo,
        respondUpgradeToVideo,
        fetchAgoraToken,
        appId: AGORA_APP_ID,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCallContext = (): CallContextValue => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCallContext phải dùng trong CallProvider');
  return ctx;
};
