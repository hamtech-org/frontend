export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'file'
  | 'sticker'
  | 'emoji'
  | 'location'
  | 'poll'
  | 'schedule';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ConversationType = 'direct' | 'group';

export interface IConversation {
  conversationId: string;
  type: ConversationType;
  name: string | null;
  avatar: string | null;
  lastMessage: ILastMessage | null;
  memberCount: number;
  unreadCount: number;
}

export interface ILastMessage {
  messageId?: string;
  content: string;
  senderId: string;
  type: MessageType;
  createdAt: string;
}

export interface IMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderDisplayName?: string | null;
  type: MessageType;
  content: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  replyTo: string | null;
  isPinned: boolean;
  isEdited: boolean;
  isRecalled: boolean;
  isDeleted?: boolean;
  reactions: Record<string, string[]>;
  status: MessageStatus;
  createdAt: string;
}
