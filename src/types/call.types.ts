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
  conversationId: string | null;
  callerId: string | null;
  callerName: string | null;
  calleeId: string | null;
  isMicOn: boolean;
  isCameraOn: boolean;
  upgradeStatus: UpgradeStatus;
  isScreenSharing: boolean;
  /** Route để quay về khi kết thúc/từ chối/timeout cuộc gọi (ưu tiên /chat/:conversationId). */
  returnTo: string | null;
  /** Lý do kết thúc để hiển thị UI full-screen (missed/rejected/...) */
  endReason: 'missed' | 'rejected' | null;
}

export interface IncomingCallData {
  callerId: string;
  callerName: string;
  type: CallType;
  channelName: string;
  conversationId: string;
}
