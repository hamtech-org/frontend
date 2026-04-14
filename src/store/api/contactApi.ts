import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';

export const contactApi = createApi({
  reducerPath: 'contactApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Friends', 'Groups'],
  endpoints: (builder) => ({
    getFriends: builder.query<ApiSuccessResponse<unknown[]>, void>({
      query: () => '/contacts/friends',
      providesTags: ['Friends'],
    }),
    getGroups: builder.query<ApiSuccessResponse<unknown[]>, void>({
      query: () => '/contacts/groups',
      providesTags: ['Groups'],
    }),
    deleteFriend: builder.mutation<ApiSuccessResponse<void>, string>({
      query: (friendId) => ({
        url: `/users/friends/${friendId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Friends'],
    }),
  }),
});

export const { useGetFriendsQuery, useGetGroupsQuery, useDeleteFriendMutation } = contactApi;
