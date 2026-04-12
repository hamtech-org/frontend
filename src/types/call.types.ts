export type CallType = 'audio' | 'video';

export type CallStatus =
  | 'idle'
  | 'outgoing-ringing'
  | 'incoming-ringing'
  | 'connecting'
  | 'connected'
  | 'ended';

export type UpgradeStatus = 'none' | 'pending-outgoing' | 'pending-incoming' | 'accepted';

export interface CallState {
  status: CallStatus;
  callType: CallType | null;
  channelName: string | null;
  callerId: string | null;
  callerName: string | null;
  calleeId: string | null;
  isMicOn: boolean;
  isCameraOn: boolean;
  upgradeStatus: UpgradeStatus;
  isScreenSharing: boolean;
}

export interface IncomingCallData {
  callerId: string;
  callerName: string;
  type: CallType;
  channelName: string;
}
