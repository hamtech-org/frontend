import type { IMessage } from '@/types/chat.types';

export type MessageConfirmState =
  | null
  | { kind: 'recall'; msg: IMessage }
  | { kind: 'delete'; msg: IMessage };

export type GroupMemberRole = 'owner' | 'admin' | 'member';

export type GroupMember = {
  userId: string;
  name?: string;
  displayName?: string;
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
  creatorId?: string;
  creatorDisplayName?: string | null;
  isClosed?: boolean;
  isMultipleChoice?: boolean;
};

export type GroupTask = {
  taskId: string;
  title: string;
  description?: string;
  assignees: string[];
  participants?: string[];
  /**
   * UI-only hint: task is assigned to whole group and members can opt-in.
   * Backend may not persist this field yet; client keeps it across refetches.
   */
  assignToAll?: boolean;
  /** UI-only hint: broadcast reminder updates for the whole group (no mentions). */
  broadcast?: boolean;
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
  createdAt?: string;
  creatorId?: string;
  creatorDisplayName?: string | null;
  subtasks?: Array<{
    id?: string;
    assigneeId: string;
    assigneeName?: string;
    content: string;
    done?: boolean;
    completedAt?: string | null;
  }>;
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
