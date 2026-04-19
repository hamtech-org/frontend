import type { ChatEndpointBuilder } from '@/store/api/chat/endpointBuilder';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { IMessage } from '@/types/chat.types';
import { patchConversationsFromNewMessage } from '@/store/api/chat/cache';
import type {
  DeleteMessageRequest,
  EditMessageRequest,
  PinMessageRequest,
  ReactMessageRequest,
  RecallMessageRequest,
  SendMessageRequest,
} from '@/store/api/chat/types';

export function buildMessagesEndpoints(builder: ChatEndpointBuilder) {
  return {
    getMessages: builder.query<
      ApiSuccessResponse<IMessage[]>,
      { conversationId: string; limit?: number }
    >({
      query: ({ conversationId, limit }) =>
        `/chat/conversations/${conversationId}/messages${limit ? `?limit=${limit}` : ''}`,
      providesTags: (_result, _error, { conversationId }) => [{ type: 'Messages', id: conversationId }],
    }),
    sendMessage: builder.mutation<ApiSuccessResponse<IMessage>, SendMessageRequest>({
      query: ({ conversationId, ...body }) => ({
        url: `/chat/conversations/${conversationId}/messages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [{ type: 'Messages', id: conversationId }],
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
      invalidatesTags: (_result, _error, { conversationId }) => [{ type: 'Messages', id: conversationId }],
    }),
  };
}

