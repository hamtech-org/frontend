import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';
import type {
  IComment,
  ICommentsPage,
  ICreateReelDto,
  IFeedPage,
  IPost,
  IReel,
  IReelFeedPage,
  IReportReelDto,
  ISavedPostsPage,
  PostPublicationStatus,
  PostVisibility,
  ReelFeedKind,
} from '@/types/newsfeed.types';
import type { ReactionType, IReactionSummary } from '@/types/reaction.types';

export interface CreatePostBody {
  content: string;
  groupId?: string;
  communityId?: string;
  type: 'text' | 'image' | 'video' | 'link';
  visibility: PostVisibility;
  publicationStatus: PostPublicationStatus;
  categories?: string[];
  tags?: string[];
  mediaUrls?: string[];
}

export interface UpdatePostBody {
  content?: string;
  visibility?: PostVisibility;
  publicationStatus?: PostPublicationStatus;
  categories?: string[];
  tags?: string[];
  type?: 'text' | 'image' | 'video' | 'link';
  mediaUrls?: string[];
}

export interface FeedQueryParams {
  limit?: number;
  cursor?: string | null;
}

export interface SharePostBody {
  content?: string;
  visibility?: PostVisibility;
}

export interface CommentsQueryParams {
  postId: string;
  limit?: number;
  cursor?: string | null;
}

export interface ReelsFeedQueryParams {
  feed?: ReelFeedKind;
  limit?: number;
  cursor?: string | null;
}

export interface ReelCommentsQueryParams {
  reelId: string;
  limit?: number;
  cursor?: string | null;
}

export const newsfeedApi = createApi({
  reducerPath: 'newsfeedApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Feed', 'Posts', 'PostDetail', 'Comments', 'ReelsFeed', 'ReelDetail', 'ReelComments'],
  endpoints: (builder) => ({
    getFeed: builder.query<ApiSuccessResponse<IFeedPage>, FeedQueryParams | void>({
      query: (params) => ({
        url: '/newsfeed/feed',
        params: {
          limit: params?.limit,
          cursor: params?.cursor ?? undefined,
        },
      }),
      providesTags: ['Feed'],
    }),

    getPostById: builder.query<ApiSuccessResponse<IPost>, string>({
      query: (postId) => `/newsfeed/posts/${postId}`,
      providesTags: (_res, _err, postId) => [{ type: 'PostDetail', id: postId }],
    }),

    getPostsByAuthor: builder.query<
      ApiSuccessResponse<IFeedPage>,
      { authorId: string; limit?: number }
    >({
      query: ({ authorId, limit }) => ({
        url: `/newsfeed/posts/by-author/${encodeURIComponent(authorId)}`,
        params: { limit },
      }),
      providesTags: (_res, _err, arg) => [{ type: 'Posts', id: `AUTHOR-${arg.authorId}` }],
    }),

    createPost: builder.mutation<ApiSuccessResponse<IPost>, CreatePostBody>({
      query: (body) => ({
        url: '/newsfeed/posts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Feed', 'Posts'],
    }),

    updatePost: builder.mutation<
      ApiSuccessResponse<null>,
      { postId: string; data: UpdatePostBody }
    >({
      query: ({ postId, data }) => ({
        url: `/newsfeed/posts/${postId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, arg) => [
        'Feed',
        'Posts',
        { type: 'PostDetail', id: arg.postId },
      ],
    }),

    deletePost: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (postId) => ({
        url: `/newsfeed/posts/${postId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, postId) => ['Feed', { type: 'PostDetail', id: postId }],
    }),

    getComments: builder.query<ApiSuccessResponse<ICommentsPage>, CommentsQueryParams>({
      query: ({ postId, limit, cursor }) => ({
        url: `/newsfeed/posts/${postId}/comments`,
        params: {
          limit,
          cursor: cursor ?? undefined,
        },
      }),
      providesTags: (_res, _err, arg) => [{ type: 'Comments', id: arg.postId }],
    }),

    addComment: builder.mutation<
      ApiSuccessResponse<IComment>,
      { postId: string; content: string; parentId?: string; mediaUrls?: string[] }
    >({
      query: ({ postId, content, parentId, mediaUrls }) => ({
        url: `/newsfeed/posts/${postId}/comments`,
        method: 'POST',
        body: { content, parentId, mediaUrls },
      }),
      async onQueryStarted(
        { postId, content, parentId, mediaUrls },
        { dispatch, queryFulfilled, getState },
      ) {
        // Chỉ optimistic update cho top-level comment
        if (parentId) return;

        const currentUser = (
          getState() as {
            auth?: { user?: { userId?: string; displayName?: string; avatar?: string | null } };
          }
        )?.auth?.user;
        const tempId = `temp-${Date.now()}`;
        const tempComment: IComment = {
          commentId: tempId,
          postId,
          authorId: currentUser?.userId ?? 'me',
          author: {
            userId: currentUser?.userId ?? 'me',
            displayName: currentUser?.displayName ?? 'Bạn',
            avatar: currentUser?.avatar ?? null,
          },
          content,
          mediaUrls,
          parentId: null,
          reactionsCount: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const patch = dispatch(
          newsfeedApi.util.updateQueryData(
            'getComments',
            { postId, limit: 5, cursor: null },
            (draft) => {
              draft.data.items.push(tempComment);
            },
          ),
        );

        const feedPatch = dispatch(
          newsfeedApi.util.updateQueryData('getFeed', undefined, (draft) => {
            draft.data.items = draft.data.items.map((item) =>
              item.postId === postId
                ? { ...item, commentsCount: (item.commentsCount ?? 0) + 1 }
                : item,
            );
          }),
        );

        try {
          const { data } = await queryFulfilled;
          if (data?.data) {
            dispatch(
              newsfeedApi.util.updateQueryData(
                'getComments',
                { postId, limit: 5, cursor: null },
                (draft) => {
                  const index = draft.data.items.findIndex((item) => item.commentId === tempId);
                  if (index >= 0) {
                    draft.data.items[index] = data.data;
                  }
                },
              ),
            );
          }
        } catch {
          patch.undo();
          feedPatch.undo();
        }
      },
    }),

    getCommentReplies: builder.query<
      ApiSuccessResponse<ICommentsPage>,
      { postId: string; commentId: string; cursor?: string | null }
    >({
      query: ({ postId, commentId, cursor }) => ({
        url: `/newsfeed/posts/${postId}/comments`,
        params: { parentId: commentId, limit: 5, cursor: cursor ?? undefined },
      }),
    }),

    reactToPost: builder.mutation<
      ApiSuccessResponse<IReactionSummary>,
      { postId: string; type: ReactionType }
    >({
      query: ({ postId, type }) => ({
        url: `/newsfeed/posts/${postId}/react`,
        method: 'POST',
        body: { type },
      }),
    }),

    reactToComment: builder.mutation<
      ApiSuccessResponse<IReactionSummary>,
      { postId: string; commentId: string; type: ReactionType }
    >({
      query: ({ postId, commentId, type }) => ({
        url: `/newsfeed/comments/${commentId}/react`,
        method: 'POST',
        body: { type, postId },
      }),
      async onQueryStarted({ postId, commentId, type }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          newsfeedApi.util.updateQueryData(
            'getComments',
            { postId, limit: 5, cursor: null },
            (draft) => {
              const comment = draft.data.items.find((c) => c.commentId === commentId);
              if (comment) {
                const oldType = comment.currentUserReaction;
                if (oldType === type) {
                  comment.currentUserReaction = null;
                  if (comment.reactionsCount[type] && comment.reactionsCount[type]! > 0) {
                    comment.reactionsCount[type]! -= 1;
                  }
                } else {
                  if (
                    oldType &&
                    comment.reactionsCount[oldType] &&
                    comment.reactionsCount[oldType]! > 0
                  ) {
                    comment.reactionsCount[oldType]! -= 1;
                  }
                  comment.currentUserReaction = type;
                  comment.reactionsCount[type] = (comment.reactionsCount[type] ?? 0) + 1;
                }
              }
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    reactToReel: builder.mutation<
      ApiSuccessResponse<IReactionSummary>,
      { reelId: string; type: ReactionType }
    >({
      query: ({ reelId, type }) => ({
        url: `/newsfeed/reels/${reelId}/react`,
        method: 'POST',
        body: { type },
      }),
      invalidatesTags: ['ReelsFeed', 'ReelDetail'],
    }),

    sharePost: builder.mutation<ApiSuccessResponse<IPost>, { postId: string } & SharePostBody>({
      query: ({ postId, ...body }) => ({
        url: `/newsfeed/posts/${postId}/share`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Feed'],
    }),

    toggleSavePost: builder.mutation<ApiSuccessResponse<{ isSaved: boolean }>, string>({
      query: (postId) => ({
        url: `/newsfeed/posts/${postId}/save`,
        method: 'POST',
      }),
      async onQueryStarted(postId, { dispatch, queryFulfilled }) {
        // Optimistic update: toggle isSaved trong feed cache
        const patch = dispatch(
          newsfeedApi.util.updateQueryData('getFeed', undefined, (draft) => {
            const post = draft.data.items.find((p) => p.postId === postId);
            if (post) post.isSaved = !post.isSaved;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    getSavedPosts: builder.query<ApiSuccessResponse<ISavedPostsPage>, FeedQueryParams | void>({
      query: (params) => ({
        url: '/newsfeed/feed/saved',
        params: {
          limit: params?.limit,
          cursor: params?.cursor ?? undefined,
        },
      }),
      providesTags: ['Feed'],
    }),

    // ─── Reels ──────────────────────────────────────────────────────────────

    getReelsFeed: builder.query<ApiSuccessResponse<IReelFeedPage>, ReelsFeedQueryParams | void>({
      query: (params) => ({
        url: '/newsfeed/reels',
        params: {
          feed: params?.feed ?? 'foryou',
          limit: params?.limit ?? 10,
          cursor: params?.cursor ?? undefined,
        },
      }),
      providesTags: ['ReelsFeed'],
    }),

    getReelById: builder.query<ApiSuccessResponse<IReel>, string>({
      query: (reelId) => `/newsfeed/reels/${reelId}`,
      providesTags: (_res, _err, reelId) => [{ type: 'ReelDetail', id: reelId }],
    }),

    getReelsByAuthor: builder.query<
      ApiSuccessResponse<IReelFeedPage>,
      { authorId: string; limit?: number; cursor?: string | null }
    >({
      query: ({ authorId, limit, cursor }) => ({
        url: `/newsfeed/reels/by-author/${authorId}`,
        params: { limit, cursor: cursor ?? undefined },
      }),
    }),

    createReel: builder.mutation<ApiSuccessResponse<IReel>, ICreateReelDto>({
      query: (body) => ({
        url: '/newsfeed/reels',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ReelsFeed'],
    }),

    deleteReel: builder.mutation<ApiSuccessResponse<null>, string>({
      query: (reelId) => ({
        url: `/newsfeed/reels/${reelId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, reelId) => ['ReelsFeed', { type: 'ReelDetail', id: reelId }],
    }),

    recordReelView: builder.mutation<
      ApiSuccessResponse<null>,
      { reelId: string; watchedMs: number; completed?: boolean }
    >({
      query: ({ reelId, ...body }) => ({
        url: `/newsfeed/reels/${reelId}/view`,
        method: 'POST',
        body,
      }),
    }),

    toggleSaveReel: builder.mutation<ApiSuccessResponse<{ isSaved: boolean }>, string>({
      query: (reelId) => ({
        url: `/newsfeed/reels/${reelId}/save`,
        method: 'POST',
      }),
      invalidatesTags: ['ReelsFeed', 'ReelDetail'],
    }),

    reportReel: builder.mutation<ApiSuccessResponse<null>, { reelId: string } & IReportReelDto>({
      query: ({ reelId, ...body }) => ({
        url: `/newsfeed/reels/${reelId}/report`,
        method: 'POST',
        body,
      }),
    }),

    getReelComments: builder.query<ApiSuccessResponse<ICommentsPage>, ReelCommentsQueryParams>({
      query: ({ reelId, limit, cursor }) => ({
        url: `/newsfeed/reels/${reelId}/comments`,
        params: { limit: limit ?? 20, cursor: cursor ?? undefined },
      }),
      providesTags: (_res, _err, arg) => [{ type: 'ReelComments', id: arg.reelId }],
    }),

    addReelComment: builder.mutation<
      ApiSuccessResponse<IComment>,
      { reelId: string; content: string; parentId?: string; mediaUrls?: string[] }
    >({
      query: ({ reelId, content, parentId, mediaUrls }) => ({
        url: `/newsfeed/reels/${reelId}/comments`,
        method: 'POST',
        body: { content, parentId, mediaUrls },
      }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'ReelComments', id: arg.reelId }],
    }),

    reactToReelComment: builder.mutation<
      ApiSuccessResponse<IReactionSummary>,
      { reelId: string; commentId: string; type: ReactionType }
    >({
      query: ({ reelId, commentId, type }) => ({
        url: `/newsfeed/reels/${reelId}/comments/${commentId}/react`,
        method: 'POST',
        body: { type },
      }),
      async onQueryStarted({ reelId, commentId, type }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          newsfeedApi.util.updateQueryData('getReelComments', { reelId, limit: 20 }, (draft) => {
            const comment = draft.data.items.find((c) => c.commentId === commentId);
            if (comment) {
              const oldType = comment.currentUserReaction;
              if (oldType === type) {
                comment.currentUserReaction = null;
                if (comment.reactionsCount[type] && comment.reactionsCount[type]! > 0) {
                  comment.reactionsCount[type]! -= 1;
                }
              } else {
                if (
                  oldType &&
                  comment.reactionsCount[oldType] &&
                  comment.reactionsCount[oldType]! > 0
                ) {
                  comment.reactionsCount[oldType]! -= 1;
                }
                comment.currentUserReaction = type;
                comment.reactionsCount[type] = (comment.reactionsCount[type] ?? 0) + 1;
              }
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    getReelCommentReplies: builder.query<
      ApiSuccessResponse<ICommentsPage>,
      { reelId: string; commentId: string; cursor?: string | null }
    >({
      query: ({ reelId, commentId, cursor }) => ({
        url: `/newsfeed/reels/${reelId}/comments`,
        params: { parentId: commentId, limit: 5, cursor: cursor ?? undefined },
      }),
    }),
  }),
});

export const {
  useGetFeedQuery,
  useLazyGetFeedQuery,
  useGetPostByIdQuery,
  useGetPostsByAuthorQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useGetCommentsQuery,
  useLazyGetCommentsQuery,
  useAddCommentMutation,
  useReactToPostMutation,
  useReactToCommentMutation,
  useReactToReelMutation,
  useGetCommentRepliesQuery,
  useLazyGetCommentRepliesQuery,
  useSharePostMutation,
  useToggleSavePostMutation,
  useGetSavedPostsQuery,
  // Reels
  useGetReelsFeedQuery,
  useLazyGetReelsFeedQuery,
  useGetReelByIdQuery,
  useGetReelsByAuthorQuery,
  useCreateReelMutation,
  useDeleteReelMutation,
  useRecordReelViewMutation,
  useToggleSaveReelMutation,
  useReportReelMutation,
  useGetReelCommentsQuery,
  useLazyGetReelCommentsQuery,
  useAddReelCommentMutation,
  useReactToReelCommentMutation,
  useLazyGetReelCommentRepliesQuery,
  useGetReelCommentRepliesQuery,
} = newsfeedApi;
