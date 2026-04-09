import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { IConversation, IMessage } from '@/types/chat.types';
import type { ApiSuccessResponse } from '@/types/api.types';

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
