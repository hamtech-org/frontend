import type { ChatEndpointBuilder } from '@/store/api/chat/endpointBuilder';
import type { ApiSuccessResponse } from '@/types/api.types';

export type GroupJoinPreview = {
  conversationId: string;
  name: string;
  avatar: string | null;
  memberCount: number;
  approvalRequired: boolean;
  isMember: boolean;
  requestStatus: 'pending' | 'invited' | null;
};

export type GroupJoinViaLinkResult = {
  conversationId: string;
  status: 'joined' | 'pending' | 'already_member';
  memberCount?: number;
};

export function buildJoinEndpoints(builder: ChatEndpointBuilder) {
  return {
    getGroupJoinPreview: builder.query<ApiSuccessResponse<GroupJoinPreview>, string>({
      query: (suffix) => `/chat/join/${encodeURIComponent(suffix)}/preview`,
      providesTags: (_result, _error, suffix) => [{ type: 'GroupJoinPreview', id: suffix }],
    }),
    joinGroupViaLink: builder.mutation<ApiSuccessResponse<GroupJoinViaLinkResult>, string>({
      query: (suffix) => ({
        url: `/chat/join/${encodeURIComponent(suffix)}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, suffix) => [
        'Conversations',
        'GroupRequests',
        { type: 'GroupJoinPreview', id: suffix },
      ],
    }),
  };
}
