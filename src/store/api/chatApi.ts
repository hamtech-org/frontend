import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { IConversation, IMessage, ConversationType } from '@/types/chat.types';
import type { ApiSuccessResponse } from '@/types/api.types';

// ─── Request types ─────────────────────────────────────────────────────────────

export interface CreateConversationRequest {
  type: ConversationType;
  name?: string;
  memberIds: string[];
}

export interface SendMessageRequest {
  conversationId: string;
  type: IMessage['type'];
  content: string;
  mediaUrl?: string;
  replyTo?: string;
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

export interface PinMessageRequest {
  messageId: string;
  conversationId: string;
  createdAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('accessToken');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Conversations', 'Messages'],
  endpoints: (builder) => ({
    // ─── Queries ──────────────────────────────────────────────────────────
    getConversations: builder.query<ApiSuccessResponse<IConversation[]>, void>({
      query: () => '/chat/conversations',
      providesTags: ['Conversations'],
    }),

    getMessages: builder.query<ApiSuccessResponse<IMessage[]>, { conversationId: string; limit?: number }>({
      query: ({ conversationId, limit }) =>
        `/chat/conversations/${conversationId}/messages${limit ? `?limit=${limit}` : ''}`,
      providesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
      ],
    }),

    // ─── Mutations ────────────────────────────────────────────────────────
    createConversation: builder.mutation<ApiSuccessResponse<IConversation>, CreateConversationRequest>({
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
        'Conversations',
      ],
    }),

    editMessage: builder.mutation<ApiSuccessResponse<null>, EditMessageRequest>({
      query: ({ messageId, ...body }) => ({
        url: `/chat/messages/${messageId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
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
      ],
    }),

    markAsRead: builder.mutation<ApiSuccessResponse<null>, MarkAsReadRequest>({
      query: ({ conversationId, messageId }) => ({
        url: `/chat/conversations/${conversationId}/read`,
        method: 'POST',
        body: { messageId },
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
      ],
    }),

    unpinMessage: builder.mutation<ApiSuccessResponse<null>, PinMessageRequest>({
      query: ({ messageId, ...body }) => ({
        url: `/chat/messages/${messageId}/pin`,
        method: 'DELETE',
        body,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
      ],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useCreateConversationMutation,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useRecallMessageMutation,
  useMarkAsReadMutation,
  usePinMessageMutation,
  useUnpinMessageMutation,
} = chatApi;
