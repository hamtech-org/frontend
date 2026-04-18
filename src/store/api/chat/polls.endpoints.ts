import type { ChatEndpointBuilder } from '@/store/api/chat/endpointBuilder';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { CreatePollRequest } from '@/store/api/chat/types';

export function buildPollsEndpoints(builder: ChatEndpointBuilder) {
  return {
    getPolls: builder.query<ApiSuccessResponse<any[]>, string>({
      query: (groupId) => `/chat/groups/${groupId}/polls`,
      providesTags: (_result, _error, groupId) => [{ type: 'Polls', id: groupId }],
    }),
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
  };
}
