import { createApi } from '@reduxjs/toolkit/query/react';
import type { IConversation, IMessage } from '@/types/chat.types';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Conversations', 'Messages'],
  endpoints: (builder) => ({
    getConversations: builder.query<ApiSuccessResponse<IConversation[]>, void>({
      query: () => '/chat/conversations',
      providesTags: ['Conversations'],
    }),
    getMessages: builder.query<ApiSuccessResponse<IMessage[]>, string>({
      query: (conversationId) => `/chat/conversations/${conversationId}/messages`,
      providesTags: ['Messages'],
    }),
  }),
});

export const { useGetConversationsQuery, useGetMessagesQuery } = chatApi;
