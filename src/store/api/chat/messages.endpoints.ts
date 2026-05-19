import type { ChatEndpointBuilder } from '@/store/api/chat/endpointBuilder';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { IMessage, IMessagePage } from '@/types/chat.types';
import { patchConversationsFromNewMessage } from '@/store/api/chat/cache';
import type { RootState } from '@/store/store';
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
      providesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
      ],
    }),
    /**
     * Cursor-based paginated messages (oldest → newest).
     * All pages for a conversation merge into a single cache entry.
     */
    getMessagesPaginated: builder.query<
      ApiSuccessResponse<IMessagePage>,
      { conversationId: string; limit?: number; cursor?: string }
    >({
      query: ({ conversationId, limit, cursor }) => {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        if (cursor) params.set('cursor', cursor);
        const qs = params.toString();
        return `/chat/conversations/${conversationId}/messages/paginated${qs ? `?${qs}` : ''}`;
      },
      // Group all pages for the same conversation into one cache entry
      serializeQueryArgs: ({ queryArgs }) => queryArgs.conversationId,
      // Merge older pages (prepend) into existing items
      merge: (currentCache, newResponse) => {
        const existingItems = currentCache.data.items;
        const newItems = newResponse.data.items;
        // Dedupe by messageId
        const existingIds = new Set(existingItems.map((m) => m.messageId));
        const uniqueNew = newItems.filter((m) => !existingIds.has(m.messageId));
        // Older items prepend (oldest → newest order)
        currentCache.data.items = [...uniqueNew, ...existingItems];
        currentCache.data.nextCursor = newResponse.data.nextCursor;
        currentCache.data.hasMore = newResponse.data.hasMore;
      },
      // Allow refetch when cursor changes
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.cursor !== previousArg?.cursor,
      providesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: `paginated-${conversationId}` },
      ],
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
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;
          const state = getState() as RootState;
          const currentUserId = state.auth.user?.userId ?? null;
          patchConversationsFromNewMessage(
            dispatch,
            data.data,
            state.chat.activeConversationId,
            currentUserId,
          );
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
    reactMessage: builder.mutation<
      ApiSuccessResponse<Record<string, string[]>>,
      ReactMessageRequest
    >({
      query: ({ messageId, ...body }) => ({
        url: `/chat/messages/${messageId}/react`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
      ],
    }),
  };
}
