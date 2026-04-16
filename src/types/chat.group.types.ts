import type { IMessage } from '@/types/chat.types';

export type MessageConfirmState =
  | null
  | { kind: 'recall'; msg: IMessage }
  | { kind: 'delete'; msg: IMessage };

export type GroupMemberRole = 'owner' | 'admin' | 'member';

export type GroupMember = {
  userId: string;
  name?: string;
  avatar?: string;
  role: GroupMemberRole;
  joinedAt?: string;
};

export type GroupRequest = {
  userId: string;
  avatar?: string;
  name?: string;
  displayName?: string;
  status?: 'pending' | 'invited';
  isFriend?: boolean;
  requestedAt?: string;
};

export type GroupPollOption = {
  text: string;
  voters?: string[];
};

export type GroupPoll = {
  pollId: string;
  question: string;
  options: GroupPollOption[];
  createdAt: string;
  isClosed?: boolean;
  isMultipleChoice?: boolean;
};

export type GroupTask = {
  taskId: string;
  title: string;
  description?: string;
  assignees: string[];
  participants?: string[];
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
};

export type AIRecap = {
  summaryId: string;
  content: string;
  createdAt: string;
};

export type GroupActionLoading = {
  updateGroup: boolean;
  deleteGroup: boolean;
  leaveGroup: boolean;
  addMembers: boolean;
  removeMember: boolean;
  changeRole: boolean;
  requestJoin: boolean;
  approveRequest: boolean;
  rejectRequest: boolean;
  createPoll: boolean;
  votePoll: boolean;
  addPollOption: boolean;
  closePoll: boolean;
  createTask: boolean;
  updateTask: boolean;
  generateRecap: boolean;
};
