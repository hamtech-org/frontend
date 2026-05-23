import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';
import type { IPost } from '@/types/newsfeed.types';
import type {
  CommunityCategory,
  ICommunity,
  ICommunityContentPage,
  ICommunityJoinRequest,
  ICommunityListPage,
  ICommunityMember,
  ICreateCommunityDto,
  CommunityMemberRole,
  ICommunityModerationLogsPage,
  ICommunityReport,
  ICommunityReportsPage,
} from '@/types/community.types';

export const communityApi = createApi({
  reducerPath: 'communityApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Communities',
    'CommunityDetail',
    'CommunityMembers',
    'CommunityRequests',
    'CommunityPosts',
    'CommunityPendingPosts',
    'CommunityModerationLogs',
    'CommunityReports',
  ],
  endpoints: (builder) => ({
    listCommunities: builder.query<
      ApiSuccessResponse<ICommunityListPage>,
      {
        category?: CommunityCategory;
        scope?: 'discover' | 'joined';
        limit?: number;
        cursor?: string | null;
      } | void
    >({
      query: (params) => ({
        url: '/communities',
        params: {
          category: params?.category,
          scope: params?.scope,
          limit: params?.limit,
          cursor: params?.cursor ?? undefined,
        },
      }),
      providesTags: ['Communities'],
    }),
    createCommunity: builder.mutation<ApiSuccessResponse<ICommunity>, ICreateCommunityDto>({
      query: (body) => ({ url: '/communities', method: 'POST', body }),
      invalidatesTags: ['Communities'],
    }),
    getCommunity: builder.query<ApiSuccessResponse<ICommunity>, string>({
      query: (groupId) => `/communities/${groupId}`,
      providesTags: (_res, _err, groupId) => [{ type: 'CommunityDetail', id: groupId }],
    }),
    updateCommunity: builder.mutation<
      ApiSuccessResponse<ICommunity>,
      { groupId: string; body: Partial<ICreateCommunityDto> }
    >({
      query: ({ groupId, body }) => ({ url: `/communities/${groupId}`, method: 'PUT', body }),
      invalidatesTags: (_res, _err, { groupId }) => [
        'Communities',
        { type: 'CommunityDetail', id: groupId },
        { type: 'CommunityModerationLogs', id: groupId },
      ],
    }),
    archiveCommunity: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (groupId) => ({ url: `/communities/${groupId}`, method: 'DELETE' }),
      invalidatesTags: ['Communities'],
    }),
    joinCommunity: builder.mutation<
      ApiSuccessResponse<{ status: string; community: ICommunity }>,
      { groupId: string; message?: string }
    >({
      query: ({ groupId, message }) => ({
        url: `/communities/${groupId}/join`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: (_res, _err, { groupId }) => [
        'Communities',
        { type: 'CommunityDetail', id: groupId },
      ],
    }),
    leaveCommunity: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (groupId) => ({ url: `/communities/${groupId}/leave`, method: 'POST' }),
      invalidatesTags: (_res, _err, groupId) => [
        'Communities',
        { type: 'CommunityDetail', id: groupId },
      ],
    }),
    getCommunityMembers: builder.query<ApiSuccessResponse<ICommunityMember[]>, string>({
      query: (groupId) => `/communities/${groupId}/members`,
      providesTags: (_res, _err, groupId) => [{ type: 'CommunityMembers', id: groupId }],
    }),
    removeCommunityMember: builder.mutation<
      ApiSuccessResponse<null>,
      { groupId: string; userId: string }
    >({
      query: ({ groupId, userId }) => ({
        url: `/communities/${groupId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, { groupId }) => [
        { type: 'CommunityMembers', id: groupId },
        { type: 'CommunityDetail', id: groupId },
        { type: 'CommunityModerationLogs', id: groupId },
      ],
    }),
    updateCommunityMemberRole: builder.mutation<
      ApiSuccessResponse<null>,
      { groupId: string; userId: string; role: CommunityMemberRole }
    >({
      query: ({ groupId, userId, role }) => ({
        url: `/communities/${groupId}/members/${userId}/role`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: (_res, _err, { groupId }) => [
        { type: 'CommunityMembers', id: groupId },
        { type: 'CommunityDetail', id: groupId },
        { type: 'CommunityModerationLogs', id: groupId },
      ],
    }),
    transferCommunityOwner: builder.mutation<
      ApiSuccessResponse<null>,
      { groupId: string; targetUserId: string }
    >({
      query: ({ groupId, targetUserId }) => ({
        url: `/communities/${groupId}/transfer-owner`,
        method: 'POST',
        body: { targetUserId },
      }),
      invalidatesTags: (_res, _err, { groupId }) => [
        'Communities',
        { type: 'CommunityMembers', id: groupId },
        { type: 'CommunityDetail', id: groupId },
        { type: 'CommunityModerationLogs', id: groupId },
      ],
    }),
    getCommunityRequests: builder.query<ApiSuccessResponse<ICommunityJoinRequest[]>, string>({
      query: (groupId) => `/communities/${groupId}/requests`,
      providesTags: (_res, _err, groupId) => [{ type: 'CommunityRequests', id: groupId }],
    }),
    resolveCommunityRequest: builder.mutation<
      ApiSuccessResponse<null>,
      { groupId: string; userId: string; action: 'approve' | 'reject' }
    >({
      query: ({ groupId, userId, action }) => ({
        url: `/communities/${groupId}/requests/${userId}`,
        method: 'PATCH',
        body: { action },
      }),
      invalidatesTags: (_res, _err, { groupId }) => [
        { type: 'CommunityRequests', id: groupId },
        { type: 'CommunityMembers', id: groupId },
        { type: 'CommunityDetail', id: groupId },
        { type: 'CommunityModerationLogs', id: groupId },
      ],
    }),
    getCommunityPosts: builder.query<
      ApiSuccessResponse<ICommunityContentPage<IPost>>,
      { groupId: string; limit?: number; cursor?: string | null }
    >({
      query: ({ groupId, limit, cursor }) => ({
        url: `/communities/${groupId}/posts`,
        params: { limit, cursor: cursor ?? undefined },
      }),
      providesTags: (_res, _err, { groupId }) => [{ type: 'CommunityPosts', id: groupId }],
    }),
    pinCommunityPost: builder.mutation<
      ApiSuccessResponse<null>,
      { groupId: string; postId: string }
    >({
      query: ({ groupId, postId }) => ({
        url: `/communities/${groupId}/posts/${postId}/pin`,
        method: 'PUT',
      }),
      invalidatesTags: (_res, _err, { groupId }) => [
        { type: 'CommunityPosts', id: groupId },
        { type: 'CommunityModerationLogs', id: groupId },
      ],
    }),
    unpinCommunityPost: builder.mutation<
      ApiSuccessResponse<null>,
      { groupId: string; postId: string }
    >({
      query: ({ groupId, postId }) => ({
        url: `/communities/${groupId}/posts/${postId}/unpin`,
        method: 'PUT',
      }),
      invalidatesTags: (_res, _err, { groupId }) => [
        { type: 'CommunityPosts', id: groupId },
        { type: 'CommunityModerationLogs', id: groupId },
      ],
    }),
    reportEntity: builder.mutation<
      ApiSuccessResponse<ICommunityReport>,
      {
        groupId: string;
        entityType: 'POST' | 'CMT' | 'GROUP';
        entityId: string;
        reason:
          | 'spam'
          | 'harassment'
          | 'hate_speech'
          | 'inappropriate'
          | 'rules_violation'
          | 'other';
        details?: string;
        postId?: string;
        createdAt?: string;
      }
    >({
      query: ({ groupId, ...body }) => ({
        url: `/communities/${groupId}/reports`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { groupId }) => [{ type: 'CommunityReports', id: groupId }],
    }),
    getCommunityReports: builder.query<
      ApiSuccessResponse<ICommunityReportsPage>,
      { groupId: string; status?: string; limit?: number; cursor?: string }
    >({
      query: ({ groupId, status, limit, cursor }) => ({
        url: `/communities/${groupId}/moderation/reports`,
        params: { status, limit, cursor },
      }),
      providesTags: (_res, _err, { groupId }) => [{ type: 'CommunityReports', id: groupId }],
    }),
    resolveCommunityReport: builder.mutation<
      ApiSuccessResponse<ICommunityReport>,
      {
        groupId: string;
        entityType: 'POST' | 'CMT' | 'GROUP';
        entityId: string;
        createdAt: string;
        reporterId: string;
        action: 'dismiss' | 'delete_content' | 'warn_user' | 'ban_user';
        notes?: string;
      }
    >({
      query: ({ groupId, ...body }) => ({
        url: `/communities/${groupId}/moderation/reports/resolve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { groupId }) => [
        { type: 'CommunityReports', id: groupId },
        { type: 'CommunityPosts', id: groupId },
        { type: 'CommunityPendingPosts', id: groupId },
        { type: 'CommunityMembers', id: groupId },
        { type: 'CommunityDetail', id: groupId },
      ],
    }),
    getPendingPosts: builder.query<IPost[], string>({
      query: (groupId) => `/communities/${groupId}/moderation/posts`,
      transformResponse: (response: ApiSuccessResponse<ICommunityContentPage<IPost>>) =>
        response.data.items ?? [],
      providesTags: (_res, _err, groupId) => [{ type: 'CommunityPendingPosts', id: groupId }],
    }),
    resolvePendingPost: builder.mutation<
      ApiSuccessResponse<null>,
      { groupId: string; postId: string; action: 'approve' | 'reject'; rejectReason?: string }
    >({
      query: ({ groupId, postId, action, rejectReason }) => ({
        url: `/communities/${groupId}/moderation/posts/${postId}/resolve`,
        method: 'POST',
        body: { action, rejectReason },
      }),
      invalidatesTags: (_res, _err, { groupId }) => [
        { type: 'CommunityPendingPosts', id: groupId },
        { type: 'CommunityPosts', id: groupId },
        { type: 'CommunityModerationLogs', id: groupId },
      ],
    }),
    getCommunityModerationLogs: builder.query<
      ApiSuccessResponse<ICommunityModerationLogsPage>,
      { groupId: string; limit?: number; cursor?: string | null }
    >({
      query: ({ groupId, limit, cursor }) => ({
        url: `/communities/${groupId}/moderation/logs`,
        params: { limit, cursor: cursor ?? undefined },
      }),
      providesTags: (_res, _err, { groupId }) => [{ type: 'CommunityModerationLogs', id: groupId }],
    }),
    joinCommunityChat: builder.mutation<
      ApiSuccessResponse<{ conversationId: string }>,
      { groupId: string }
    >({
      query: ({ groupId }) => ({
        url: `/communities/${groupId}/join-chat`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, { groupId }) => [{ type: 'CommunityDetail', id: groupId }],
    }),
    linkExistingChat: builder.mutation<
      ApiSuccessResponse<null>,
      { groupId: string; conversationId: string }
    >({
      query: ({ groupId, conversationId }) => ({
        url: `/communities/${groupId}/link-chat`,
        method: 'POST',
        body: { conversationId },
      }),
      invalidatesTags: (_res, _err, { groupId }) => [{ type: 'CommunityDetail', id: groupId }],
    }),
    unlinkChat: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (groupId) => ({
        url: `/communities/${groupId}/link-chat`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, groupId) => [{ type: 'CommunityDetail', id: groupId }],
    }),
  }),
});

export const {
  useArchiveCommunityMutation,
  useCreateCommunityMutation,
  useGetCommunityMembersQuery,
  useGetCommunityPostsQuery,
  useGetCommunityQuery,
  useGetCommunityRequestsQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
  useListCommunitiesQuery,
  useRemoveCommunityMemberMutation,
  useResolveCommunityRequestMutation,
  useTransferCommunityOwnerMutation,
  useUpdateCommunityMemberRoleMutation,
  useUpdateCommunityMutation,
  usePinCommunityPostMutation,
  useUnpinCommunityPostMutation,
  useReportEntityMutation,
  useGetCommunityReportsQuery,
  useResolveCommunityReportMutation,
  useGetPendingPostsQuery,
  useResolvePendingPostMutation,
  useGetCommunityModerationLogsQuery,
  useJoinCommunityChatMutation,
  useLinkExistingChatMutation,
  useUnlinkChatMutation,
} = communityApi;
