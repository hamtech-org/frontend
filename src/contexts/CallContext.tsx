import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { socketService } from '@/services/socket';
import { apiClient } from '@/services/api';
import type { RootState, AppDispatch } from '@/store/store';
import { store } from '@/store/store';
import type { CallType, CallScope, IncomingCallData } from '@/types/call.types';
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
  setActiveGroupCall,
  setJoiningGroupCall,
} from '@/store/slices/callSlice';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID;

interface AgoraTokenResponse {
  token: string;
  uid: number;
  channel: string;
}

type ChannelReadyPayload = {
  channelName: string;
  conversationId?: string;
  scope?: CallScope;
  hostId?: string;
  sessionId?: string;
};

function buildCallSearch(
  channelName: string,
  type: CallType,
  conversationId: string,
  returnTo: string,
  scope: CallScope,
  hostId?: string | null,
): string {
  const params = new URLSearchParams();
  params.set('channel', channelName);
  params.set('type', type);
  params.set('conversationId', conversationId);
  params.set('returnTo', returnTo);
  params.set('scope', scope);
  if (hostId) params.set('hostId', hostId);
  return params.toString();
}

interface CallContextValue {
  initiateCall: (calleeId: string, type: CallType) => void;
  initiateGroupCall: (type: CallType) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  /** Cuộc gọi 1-1: gửi call:end + log. */
  endCall: (meta?: { durationSec?: number; result?: 'completed' | 'missed' | 'rejected' }) => void;
  /** Nhóm: rời Agora, cuộc gọi tiếp tục với người khác. */
  leaveGroupCall: () => void;
  /** Nhóm: chỉ host — kết thúc cho mọi người. */
  endGroupCallForAll: (meta?: { durationSec?: number }) => void;
  /** Nhóm: vào kênh đang mở từ chat (phiên active). */
  joinActiveGroupCall: () => void;
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
  const currentUserId = useSelector((state: RootState) => state.auth.user?.userId ?? '');

  const getConversationIdFromPath = (pathname: string): string | null => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] !== 'chat') return null;
    return parts[1] ?? null;
  };

  useEffect(() => {
    const onIncoming = (data: unknown) => {
      const payload = data as IncomingCallData;
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
      const st = store.getState().call.status;
      if (st === 'incoming-ringing') {
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
  }, [dispatch, location.pathname]);

  const fetchAgoraToken = useCallback(async (channelName: string): Promise<AgoraTokenResponse> => {
    const res = await apiClient.get('/agora/rtc-token', {
      params: { channelName },
    });
    return res.data.data;
  }, []);

  const initiateCall = useCallback(
    (calleeId: string, type: CallType) => {
      if (callState.status !== 'idle') return;

      dispatch(setReturnTo(location.pathname));
      const conversationId = getConversationIdFromPath(location.pathname);
      if (!conversationId) return;
      socketService.emit('call:initiate', { calleeId, type, conversationId, scope: 'direct' });

      socketService.once('call:channel-ready', (data: unknown) => {
        const payload = data as ChannelReadyPayload;
        dispatch(
          setOutgoingCall({
            calleeId,
            callType: type,
            channelName: payload.channelName,
            conversationId: payload.conversationId ?? conversationId,
            returnTo: location.pathname,
            callScope: payload.scope ?? 'direct',
            hostId: payload.hostId ?? null,
          }),
        );
        navigate(
          `/call?${buildCallSearch(
            payload.channelName,
            type,
            payload.conversationId ?? conversationId,
            location.pathname,
            payload.scope ?? 'direct',
            payload.hostId,
          )}`,
        );
      });
    },
    [callState.status, dispatch, navigate, location.pathname],
  );

  const initiateGroupCall = useCallback(
    (type: CallType) => {
      if (callState.status !== 'idle') return;

      dispatch(setReturnTo(location.pathname));
      const conversationId = getConversationIdFromPath(location.pathname);
      if (!conversationId) return;
      socketService.emit('call:initiate', { type, conversationId, scope: 'group' });

      socketService.once('call:channel-ready', (data: unknown) => {
        const payload = data as ChannelReadyPayload;
        const conv = payload.conversationId ?? conversationId;
        if (payload.scope === 'group' && payload.sessionId && conv) {
          dispatch(
            setActiveGroupCall({
              conversationId: conv,
              channelName: payload.channelName,
              type,
              hostId: payload.hostId ?? currentUserId,
              sessionId: payload.sessionId,
            }),
          );
        }
        dispatch(
          setOutgoingCall({
            callType: type,
            channelName: payload.channelName,
            conversationId: conv,
            returnTo: location.pathname,
            callScope: 'group',
            hostId: payload.hostId ?? null,
            calleeId: null,
          }),
        );
        navigate(
          `/call?${buildCallSearch(
            payload.channelName,
            type,
            conv,
            location.pathname,
            'group',
            payload.hostId,
          )}`,
        );
      });
    },
    [callState.status, currentUserId, dispatch, navigate, location.pathname],
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
    const convId = callState.conversationId || '';
    const scope = callState.callScope;
    const hostId = callState.hostId ?? callState.callerId;
    navigate(
      `/call?${buildCallSearch(
        callState.channelName,
        callState.callType || 'audio',
        convId,
        rt,
        scope,
        scope === 'group' ? hostId : null,
      )}`,
    );
  }, [callState, dispatch, navigate, location.pathname]);

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

  const endCall = useCallback(
    (meta?: { durationSec?: number; result?: 'completed' | 'missed' | 'rejected' }) => {
      if (callState.callScope === 'group') return;
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
    },
    [callState, dispatch],
  );

  const leaveGroupCall = useCallback(() => {
    if (callState.callScope !== 'group' || !callState.channelName || !callState.conversationId) return;
    socketService.emit('call:group-leave', {
      channelName: callState.channelName,
      conversationId: callState.conversationId,
    });
    dispatch(setCallEnded());
  }, [callState, dispatch]);

  const endGroupCallForAll = useCallback(
    (meta?: { durationSec?: number }) => {
      if (callState.callScope !== 'group' || !callState.channelName || !callState.conversationId) return;
      if (!callState.hostId || callState.hostId !== currentUserId) return;

      socketService.emit('call:group-end-all', {
        channelName: callState.channelName,
        conversationId: callState.conversationId,
        type: callState.callType || 'audio',
        durationSec: meta?.durationSec,
      });
      dispatch(setCallEnded());
    },
    [callState, dispatch, currentUserId],
  );

  const joinActiveGroupCall = useCallback(() => {
    const session = store.getState().call.activeGroupCall;
    const st = store.getState().call.status;
    if (!session) return;
    if (st !== 'idle' && st !== 'ended') return;
    const returnTo = location.pathname;
    dispatch(setReturnTo(returnTo));
    dispatch(
      setJoiningGroupCall({
        callType: session.type,
        channelName: session.channelName,
        conversationId: session.conversationId,
        hostId: session.hostId,
        returnTo,
      }),
    );
    navigate(
      `/call?${buildCallSearch(
        session.channelName,
        session.type,
        session.conversationId,
        returnTo,
        'group',
        session.hostId,
      )}`,
    );
  }, [dispatch, navigate, location.pathname]);

  const requestUpgradeToVideo = useCallback(() => {
    if (callState.callScope === 'group') return;
    const peerId = callState.callerId || callState.calleeId;
    if (!callState.channelName || !peerId) return;

    socketService.emit('call:upgrade-request', {
      peerId,
      channelName: callState.channelName,
    });
    dispatch(setUpgradePendingOutgoing());
  }, [callState, dispatch]);

  const respondUpgradeToVideo = useCallback(
    (accepted: boolean) => {
      if (callState.callScope === 'group') return;
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
    },
    [callState, dispatch],
  );

  const onToggleMic = useCallback(() => dispatch(toggleMic()), [dispatch]);
  const onToggleCamera = useCallback(() => dispatch(toggleCamera()), [dispatch]);

  return (
    <CallContext.Provider
      value={{
        initiateCall,
        initiateGroupCall,
        acceptCall,
        rejectCall,
        endCall,
        leaveGroupCall,
        endGroupCallForAll,
        joinActiveGroupCall,
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
