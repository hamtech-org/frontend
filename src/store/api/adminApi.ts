import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('accessToken');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
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
