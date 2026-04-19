import { createApi } from '@reduxjs/toolkit/query/react';
import type {
  IConversation,
  IGroupAdminSettings,
  IGroupMemberPermissions,
  IGroupSettings,
  IMessage,
} from '@/types/chat.types';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { AppDispatch } from '@/store/store';
import { baseQueryWithReauth } from './baseQuery';
import { lastMessagePreviewContentFromMessage } from '@/utils/chatUtils';

export { chatApi };
export { patchConversationsFromNewMessage } from '@/store/api/chat/cache';

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

export interface UpdateGroupSettingsRequest {
  groupId: string;
  memberPermissions?: Partial<IGroupMemberPermissions>;
  adminSettings?: Partial<IGroupAdminSettings>;
  regenerateJoinLink?: boolean;
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

/** Cập nhật preview lastMessage + unread trên cache getConversations (gọi sau khi module đã export chatApi). */
export function patchConversationsFromNewMessage(
  dispatch: AppDispatch,
  msg: IMessage,
  activeConversationId: string | null,
): void {
  dispatch(
    chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
      if (!draft?.data) return;
      const conv = draft.data.find((c) => c.conversationId === msg.conversationId);
      if (!conv) return;
      const previewContent = lastMessagePreviewContentFromMessage(msg);
      const alreadySamePreview =
        conv.lastMessage &&
        conv.lastMessage.content === previewContent &&
        conv.lastMessage.senderId === msg.senderId &&
        conv.lastMessage.createdAt === msg.createdAt;
      conv.lastMessage = {
        messageId: msg.messageId,
        content: previewContent,
        senderId: msg.senderId,
        type: msg.type,
        createdAt: msg.createdAt,
        senderDisplayName: msg.senderDisplayName?.trim() ?? null,
      };
      if (msg.conversationId !== activeConversationId && !alreadySamePreview) {
        conv.unreadCount = (conv.unreadCount ?? 0) + 1;
      }
    }),
  );
}

/** Cập nhật một tin trong cache `getMessages` (so khớp messageId kiểu string để tránh lệch kiểu). */
export function patchMessageInGetMessagesCache(
  dispatch: AppDispatch,
  conversationId: string,
  messageId: string,
  patch: Partial<IMessage>,
): void {
  const mid = String(messageId);
  dispatch(
    chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
      if (!draft.data) return;
      const m = draft.data.find((x) => String(x.messageId) === mid);
      if (m) Object.assign(m, patch);
    }),
  );
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Conversations', 'Messages', 'Polls', 'Tasks', 'GroupRequests', 'GroupSettings'],
  endpoints: (builder) => ({
    // ─── Queries ──────────────────────────────────────────────────────────
    getConversations: builder.query<ApiSuccessResponse<IConversation[]>, void>({
      query: () => '/chat/conversations',
      providesTags: ['Conversations'],
    }),

    getMessages: builder.query<
      ApiSuccessResponse<IMessage[]>,
      { conversationId: string; limit?: number }
    >({
      query: ({ conversationId, limit }) =>
        `/chat/conversations/${conversationId}/messages${limit ? `?limit=${limit}` : ''}`,
      providesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
      ],
    }),

    getConversationMembers: builder.query<ApiSuccessResponse<any[]>, string>({
      query: (conversationId) => `/chat/conversations/${conversationId}/members`,
      providesTags: (_result, _error, conversationId) => [{ type: 'Conversations', id: `MEMBERS-${conversationId}` }],
    }),

    getPolls: builder.query<ApiSuccessResponse<any[]>, string>({
      query: (groupId) => `/chat/groups/${groupId}/polls`,
      providesTags: (_result, _error, groupId) => [{ type: 'Polls', id: groupId }],
    }),

    getTasks: builder.query<ApiSuccessResponse<any[]>, string>({
      query: (groupId) => `/chat/groups/${groupId}/tasks`,
      providesTags: (_result, _error, groupId) => [{ type: 'Tasks', id: groupId }],
    }),

    getGroupRequests: builder.query<ApiSuccessResponse<any[]>, string>({
      query: (groupId) => `/chat/groups/${groupId}/requests`,
      providesTags: (_result, _error, groupId) => [{ type: 'GroupRequests', id: groupId }],
    }),

    getGroupSettings: builder.query<ApiSuccessResponse<IGroupSettings>, string>({
      query: (groupId) => `/chat/groups/${groupId}/settings`,
      providesTags: (_result, _error, groupId) => [{ type: 'GroupSettings', id: groupId }],
    }),

    getLatestAIRecap: builder.query<ApiSuccessResponse<any>, string>({
      query: (groupId) => `/chat/groups/${groupId}/ai-recap/latest`,
    }),

    // ─── Mutations ────────────────────────────────────────────────────────
    createConversation: builder.mutation<
      ApiSuccessResponse<IConversation>,
      CreateConversationRequest
    >({
      query: (body) => ({
        url: '/chat/conversations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversations'],
    }),

    sendMessage: builder.mutation<ApiSuccessResponse<IMessage>, SendMessageRequest>({
      query: ({ conversationId, ...body }) => ({
        url: `/chat/conversations/${conversationId}/messages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
      ],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          patchConversationsFromNewMessage(dispatch, data.data, arg.conversationId);
        } catch {
          /* gửi thất bại — không patch list */
        }
      },
    }),

    editMessage: builder.mutation<ApiSuccessResponse<null>, EditMessageRequest>({
      query: ({ messageId, ...body }) => ({
        url: `/chat/messages/${messageId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
        'Conversations',
      ],
    }),

    deleteMessage: builder.mutation<ApiSuccessResponse<null>, DeleteMessageRequest>({
      query: ({ messageId, ...body }) => ({
        url: `/chat/messages/${messageId}`,
        method: 'DELETE',
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
        'Conversations',
      ],
    }),

    recallMessage: builder.mutation<ApiSuccessResponse<null>, RecallMessageRequest>({
      query: ({ messageId, ...body }) => ({
        url: `/chat/messages/${messageId}/recall`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
        'Conversations',
      ],
    }),

    markAsRead: builder.mutation<ApiSuccessResponse<null>, MarkAsReadRequest>({
      query: ({ conversationId, messageId }) => ({
        url: `/chat/conversations/${conversationId}/read`,
        method: 'POST',
        body: { messageId },
      }),
      invalidatesTags: (_r, _e, { conversationId }) => [
        'Conversations',
        { type: 'Messages', id: conversationId },
      ],
    }),

    updateConversationPreferences: builder.mutation<
      ApiSuccessResponse<null>,
      UpdateConversationPreferencesRequest
    >({
      query: ({ conversationId, ...body }) => ({
        url: `/chat/conversations/${conversationId}/preferences`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Conversations'],
    }),

    pinMessage: builder.mutation<ApiSuccessResponse<null>, PinMessageRequest>({
      query: ({ messageId, ...body }) => ({
        url: `/chat/messages/${messageId}/pin`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
        'Conversations',
      ],
    }),

    unpinMessage: builder.mutation<ApiSuccessResponse<null>, PinMessageRequest>({
      query: ({ messageId, conversationId, createdAt }) => {
        const q = new URLSearchParams({ conversationId, createdAt });
        return {
          url: `/chat/messages/${messageId}/pin?${q.toString()}`,
          method: 'DELETE',
        };
      },
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
        'Conversations',
      ],
    }),

    reactMessage: builder.mutation<ApiSuccessResponse<Record<string, string[]>>, ReactMessageRequest>({
      query: ({ messageId, ...body }) => ({
        url: `/chat/messages/${messageId}/react`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
      ],
    }),

    // ─── Group Management ──────────────────────────────────────────────
    updateGroup: builder.mutation<ApiSuccessResponse<any>, UpdateGroupRequest>({
      query: ({ groupId, ...body }) => ({
        url: `/chat/groups/${groupId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Conversations'],
    }),

    deleteGroup: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (groupId) => ({
        url: `/chat/groups/${groupId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Conversations'],
    }),

    leaveGroup: builder.mutation<
      ApiSuccessResponse<null>,
      { groupId: string; newOwnerUserId?: string }
    >({
      query: ({ groupId, newOwnerUserId }) => ({
        url: `/chat/groups/${groupId}/leave`,
        method: 'POST',
        body: newOwnerUserId ? { newOwnerUserId } : {},
      }),
      invalidatesTags: ['Conversations'],
    }),

    addMembers: builder.mutation<ApiSuccessResponse<any>, AddMembersRequest>({
      query: ({ groupId, ...body }) => ({
        url: `/chat/groups/${groupId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversations'],
    }),

    removeMember: builder.mutation<ApiSuccessResponse<null>, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({
        url: `/chat/groups/${groupId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Conversations'],
    }),

    changeMemberRole: builder.mutation<ApiSuccessResponse<null>, ChangeMemberRoleRequest>({
      query: ({ groupId, userId, ...body }) => ({
        url: `/chat/groups/${groupId}/members/${userId}/role`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Conversations'],
    }),

    // ─── Member Requests ───────────────────────────────────────────────
    joinRequest: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (groupId) => ({
        url: `/chat/groups/${groupId}/request`,
        method: 'POST',
      }),
    }),

    approveRequest: builder.mutation<ApiSuccessResponse<null>, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({
        url: `/chat/groups/${groupId}/requests/${userId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'GroupRequests', id: groupId }, 'Conversations'],
    }),

    rejectRequest: builder.mutation<ApiSuccessResponse<null>, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({
        url: `/chat/groups/${groupId}/requests/${userId}/reject`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'GroupRequests', id: groupId }],
    }),

    // ─── Polls ──────────────────────────────────────────────────────────
    createPoll: builder.mutation<ApiSuccessResponse<any>, CreatePollRequest>({
      query: ({ groupId, ...body }) => ({
        url: `/chat/groups/${groupId}/polls`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Polls', id: groupId }],
    }),

    votePoll: builder.mutation<ApiSuccessResponse<any>, { groupId: string; pollId: string; optionIndex: number }>({
      query: ({ groupId, pollId, optionIndex }) => ({
        url: `/chat/groups/${groupId}/polls/${pollId}/vote`,
        method: 'POST',
        body: { optionIndex },
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Polls', id: groupId }],
    }),

    unvotePoll: builder.mutation<ApiSuccessResponse<any>, { groupId: string; pollId: string }>({
      query: ({ groupId, pollId }) => ({
        url: `/chat/groups/${groupId}/polls/${pollId}/unvote`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Polls', id: groupId }],
    }),

    // ─── Tasks ──────────────────────────────────────────────────────────
    createTask: builder.mutation<ApiSuccessResponse<any>, CreateTaskRequest>({
      query: ({ groupId, ...body }) => ({
        url: `/chat/groups/${groupId}/tasks`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Tasks', id: groupId }],
    }),

    updateTaskStatus: builder.mutation<ApiSuccessResponse<any>, UpdateTaskStatusRequest>({
      query: ({ groupId, taskId, ...body }) => ({
        url: `/chat/groups/${groupId}/tasks/${taskId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Tasks', id: groupId }],
    }),

    // ─── AI Recap ───────────────────────────────────────────────────────
    generateAIRecap: builder.mutation<ApiSuccessResponse<any>, string>({
      query: (groupId) => ({
        url: `/chat/groups/${groupId}/ai-recap`,
        method: 'POST',
      }),
    }),

    updateGroupSettings: builder.mutation<ApiSuccessResponse<IGroupSettings>, UpdateGroupSettingsRequest>({
      query: ({ groupId, ...body }) => ({
        url: `/chat/groups/${groupId}/settings`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'GroupSettings', id: groupId },
        'Conversations',
      ],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useGetConversationMembersQuery,
  useCreateConversationMutation,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useRecallMessageMutation,
  useMarkAsReadMutation,
  useUpdateConversationPreferencesMutation,
  usePinMessageMutation,
  useUnpinMessageMutation,
  useReactMessageMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useLeaveGroupMutation,
  useAddMembersMutation,
  useRemoveMemberMutation,
  useChangeMemberRoleMutation,
  useJoinRequestMutation,
  useApproveRequestMutation,
  useRejectRequestMutation,
  useCreatePollMutation,
  useVotePollMutation,
  useUnvotePollMutation,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useGenerateAIRecapMutation,
  useGetPollsQuery,
  useGetTasksQuery,
  useGetGroupRequestsQuery,
  useGetLatestAIRecapQuery,
  useGetGroupSettingsQuery,
  useUpdateGroupSettingsMutation,
} = chatApi;
