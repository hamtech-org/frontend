import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';
import { chatApi } from './chatApi';
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
  ICommunityInvitation,
  ICommunityAutoMod,
  IUpdateAutoModDto,
  ICommunityAnalyticsDashboard,
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
    'CommunityInvitations',
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
    getCommunityAutoMod: builder.query<ApiSuccessResponse<ICommunityAutoMod>, string>({
      query: (groupId) => `/communities/${groupId}/automod`,
      providesTags: (_res, _err, groupId) => [{ type: 'CommunityDetail', id: groupId }],
    }),
    updateCommunityAutoMod: builder.mutation<
      ApiSuccessResponse<ICommunity>,
      { groupId: string; body: IUpdateAutoModDto }
    >({
      query: ({ groupId, body }) => ({
        url: `/communities/${groupId}/automod`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_res, _err, { groupId }) => [
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
    getJoinedCommunitiesFeed: builder.query<
      ApiSuccessResponse<ICommunityContentPage<IPost>>,
      { limit?: number; cursor?: string | null } | void
    >({
      query: (params) => ({
        url: '/communities/feed',
        params: { limit: params?.limit, cursor: params?.cursor ?? undefined },
      }),
      providesTags: ['CommunityPosts'],
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
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(chatApi.util.invalidateTags(['Conversations']));
        } catch {
          // no-op
        }
      },
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
    inviteFriends: builder.mutation<
      ApiSuccessResponse<{ success: boolean; invitedUserIds: string[] }>,
      { groupId: string; userIds: string[] }
    >({
      query: ({ groupId, userIds }) => ({
        url: `/communities/${groupId}/invites`,
        method: 'POST',
        body: { userIds },
      }),
      invalidatesTags: (_res, _err, { groupId }) => [{ type: 'CommunityDetail', id: groupId }],
    }),
    getReceivedInvitations: builder.query<
      ApiSuccessResponse<{
        items: ICommunityInvitation[];
        nextCursor: string | null;
        hasMore: boolean;
      }>,
      { limit?: number; cursor?: string } | void
    >({
      query: (params) => ({
        url: '/communities/invites',
        params: { limit: params?.limit, cursor: params?.cursor },
      }),
      providesTags: ['CommunityInvitations'],
    }),
    acceptInvitation: builder.mutation<ApiSuccessResponse<ICommunity>, string>({
      query: (groupId) => ({
        url: `/communities/${groupId}/invites/accept`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, groupId) => [
        'Communities',
        'CommunityInvitations',
        { type: 'CommunityDetail', id: groupId },
      ],
    }),
    declineInvitation: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (groupId) => ({
        url: `/communities/${groupId}/invites/decline`,
        method: 'POST',
      }),
      invalidatesTags: ['CommunityInvitations'],
    }),
    getInviteLink: builder.mutation<
      ApiSuccessResponse<{ inviteCode: string; inviteCodeEnabled: boolean }>,
      string
    >({
      query: (groupId) => ({
        url: `/communities/${groupId}/invite-link`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, groupId) => [{ type: 'CommunityDetail', id: groupId }],
    }),
    disableInviteLink: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (groupId) => ({
        url: `/communities/${groupId}/invite-link`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, groupId) => [{ type: 'CommunityDetail', id: groupId }],
    }),
    getCommunityByInviteCode: builder.query<ApiSuccessResponse<ICommunity>, string>({
      query: (inviteCode) => ({
        url: `/communities/join/${inviteCode}`,
      }),
    }),
    acceptInviteLink: builder.mutation<ApiSuccessResponse<ICommunity>, string>({
      query: (inviteCode) => ({
        url: `/communities/join/${inviteCode}/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['Communities'],
    }),
    getCommunityAnalytics: builder.query<
      ApiSuccessResponse<ICommunityAnalyticsDashboard>,
      { groupId: string; days?: number }
    >({
      query: ({ groupId, days = 30 }) => ({
        url: `/communities/${groupId}/analytics`,
        params: { days },
      }),
      providesTags: (_res, _err, { groupId }) => [{ type: 'CommunityDetail', id: groupId }],
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
  useGetCommunityAutoModQuery,
  useUpdateCommunityAutoModMutation,
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
  useGetJoinedCommunitiesFeedQuery,
  useLazyGetJoinedCommunitiesFeedQuery,
  useInviteFriendsMutation,
  useGetReceivedInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useGetInviteLinkMutation,
  useDisableInviteLinkMutation,
  useGetCommunityByInviteCodeQuery,
  useAcceptInviteLinkMutation,
  useGetCommunityAnalyticsQuery,
} = communityApi;
