import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CallState, CallType, IncomingCallData } from '@/types/call.types';

const initialState: CallState = {
  status: 'idle',
  callType: null,
  channelName: null,
  conversationId: null,
  callerId: null,
  callerName: null,
  calleeId: null,
  isMicOn: true,
  isCameraOn: true,
  upgradeStatus: 'none',
  isScreenSharing: false,
  returnTo: null,
  endReason: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    setOutgoingCall: (
      state,
      action: PayloadAction<{
        calleeId: string;
        callType: CallType;
        channelName: string;
        conversationId?: string | null;
        returnTo?: string | null;
      }>,
    ) => {
      state.status = 'outgoing-ringing';
      state.callType = action.payload.callType;
      state.calleeId = action.payload.calleeId;
      state.channelName = action.payload.channelName;
      state.conversationId = action.payload.conversationId ?? state.conversationId ?? null;
      state.isMicOn = true;
      state.isCameraOn = action.payload.callType === 'video';
      state.returnTo = action.payload.returnTo ?? state.returnTo ?? null;
      state.endReason = null;
    },
    setIncomingCall: (state, action: PayloadAction<IncomingCallData>) => {
      // Cho phép 'ended': B nhận call:ended trên màn chat không qua CallPage → resetCall không chạy,
      // nếu chỉ cho 'idle' thì cuộc gọi sau bị bỏ qua (IncomingCallModal không hiện).
      if (state.status !== 'idle' && state.status !== 'ended') return;
      state.status = 'incoming-ringing';
      state.callType = action.payload.type;
      state.callerId = action.payload.callerId;
      state.callerName = action.payload.callerName;
      state.channelName = action.payload.channelName;
      state.conversationId = action.payload.conversationId;
      state.calleeId = null;
      state.isMicOn = true;
      state.isCameraOn = action.payload.type === 'video';
      state.upgradeStatus = 'none';
      state.isScreenSharing = false;
      state.endReason = null;
    },
    setCallAccepted: (state) => {
      state.status = 'connecting';
    },
    setCallConnected: (state) => {
      state.status = 'connected';
    },
    setCallEnded: (state) => {
      state.status = 'ended';
    },
    setEndReason: (state, action: PayloadAction<'missed' | 'rejected' | null>) => {
      state.endReason = action.payload;
    },
    setReturnTo: (state, action: PayloadAction<string | null>) => {
      state.returnTo = action.payload;
    },
    toggleMic: (state) => {
      state.isMicOn = !state.isMicOn;
    },
    toggleCamera: (state) => {
      state.isCameraOn = !state.isCameraOn;
    },
    setUpgradePendingOutgoing: (state) => {
      state.upgradeStatus = 'pending-outgoing';
    },
    setUpgradePendingIncoming: (state) => {
      state.upgradeStatus = 'pending-incoming';
    },
    setUpgradeAccepted: (state) => {
      state.upgradeStatus = 'accepted';
      state.callType = 'video';
      state.isCameraOn = true;
    },
    resetUpgrade: (state) => {
      state.upgradeStatus = 'none';
    },
    setScreenSharing: (state, action: PayloadAction<boolean>) => {
      state.isScreenSharing = action.payload;
    },
    resetCall: () => initialState,
  },
});

export const {
  setOutgoingCall,
  setIncomingCall,
  setCallAccepted,
  setCallConnected,
  setCallEnded,
  setReturnTo,
  setEndReason,
  toggleMic,
  toggleCamera,
  setUpgradePendingOutgoing,
  setUpgradePendingIncoming,
  setUpgradeAccepted,
  resetUpgrade,
  setScreenSharing,
  resetCall,
} = callSlice.actions;

export default callSlice.reducer;
