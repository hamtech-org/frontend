import type { ChatEndpointBuilder } from '@/store/api/chat/endpointBuilder';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { IConversation } from '@/types/chat.types';
import type {
  CreateConversationRequest,
  MarkAsReadRequest,
  UpdateConversationPreferencesRequest,
} from '@/store/api/chat/types';

export function buildConversationsEndpoints(builder: ChatEndpointBuilder) {
  return {
    getConversations: builder.query<ApiSuccessResponse<IConversation[]>, void>({
      query: () => '/chat/conversations',
      providesTags: ['Conversations'],
    }),
    createConversation: builder.mutation<ApiSuccessResponse<IConversation>, CreateConversationRequest>({
      query: (body) => ({
        url: '/chat/conversations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversations'],
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
  };
}
