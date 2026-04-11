import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['AdminGroups', 'AdminPosts', 'Analytics'],
  endpoints: (builder) => ({
    getAdminGroups: builder.query<ApiSuccessResponse<unknown[]>, void>({
      query: () => '/admin/groups',
      providesTags: ['AdminGroups'],
    }),
    getAnalytics: builder.query<ApiSuccessResponse<unknown>, string>({
      query: (type) => `/admin/analytics/${type}`,
      providesTags: ['Analytics'],
    }),
  }),
});

export const { useGetAdminGroupsQuery, useGetAnalyticsQuery } = adminApi;
