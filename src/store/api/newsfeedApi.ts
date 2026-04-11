import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';

export const newsfeedApi = createApi({
  reducerPath: 'newsfeedApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Feed', 'Posts'],
  endpoints: (builder) => ({
    getFeed: builder.query<ApiSuccessResponse<unknown[]>, void>({
      query: () => '/newsfeed/feed',
      providesTags: ['Feed'],
    }),
  }),
});

export const { useGetFeedQuery } = newsfeedApi;
