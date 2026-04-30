import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';
import type {
  IComment,
  IFeedPage,
  IPost,
  PostPublicationStatus,
  PostVisibility,
} from '@/types/newsfeed.types';

export interface CreatePostBody {
  content: string;
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

export const newsfeedApi = createApi({
  reducerPath: 'newsfeedApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Feed', 'Posts', 'PostDetail', 'Comments'],
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

    getComments: builder.query<ApiSuccessResponse<IComment[]>, string>({
      query: (postId) => `/newsfeed/posts/${postId}/comments`,
      providesTags: (_res, _err, postId) => [{ type: 'Comments', id: postId }],
    }),

    addComment: builder.mutation<
      ApiSuccessResponse<IComment>,
      { postId: string; content: string; parentId?: string }
    >({
      query: ({ postId, content, parentId }) => ({
        url: `/newsfeed/posts/${postId}/comments`,
        method: 'POST',
        body: { content, parentId },
      }),
      invalidatesTags: (_res, _err, arg) => [{ type: 'Comments', id: arg.postId }],
    }),

    reactToPost: builder.mutation<ApiSuccessResponse<null>, { postId: string; type: string }>({
      query: ({ postId, type }) => ({
        url: `/newsfeed/posts/${postId}/react`,
        method: 'POST',
        body: { type },
      }),
      invalidatesTags: ['Posts'],
    }),
  }),
});

export const {
  useGetFeedQuery,
  useLazyGetFeedQuery,
  useGetPostByIdQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useGetCommentsQuery,
  useAddCommentMutation,
  useReactToPostMutation,
} = newsfeedApi;
