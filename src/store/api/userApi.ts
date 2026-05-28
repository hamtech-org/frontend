import { createApi } from '@reduxjs/toolkit/query/react';
import type { IUser, IUserPublic } from '@/types/user.types';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';
import { chatApi } from './chatApi';
import { setUser } from '@/store/slices/authSlice';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Friend'],
  endpoints: (builder) => ({
    getProfile: builder.query<ApiSuccessResponse<IUser>, void>({
      query: () => '/users/me',
      providesTags: ['User'],
    }),
    getUserById: builder.query<ApiSuccessResponse<IUserPublic>, string>({
      query: (userId) => `/users/${encodeURIComponent(userId)}`,
      providesTags: (_result, _error, userId) => [{ type: 'User', id: userId }],
    }),
    updateProfile: builder.mutation<ApiSuccessResponse<IUser>, FormData | Partial<IUser>>({
      query: (body) => {
        // If body is FormData, send it as-is; otherwise wrap in FormData
        let formData: FormData;
        if (body instanceof FormData) {
          formData = body;
        } else {
          formData = new FormData();
          if (typeof body === 'object' && body !== null) {
            Object.entries(body).forEach(([key, value]) => {
              if (value !== null && value !== undefined && value !== '') {
                formData.append(key, String(value));
              }
            });
          }
        }

        return {
          url: '/users/me',
          method: 'PUT',
          body: formData,
        };
      },
      invalidatesTags: ['User'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data: res } = await queryFulfilled;
          if (res?.data) {
            dispatch(setUser(res.data));
          }
          dispatch(chatApi.util.invalidateTags(['Conversations']));
        } catch {
          // no-op
        }
      },
    }),

    // Friend request endpoints
    sendFriendRequest: builder.mutation<ApiSuccessResponse<null>, { friendId: string }>({
      query: ({ friendId }) => ({
        url: `/users/friends/${friendId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Friend'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(chatApi.util.invalidateTags(['Conversations']));
        } catch {
          // no-op
        }
      },
    }),

    cancelFriendRequest: builder.mutation<ApiSuccessResponse<null>, { friendId: string }>({
      query: ({ friendId }) => ({
        url: `/users/friends/${friendId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['Friend'],
    }),

    acceptFriendRequest: builder.mutation<ApiSuccessResponse<null>, { senderId: string }>({
      query: ({ senderId }) => ({
        url: `/users/friends/${senderId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['Friend'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(chatApi.util.invalidateTags(['Conversations']));
        } catch {
          // no-op
        }
      },
    }),

    rejectFriendRequest: builder.mutation<ApiSuccessResponse<null>, { senderId: string }>({
      query: ({ senderId }) => ({
        url: `/users/friends/${senderId}/reject`,
        method: 'POST',
      }),
      invalidatesTags: ['Friend'],
    }),

    removeFriend: builder.mutation<ApiSuccessResponse<null>, { friendId: string }>({
      query: ({ friendId }) => ({
        url: `/users/friends/${friendId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Friend'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(chatApi.util.invalidateTags(['Conversations']));
        } catch {
          // no-op
        }
      },
    }),

    blockFriend: builder.mutation<ApiSuccessResponse<null>, { friendId: string }>({
      query: ({ friendId }) => ({
        url: `/users/friends/${friendId}/block`,
        method: 'POST',
      }),
      invalidatesTags: ['Friend'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(chatApi.util.invalidateTags(['Conversations']));
        } catch {
          // no-op
        }
      },
    }),

    unblockFriend: builder.mutation<ApiSuccessResponse<null>, { friendId: string }>({
      query: ({ friendId }) => ({
        url: `/users/friends/${friendId}/unblock`,
        method: 'POST',
      }),
      invalidatesTags: ['Friend'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(chatApi.util.invalidateTags(['Conversations']));
        } catch {
          // no-op
        }
      },
    }),

    getFriendRequestStatus: builder.query<
      ApiSuccessResponse<{
        status: 'friend' | 'pending_sent' | 'pending_received' | 'blocked' | 'none';
      }>,
      { userId: string }
    >({
      query: ({ userId }) => `/users/friends/${userId}/status`,
      providesTags: (_result, _error, { userId }) => [{ type: 'Friend', id: userId }],
    }),

    getFriends: builder.query<ApiSuccessResponse<IUser[]>, { limit?: number; offset?: number }>({
      query: ({ limit = 50, offset = 0 }) => `/users/friends?limit=${limit}&offset=${offset}`,
      providesTags: ['Friend'],
    }),

    getPendingRequests: builder.query<
      ApiSuccessResponse<{ received: IUser[]; sent: IUser[] }>,
      void
    >({
      query: () => '/users/friends/requests/pending',
      providesTags: ['Friend'],
    }),

    getSuggestedFriends: builder.query<ApiSuccessResponse<IUser[]>, { limit?: number }>({
      query: ({ limit = 10 }) => `/users/friends/suggestions?limit=${limit}`,
      providesTags: ['Friend'],
    }),

    // Batch fetch user public profile (displayName/avatar) by ids.
    // Used for rendering newsfeed posts efficiently.
    postMultipleUsers: builder.mutation<ApiSuccessResponse<IUser[]>, { userIds: string[] }>({
      query: ({ userIds }) => ({
        url: '/users/multiple',
        method: 'POST',
        body: { userIds },
      }),
    }),
  }),
});

export const {
  useGetProfileQuery,
  useGetUserByIdQuery,
  useUpdateProfileMutation,
  useSendFriendRequestMutation,
  useCancelFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
  useRemoveFriendMutation,
  useBlockFriendMutation,
  useUnblockFriendMutation,
  useGetFriendRequestStatusQuery,
  useGetFriendsQuery,
  useGetPendingRequestsQuery,
  useGetSuggestedFriendsQuery,
  usePostMultipleUsersMutation,
} = userApi;
