import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';

export const contactApi = createApi({
  reducerPath: 'contactApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('accessToken');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
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
  }),
});

export const { useGetFriendsQuery, useGetGroupsQuery } = contactApi;
