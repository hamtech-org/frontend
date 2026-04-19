import type { ChatEndpointBuilder } from '@/store/api/chat/endpointBuilder';
import type { ApiSuccessResponse } from '@/types/api.types';
import type {
  AddMembersRequest,
  ChangeMemberRoleRequest,
  UpdateGroupRequest,
} from '@/store/api/chat/types';

export function buildGroupsEndpoints(builder: ChatEndpointBuilder) {
  return {
    getConversationMembers: builder.query<ApiSuccessResponse<any[]>, string>({
      query: (conversationId) => `/chat/conversations/${conversationId}/members`,
      providesTags: (_result, _error, conversationId) => [
        { type: 'Conversations', id: `MEMBERS-${conversationId}` },
      ],
    }),
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
    leaveGroup: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (groupId) => ({
        url: `/chat/groups/${groupId}/leave`,
        method: 'POST',
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
  };
}
