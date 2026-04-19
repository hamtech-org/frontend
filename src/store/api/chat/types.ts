import type {
  IConversation,
  IMessage,
  IGroupMemberPermissions,
  IGroupAdminSettings,
} from '@/types/chat.types';

export interface CreateConversationRequest {
  type: IConversation['type'];
  name?: string;
  memberIds: string[];
}

export interface SendMessageRequest {
  conversationId: string;
  type: IMessage['type'];
  content: string;
  mediaUrl?: string;
  mediaId?: string;
  replyTo?: string;
}

export interface EditMessageRequest {
  messageId: string;
  content: string;
  conversationId: string;
  createdAt: string;
}

export interface DeleteMessageRequest {
  messageId: string;
  conversationId: string;
  createdAt: string;
}

export interface RecallMessageRequest {
  messageId: string;
  conversationId: string;
  createdAt: string;
}

export interface MarkAsReadRequest {
  conversationId: string;
  messageId: string;
}

export interface UpdateConversationPreferencesRequest {
  conversationId: string;
  isMuted?: boolean;
  isPinnedToTop?: boolean;
  notificationsMutedUntil?: string | null;
  muteFor?: '1h' | '4h' | '8h';
}

export interface UpdateGroupSettingsRequest {
  groupId: string;
  memberPermissions?: Partial<IGroupMemberPermissions>;
  adminSettings?: Partial<IGroupAdminSettings>;
  regenerateJoinLink?: boolean;
}

export interface PinMessageRequest {
  messageId: string;
  conversationId: string;
  createdAt: string;
}

export interface ReactMessageRequest {
  messageId: string;
  conversationId: string;
  createdAt: string;
  emoji: string;
}

export interface UpdateGroupRequest {
  groupId: string;
  name?: string;
  avatar?: string;
}

export interface AddMembersRequest {
  groupId: string;
  memberIds: string[];
}

export interface ChangeMemberRoleRequest {
  groupId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
}

export interface CreatePollRequest {
  groupId: string;
  question: string;
  options: string[];
  isMultipleChoice?: boolean;
}

export interface CreateTaskRequest {
  groupId: string;
  title: string;
  description?: string;
  assignees: string[];
  dueDate?: string;
}

export interface UpdateTaskStatusRequest {
  groupId: string;
  taskId: string;
  status: 'todo' | 'in_progress' | 'done';
}
