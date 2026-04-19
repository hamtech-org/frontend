export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'file'
  | 'sticker'
  | 'emoji'
  | 'location'
  | 'poll'
  | 'schedule'
  | 'call'
  | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ConversationType = 'direct' | 'group';

/** Người đang gõ trong hội thoại (socket typing). */
export interface TypingUserEntry {
  userId: string;
  displayName: string;
}

export interface IGroupMemberPermissions {
  changeNameAvatar: boolean;
  pinMessages: boolean;
  createNotesReminders: boolean;
  createPolls: boolean;
  sendMessages: boolean;
}

export interface IGroupAdminSettings {
  approvalRequired: boolean;
  highlightLeaderMessages: boolean;
  newMembersReadRecent: boolean;
  allowJoinLink: boolean;
}

export interface IGroupSettings {
  memberPermissions: IGroupMemberPermissions;
  adminSettings: IGroupAdminSettings;
  joinLinkSuffix?: string;
}

export interface IConversation {
  conversationId: string;
  type: ConversationType;
  name: string | null;
  avatar: string | null;
  lastMessage: ILastMessage | null;
  memberCount: number;
  unreadCount: number;
  updatedAt?: string;
  otherUserId?: string;
  /** ISO: tắt push đến mốc này (1h/8h). Hiển thị cùng logic `isMuted` hiệu lực từ API. */
  notificationsMutedUntil?: string | null;
  /** Theo user hiện tại (API gộp từ MEMBER#). */
  isMuted?: boolean;
  /** Ghim hội thoại lên đầu danh sách (giống Zalo). */
  isPinnedToTop?: boolean;
  /** META: số tin đang ghim (hiện icon ghim trên list). */
  pinnedMessageCount?: number;
  /** Nhóm: đồng bộ từ API + socket `group:settings_updated`. */
  groupSettings?: IGroupSettings;
  /** Nhóm đã giải tán (META); không còn thành viên trong GSI — có thể chỉ còn khi cache chưa refetch. */
  isDeleted?: boolean;
}

export interface ILastMessage {
  messageId?: string;
  content: string;
  senderId: string;
  type: MessageType;
  createdAt: string;
  senderDisplayName?: string | null;
}

export interface IReplyToDetails {
  messageId: string;
  senderId: string;
  senderDisplayName: string | null;
  content: string;
  type: MessageType;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaType?: string | null;
}

export interface IMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderDisplayName?: string | null;
  type: MessageType;
  content: string;
  mediaUrl: string | null;
  mediaType?: string | null;
  mediaSize?: number | null;
  mediaOriginalName?: string | null;
  thumbnailUrl: string | null;
  replyTo: string | null;
  replyToDetails?: IReplyToDetails | null;
  isPinned: boolean;
  isEdited: boolean;
  isRecalled: boolean;
  isDeleted?: boolean;
  reactions: Record<string, string[]>;
  /** Tin của mình: sent → delivered → read (chat 1-1). */
  status?: MessageStatus;
  /** Tin của mình: danh sách người đã đọc (API gộp từ lastReadAt thành viên). */
  readBy?: { userId: string; displayName?: string | null }[];
  createdAt: string;
}
