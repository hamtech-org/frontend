import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { socketService } from '@/services/socket';
import { apiClient } from '@/services/api';
import type { RootState, AppDispatch } from '@/store/store';
import type { CallType, IncomingCallData } from '@/types/call.types';
import {
  setOutgoingCall,
  setIncomingCall,
  setCallAccepted,
  setCallEnded,
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
  endCall: () => void;
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
  const navigate = useNavigate();
  const callState = useSelector((state: RootState) => state.call);

  useEffect(() => {
    const onIncoming = (data: unknown) => {
      const payload = data as IncomingCallData;
      dispatch(setIncomingCall(payload));
    };

    const onAccepted = () => {
      dispatch(setCallAccepted());
    };

    const onRejected = () => {
      dispatch(resetCall());
    };

    const onEnded = () => {
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
  }, [dispatch, navigate]);

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

      socketService.emit('call:initiate', { calleeId, type });

      const onChannelReady = (data: unknown) => {
        const payload = data as { channelName: string };
        dispatch(setOutgoingCall({ calleeId, callType: type, channelName: payload.channelName }));
        navigate(`/call?channel=${payload.channelName}&type=${type}`);
        socketService.off('call:channel-ready', onChannelReady);
      };
      socketService.on('call:channel-ready', onChannelReady);
    },
    [callState.status, dispatch, navigate],
  );

  const acceptCall = useCallback(() => {
    if (callState.status !== 'incoming-ringing' || !callState.channelName || !callState.callerId) return;

    socketService.emit('call:accept', {
      channelName: callState.channelName,
      callerId: callState.callerId,
    });
    dispatch(setCallAccepted());
    navigate(`/call?channel=${callState.channelName}&type=${callState.callType || 'audio'}`);
  }, [callState, dispatch, navigate]);

  const rejectCall = useCallback(() => {
    if (!callState.channelName || !callState.callerId) return;

    socketService.emit('call:reject', {
      channelName: callState.channelName,
      callerId: callState.callerId,
    });
    dispatch(resetCall());
  }, [callState, dispatch]);

  const endCall = useCallback(() => {
    const peerId = callState.callerId || callState.calleeId;
    if (!callState.channelName || !peerId) return;

    socketService.emit('call:end', {
      channelName: callState.channelName,
      peerId,
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
