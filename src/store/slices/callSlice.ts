import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CallState, CallType, IncomingCallData } from '@/types/call.types';

const initialState: CallState = {
  status: 'idle',
  callType: null,
  channelName: null,
  callerId: null,
  callerName: null,
  calleeId: null,
  isMicOn: true,
  isCameraOn: true,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    setOutgoingCall: (
      state,
      action: PayloadAction<{ calleeId: string; callType: CallType; channelName: string }>,
    ) => {
      state.status = 'outgoing-ringing';
      state.callType = action.payload.callType;
      state.calleeId = action.payload.calleeId;
      state.channelName = action.payload.channelName;
      state.isMicOn = true;
      state.isCameraOn = action.payload.callType === 'video';
    },
    setIncomingCall: (state, action: PayloadAction<IncomingCallData>) => {
      if (state.status !== 'idle') return;
      state.status = 'incoming-ringing';
      state.callType = action.payload.type;
      state.callerId = action.payload.callerId;
      state.callerName = action.payload.callerName;
      state.channelName = action.payload.channelName;
      state.isMicOn = true;
      state.isCameraOn = action.payload.type === 'video';
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
    toggleMic: (state) => {
      state.isMicOn = !state.isMicOn;
    },
    toggleCamera: (state) => {
      state.isCameraOn = !state.isCameraOn;
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
  toggleMic,
  toggleCamera,
  resetCall,
} = callSlice.actions;

export default callSlice.reducer;
