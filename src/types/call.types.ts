export type CallType = 'audio' | 'video';

export type CallScope = 'direct' | 'group';

export type CallStatus =
  | 'idle'
  | 'outgoing-ringing'
  | 'incoming-ringing'
  | 'connecting'
  | 'connected'
  | 'ended';

export type UpgradeStatus = 'none' | 'pending-outgoing' | 'pending-incoming' | 'accepted';

export type CallDeviceAvailability = 'available' | 'blocked' | 'failed' | 'unavailable';

/** Phiên cuộc gọi nhóm đang mở — dùng nút Tham gia muộn trong chat. */
export type ActiveGroupCallSession = {
  conversationId: string;
  channelName: string;
  type: CallType;
  hostId: string;
  sessionId: string;
};

export interface CallState {
  status: CallStatus;
  callType: CallType | null;
  callScope: CallScope;
  /** Với nhóm: người bắt đầu cuộc gọi (quyền kết thúc cho tất cả). */
  hostId: string | null;
  channelName: string | null;
  conversationId: string | null;
  callerId: string | null;
  callerName: string | null;
  calleeId: string | null;
  isMicOn: boolean;
  isCameraOn: boolean;
  micAvailability: CallDeviceAvailability;
  cameraAvailability: CallDeviceAvailability;
  micErrorMessage: string | null;
  cameraErrorMessage: string | null;
  receiveOnly: boolean;
  upgradeStatus: UpgradeStatus;
  isScreenSharing: boolean;
  /** Route để quay về khi kết thúc/từ chối/timeout cuộc gọi (ưu tiên /chat/:conversationId). */
  returnTo: string | null;
  /** Lý do kết thúc để hiển thị UI full-screen (missed/rejected/busy/...) */
  endReason: 'missed' | 'rejected' | 'busy' | null;
  /** Cuộc gọi nhóm đang diễn ra (theo server) — nút Tham gia trên header chat nhóm. */
  activeGroupCall: ActiveGroupCallSession | null;
}

export interface IncomingCallData {
  callerId: string;
  callerName: string;
  type: CallType;
  channelName: string;
  conversationId: string;
  scope?: CallScope;
  hostId?: string;
  sessionId?: string;
}

/** Server → callee: một thiết bị khác của cùng user đã accept/reject — tắt chuông đồng bộ. */
export interface IncomingCallDismissedPayload {
  channelName: string;
  conversationId: string;
  reason: 'accepted' | 'rejected';
}
