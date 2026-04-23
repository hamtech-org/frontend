import { apiClient } from '@/services/api';
import type { ApiSuccessResponse } from '@/types/api.types';
import type {
  AIRecap,
  GroupMember,
  GroupMemberRole,
  GroupPoll,
  GroupRequest,
  GroupTask,
} from '@/types/chat.group.types';

export const groupApi = {
  getMembers(groupId: string) {
    return apiClient.get<ApiSuccessResponse<GroupMember[]>>(`/chat/groups/${groupId}/members`);
  },
  getRequests(groupId: string) {
    return apiClient.get<ApiSuccessResponse<GroupRequest[]>>(`/chat/groups/${groupId}/requests`);
  },
  getPolls(groupId: string) {
    return apiClient.get<ApiSuccessResponse<GroupPoll[]>>(`/chat/groups/${groupId}/polls`);
  },
  getTasks(groupId: string) {
    return apiClient.get<ApiSuccessResponse<GroupTask[]>>(`/chat/groups/${groupId}/tasks`);
  },
  getLatestRecap(groupId: string) {
    return apiClient.get<ApiSuccessResponse<AIRecap | null>>(
      `/chat/groups/${groupId}/ai-recap/latest`,
    );
  },
  updateGroup(groupId: string, payload: { name: string; avatar?: string }) {
    return apiClient.put(`/chat/groups/${groupId}`, payload);
  },
  deleteGroup(groupId: string) {
    return apiClient.delete(`/chat/groups/${groupId}`);
  },
  leaveGroup(groupId: string) {
    return apiClient.post(`/chat/groups/${groupId}/leave`);
  },
  addMembers(groupId: string, memberIds: string[]) {
    return apiClient.post(`/chat/groups/${groupId}/members`, { memberIds });
  },
  createTask(
    groupId: string,
    payload: {
      title: string;
      description?: string;
      dueDate?: string;
      assignees: string[];
      assignToAll?: boolean;
      subtasks?: Array<{ assigneeId: string; content: string }>;
    },
  ) {
    return apiClient.post(`/chat/groups/${groupId}/tasks`, payload);
  },
  patchTask(
    groupId: string,
    taskId: string,
    payload: {
      title: string;
      description?: string;
      assignees: string[];
      assignToAll?: boolean;
      dueDate?: string;
      subtasks?: Array<{ assigneeId: string; content: string }>;
    },
  ) {
    return apiClient.patch(`/chat/groups/${groupId}/tasks/${taskId}`, payload);
  },
  deleteTask(groupId: string, taskId: string) {
    return apiClient.delete(`/chat/groups/${groupId}/tasks/${taskId}`);
  },
  joinTask(groupId: string, taskId: string) {
    return apiClient.post(`/chat/groups/${groupId}/tasks/${taskId}/join`);
  },
  async transferGroupOwnership(
    groupId: string,
    newOwnerUserId: string,
    currentOwnerUserId: string,
  ) {
    await apiClient.put(`/chat/groups/${groupId}/members/${newOwnerUserId}/role`, {
      role: 'owner',
    });
    await apiClient.put(`/chat/groups/${groupId}/members/${currentOwnerUserId}/role`, {
      role: 'admin',
    });
  },
  generateRecap(groupId: string) {
    return apiClient.post<ApiSuccessResponse<AIRecap>>(`/chat/groups/${groupId}/ai-recap`);
  },
  createPoll(
    groupId: string,
    payload: { question: string; options: string[]; isMultipleChoice: boolean },
  ) {
    return apiClient.post(`/chat/groups/${groupId}/polls`, payload);
  },
  requestJoin(groupId: string) {
    return apiClient.post(`/chat/groups/${groupId}/request`);
  },
  addPollOption(groupId: string, pollId: string, text: string) {
    return apiClient.post(`/chat/groups/${groupId}/polls/${pollId}/options`, { text });
  },
  closePoll(groupId: string, pollId: string) {
    return apiClient.post(`/chat/groups/${groupId}/polls/${pollId}/close`);
  },
  approveRequest(groupId: string, userId: string) {
    return apiClient.post(`/chat/groups/${groupId}/requests/${userId}/approve`);
  },
  rejectRequest(groupId: string, userId: string) {
    return apiClient.post(`/chat/groups/${groupId}/requests/${userId}/reject`);
  },
  removeMember(groupId: string, userId: string) {
    return apiClient.delete(`/chat/groups/${groupId}/members/${userId}`);
  },
  changeMemberRole(groupId: string, userId: string, role: GroupMemberRole) {
    return apiClient.put(`/chat/groups/${groupId}/members/${userId}/role`, { role });
  },
  votePoll(groupId: string, pollId: string, optionIndex: number) {
    return apiClient.post(`/chat/groups/${groupId}/polls/${pollId}/vote`, { optionIndex });
  },
  unvotePoll(groupId: string, pollId: string, optionIndex: number) {
    return apiClient.post(`/chat/groups/${groupId}/polls/${pollId}/unvote`, { optionIndex });
  },
  updateTaskStatus(groupId: string, taskId: string, status: GroupTask['status']) {
    return apiClient.put(`/chat/groups/${groupId}/tasks/${taskId}`, { status });
  },
};
