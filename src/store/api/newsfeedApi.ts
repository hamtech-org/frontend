import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';

export const newsfeedApi = createApi({
  reducerPath: 'newsfeedApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('accessToken');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Feed', 'Posts'],
  endpoints: (builder) => ({
    getFeed: builder.query<ApiSuccessResponse<unknown[]>, void>({
      query: () => '/newsfeed/feed',
      providesTags: ['Feed'],
    }),
  }),
});

export const { useGetFeedQuery } = newsfeedApi;
