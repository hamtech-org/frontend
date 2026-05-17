import type { ChatEndpointBuilder } from '@/store/api/chat/endpointBuilder';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { IConversation, IGroupSettings } from '@/types/chat.types';
import { normalizeGroupSettings } from '@/utils/normalizeGroupSettings';
import {
  patchGroupProfileInConversationsCache,
  patchGroupSettingsInCaches,
} from '@/utils/groupRealtimeCache';
import type {
  AddMembersRequest,
  ChangeMemberRoleRequest,
  TransferGroupOwnerRequest,
  UpdateGroupRequest,
  UpdateGroupSettingsRequest,
} from '@/store/api/chat/types';

export function buildGroupsEndpoints(builder: ChatEndpointBuilder) {
  return {
    getConversationMembers: builder.query<ApiSuccessResponse<any[]>, string>({
      query: (conversationId) => `/chat/conversations/${conversationId}/members`,
      providesTags: (_result, _error, conversationId) => [
        { type: 'Conversations', id: `MEMBERS-${conversationId}` },
      ],
    }),
    updateGroup: builder.mutation<ApiSuccessResponse<IConversation>, UpdateGroupRequest>({
      query: ({ groupId, ...body }) => ({
        url: `/chat/groups/${groupId}`,
        method: 'PUT',
        body,
      }),
      async onQueryStarted({ groupId }, { dispatch, queryFulfilled }) {
        try {
          const { data: res } = await queryFulfilled;
          const conv = res?.data;
          const cid = String(conv?.conversationId ?? groupId).trim();
          if (!cid || !conv) return;
          patchGroupProfileInConversationsCache(dispatch, cid, {
            name: conv.name,
            avatar: conv.avatar,
            memberCount: conv.memberCount,
            updatedAt: conv.updatedAt,
          });
        } catch {
          /* ignore */
        }
      },
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

    getGroupSettings: builder.query<ApiSuccessResponse<IGroupSettings>, string>({
      query: (groupId) => `/chat/groups/${groupId}/settings`,
      transformResponse: (response: ApiSuccessResponse<IGroupSettings>) => ({
        ...response,
        data: normalizeGroupSettings(response.data),
      }),
      providesTags: (_result, _error, groupId) => [{ type: 'GroupSettings', id: groupId }],
    }),

    updateGroupSettings: builder.mutation<
      ApiSuccessResponse<IGroupSettings>,
      UpdateGroupSettingsRequest
    >({
      query: ({ groupId, ...body }) => ({
        url: `/chat/groups/${groupId}/settings`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiSuccessResponse<IGroupSettings>) => ({
        ...response,
        data: normalizeGroupSettings(response.data),
      }),
      async onQueryStarted({ groupId }, { dispatch, queryFulfilled }) {
        try {
          const { data: res } = await queryFulfilled;
          if (res?.data) {
            patchGroupSettingsInCaches(dispatch, groupId, res.data);
          }
        } catch {
          /* ignore */
        }
      },
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'GroupSettings', id: groupId },
        'Conversations',
      ],
    }),
    addMembers: builder.mutation<ApiSuccessResponse<any>, AddMembersRequest>({
      query: ({ groupId, ...body }) => ({
        url: `/chat/groups/${groupId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        'Conversations',
        { type: 'GroupRequests', id: groupId },
      ],
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
    transferGroupOwner: builder.mutation<ApiSuccessResponse<unknown>, TransferGroupOwnerRequest>({
      query: ({ groupId, ...body }) => ({
        url: `/chat/groups/${groupId}/transfer-owner`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversations'],
    }),
  };
}
