import type { ChatEndpointBuilder } from '@/store/api/chat/endpointBuilder';
import type { ApiSuccessResponse } from '@/types/api.types';

export function buildRequestsEndpoints(builder: ChatEndpointBuilder) {
  return {
    getGroupRequests: builder.query<ApiSuccessResponse<any[]>, string>({
      query: (groupId) => `/chat/groups/${groupId}/requests`,
      providesTags: (_result, _error, groupId) => [{ type: 'GroupRequests', id: groupId }],
    }),
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
  };
}
