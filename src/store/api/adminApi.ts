import { createApi } from '@reduxjs/toolkit/query/react';
import type {
  AdminAnalyticsDashboardParams,
  IAdminAnalyticsDashboard,
} from '@/types/adminAnalytics.types';
import type { IAdminResourceSummary } from '@/types/adminResources.types';
import type {
  AiAdminDashboard,
  AiAdminConfig,
  UpdateAiAdminConfigBody,
} from '@/types/adminAi.types';
import type {
  AdminGroupListItem,
  AdminListQuery,
  AdminListResult,
  AdminPostListItem,
  AdminUserListItem,
  CreateAdminGroupBody,
  CreateAdminPostBody,
  CreateAdminUserBody,
  UpdateAdminGroupBody,
  UpdateAdminPostBody,
  UpdateAdminUserBody,
  UserRole,
} from '@/types/adminCrud.types';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';

function listParams(query?: AdminListQuery): Record<string, string | number> {
  if (!query) return {};
  return {
    ...(query.query ? { query: query.query } : {}),
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.limit ? { limit: query.limit } : {}),
    ...(query.cursor ? { cursor: query.cursor } : {}),
  };
}

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['AdminUsers', 'AdminGroups', 'AdminPosts', 'Analytics', 'Resources', 'AiAdmin'],
  endpoints: (builder) => ({
    listAdminUsers: builder.query<
      ApiSuccessResponse<AdminListResult<AdminUserListItem>>,
      AdminListQuery | void
    >({
      query: (params) => ({ url: '/admin/users', params: listParams(params ?? undefined) }),
      providesTags: (result) =>
        result?.data.items
          ? [
              ...result.data.items.map((u) => ({ type: 'AdminUsers' as const, id: u.userId })),
              { type: 'AdminUsers', id: 'LIST' },
            ]
          : [{ type: 'AdminUsers', id: 'LIST' }],
    }),
    getAdminUser: builder.query<ApiSuccessResponse<AdminUserListItem>, string>({
      query: (userId) => `/admin/users/${userId}`,
      providesTags: (_r, _e, id) => [{ type: 'AdminUsers', id }],
    }),
    createAdminUser: builder.mutation<ApiSuccessResponse<AdminUserListItem>, CreateAdminUserBody>({
      query: (body) => ({ url: '/admin/users', method: 'POST', body }),
      invalidatesTags: [{ type: 'AdminUsers', id: 'LIST' }],
    }),
    updateAdminUser: builder.mutation<
      ApiSuccessResponse<AdminUserListItem>,
      { userId: string; body: UpdateAdminUserBody }
    >({
      query: ({ userId, body }) => ({ url: `/admin/users/${userId}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: 'AdminUsers', id: userId },
        { type: 'AdminUsers', id: 'LIST' },
      ],
    }),
    updateAdminUserRole: builder.mutation<
      ApiSuccessResponse<AdminUserListItem>,
      { userId: string; role: UserRole }
    >({
      query: ({ userId, role }) => ({
        url: `/admin/users/${userId}/role`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: 'AdminUsers', id: userId },
        { type: 'AdminUsers', id: 'LIST' },
      ],
    }),
    deleteAdminUser: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (userId) => ({ url: `/admin/users/${userId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'AdminUsers', id: 'LIST' }],
    }),

    listAdminGroups: builder.query<
      ApiSuccessResponse<AdminListResult<AdminGroupListItem>>,
      AdminListQuery | void
    >({
      query: (params) => ({ url: '/admin/groups', params: listParams(params ?? undefined) }),
      providesTags: (result) =>
        result?.data.items
          ? [
              ...result.data.items.map((g) => ({ type: 'AdminGroups' as const, id: g.groupId })),
              { type: 'AdminGroups', id: 'LIST' },
            ]
          : [{ type: 'AdminGroups', id: 'LIST' }],
    }),
    getAdminGroup: builder.query<ApiSuccessResponse<AdminGroupListItem>, string>({
      query: (groupId) => `/admin/groups/${groupId}`,
      providesTags: (_r, _e, id) => [{ type: 'AdminGroups', id }],
    }),
    createAdminGroup: builder.mutation<
      ApiSuccessResponse<AdminGroupListItem>,
      CreateAdminGroupBody
    >({
      query: (body) => ({ url: '/admin/groups', method: 'POST', body }),
      invalidatesTags: [{ type: 'AdminGroups', id: 'LIST' }],
    }),
    updateAdminGroup: builder.mutation<
      ApiSuccessResponse<AdminGroupListItem>,
      { groupId: string; body: UpdateAdminGroupBody }
    >({
      query: ({ groupId, body }) => ({ url: `/admin/groups/${groupId}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: 'AdminGroups', id: groupId },
        { type: 'AdminGroups', id: 'LIST' },
      ],
    }),
    deleteAdminGroup: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (groupId) => ({ url: `/admin/groups/${groupId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'AdminGroups', id: 'LIST' }],
    }),

    listAdminPosts: builder.query<
      ApiSuccessResponse<AdminListResult<AdminPostListItem>>,
      AdminListQuery | void
    >({
      query: (params) => ({ url: '/admin/posts', params: listParams(params ?? undefined) }),
      providesTags: (result) =>
        result?.data.items
          ? [
              ...result.data.items.map((p) => ({ type: 'AdminPosts' as const, id: p.postId })),
              { type: 'AdminPosts', id: 'LIST' },
            ]
          : [{ type: 'AdminPosts', id: 'LIST' }],
    }),
    getAdminPost: builder.query<ApiSuccessResponse<AdminPostListItem>, string>({
      query: (postId) => `/admin/posts/${postId}`,
      providesTags: (_r, _e, id) => [{ type: 'AdminPosts', id }],
    }),
    createAdminPost: builder.mutation<ApiSuccessResponse<AdminPostListItem>, CreateAdminPostBody>({
      query: (body) => ({ url: '/admin/posts', method: 'POST', body }),
      invalidatesTags: [{ type: 'AdminPosts', id: 'LIST' }],
    }),
    updateAdminPost: builder.mutation<
      ApiSuccessResponse<AdminPostListItem>,
      { postId: string; body: UpdateAdminPostBody }
    >({
      query: ({ postId, body }) => ({ url: `/admin/posts/${postId}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { postId }) => [
        { type: 'AdminPosts', id: postId },
        { type: 'AdminPosts', id: 'LIST' },
      ],
    }),
    deleteAdminPost: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (postId) => ({ url: `/admin/posts/${postId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'AdminPosts', id: 'LIST' }],
    }),

    getAdminResourceSummary: builder.query<
      ApiSuccessResponse<IAdminResourceSummary>,
      { refresh?: boolean } | void
    >({
      query: (params) => ({
        url: '/admin/resources/summary',
        params: params?.refresh ? { refresh: '1' } : {},
      }),
      providesTags: ['Resources'],
    }),

    getAiAdminDashboard: builder.query<ApiSuccessResponse<AiAdminDashboard>, void>({
      query: () => '/ai/admin/dashboard',
      providesTags: ['AiAdmin'],
    }),
    updateAiAdminConfig: builder.mutation<
      ApiSuccessResponse<AiAdminConfig>,
      UpdateAiAdminConfigBody
    >({
      query: (body) => ({ url: '/ai/admin/config', method: 'PUT', body }),
      invalidatesTags: ['AiAdmin'],
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

export const {
  useListAdminUsersQuery,
  useGetAdminUserQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useUpdateAdminUserRoleMutation,
  useDeleteAdminUserMutation,
  useListAdminGroupsQuery,
  useGetAdminGroupQuery,
  useCreateAdminGroupMutation,
  useUpdateAdminGroupMutation,
  useDeleteAdminGroupMutation,
  useListAdminPostsQuery,
  useGetAdminPostQuery,
  useCreateAdminPostMutation,
  useUpdateAdminPostMutation,
  useDeleteAdminPostMutation,
  useGetAdminResourceSummaryQuery,
  useGetAiAdminDashboardQuery,
  useUpdateAiAdminConfigMutation,
  useGetAnalyticsQuery,
  useGetAdminAnalyticsDashboardQuery,
} = adminApi;
