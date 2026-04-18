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
  | 'call';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ConversationType = 'direct' | 'group';

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
  otherUserId?: string;
  /** Nhóm: đồng bộ từ API + socket `group:settings_updated`. */
  groupSettings?: IGroupSettings;
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
  status: MessageStatus;
  createdAt: string;
}
