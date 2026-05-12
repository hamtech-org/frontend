import { createApi } from '@reduxjs/toolkit/query/react';
import type {
  AdminAnalyticsDashboardParams,
  IAdminAnalyticsDashboard,
} from '@/types/adminAnalytics.types';
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
    getAdminAnalyticsDashboard: builder.query<
      ApiSuccessResponse<IAdminAnalyticsDashboard>,
      AdminAnalyticsDashboardParams
    >({
      query: (params) => ({
        url: '/admin/analytics/dashboard',
        params: {
          ...(params.from ? { from: params.from } : {}),
          ...(params.to ? { to: params.to } : {}),
          ...(params.interval ? { interval: params.interval } : {}),
        },
      }),
      providesTags: ['Analytics'],
    }),
  }),
});

export const { useGetAdminGroupsQuery, useGetAnalyticsQuery, useGetAdminAnalyticsDashboardQuery } =
  adminApi;
