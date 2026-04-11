import { createApi } from '@reduxjs/toolkit/query/react';
import type { IConversation, IMessage } from '@/types/chat.types';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { AppDispatch } from '@/store/store';
import { baseQueryWithReauth } from './baseQuery';

// ─── Request types ─────────────────────────────────────────────────────────────

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
      const alreadySamePreview =
        conv.lastMessage &&
        conv.lastMessage.content === msg.content &&
        conv.lastMessage.senderId === msg.senderId &&
        conv.lastMessage.createdAt === msg.createdAt;
      conv.lastMessage = {
        messageId: msg.messageId,
        content: msg.content,
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

// ─── API ──────────────────────────────────────────────────────────────────────

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Conversations', 'Messages'],
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
