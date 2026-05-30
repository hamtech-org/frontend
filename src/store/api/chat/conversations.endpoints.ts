import type { ChatEndpointBuilder } from '@/store/api/chat/endpointBuilder';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { IConversation } from '@/types/chat.types';
import { chatApi } from './core';
import type {
  CreateConversationRequest,
  MarkAsReadRequest,
  UpdateConversationPreferencesRequest,
} from '@/store/api/chat/types';

import { sortConversationsForSidebar } from '@/utils/chatUtils';
import { clearConversationMessages } from '@/store/slices/chatSlice';

export function buildConversationsEndpoints(builder: ChatEndpointBuilder) {
  return {
    getConversations: builder.query<ApiSuccessResponse<IConversation[]>, void>({
      query: () => '/chat/conversations',
      providesTags: ['Conversations'],
    }),
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
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data: res } = await queryFulfilled;
          if (res?.data) {
            const incoming = res.data;
            dispatch(
              chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
                if (!draft?.data) return;
                const idx = draft.data.findIndex(
                  (c) => c.conversationId === incoming.conversationId,
                );
                if (idx >= 0) {
                  draft.data[idx] = { ...draft.data[idx], ...incoming };
                } else {
                  draft.data.push(incoming);
                }
                draft.data = sortConversationsForSidebar(draft.data);
              }),
            );
          }
        } catch {
          // ignore
        }
      },
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

    deleteConversation: builder.mutation<
      ApiSuccessResponse<{
        conversationId: string;
        type: 'direct' | 'group';
        clearedAt: string;
        clearedAtMs: number;
        hiddenFromList: boolean;
      }>,
      { conversationId: string; type: 'direct' | 'group' }
    >({
      query: ({ conversationId }) => ({
        url: `/chat/conversations/${conversationId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ conversationId }, { dispatch, queryFulfilled }) {
        dispatch(clearConversationMessages(conversationId));

        const patchResult = dispatch(
          chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
            if (!draft?.data) return;
            draft.data = draft.data.filter((c) => c.conversationId !== conversationId);
          }),
        );

        const getMessagesPatch = dispatch(
          chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
            if (draft?.data) draft.data = [];
          }),
        );

        const getMessagesPaginatedPatch = dispatch(
          chatApi.util.updateQueryData('getMessagesPaginated', { conversationId }, (draft) => {
            if (draft?.data) {
              draft.data.items = [];
              draft.data.hasMore = false;
              draft.data.nextCursor = null;
            }
          }),
        );

        try {
          const { data: res } = await queryFulfilled;
          if (res?.data) {
            dispatch(
              chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
                if (!draft?.data) return;
                draft.data = draft.data.filter((c) => c.conversationId !== conversationId);
              }),
            );
          }
          dispatch(
            chatApi.util.invalidateTags([
              { type: 'Messages', id: conversationId },
              { type: 'Messages', id: `paginated-${conversationId}` },
            ]),
          );
        } catch {
          patchResult.undo();
          getMessagesPatch.undo();
          getMessagesPaginatedPatch.undo();
        }
      },
    }),
  };
}
