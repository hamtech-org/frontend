import { createApi } from '@reduxjs/toolkit/query/react';
import type { IUser } from '@/types/user.types';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Friend'],
  endpoints: (builder) => ({
    getProfile: builder.query<ApiSuccessResponse<IUser>, void>({
      query: () => '/users/me',
      providesTags: ['User'],
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
    }),

    // Friend request endpoints
    sendFriendRequest: builder.mutation<ApiSuccessResponse<null>, { friendId: string }>({
      query: ({ friendId }) => ({
        url: `/users/friends/${friendId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Friend'],
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
    }),

    getFriends: builder.query<ApiSuccessResponse<IUser[]>, { limit?: number; offset?: number }>({
      query: ({ limit = 50, offset = 0 }) => 
        `/users/friends?limit=${limit}&offset=${offset}`,
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
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useSendFriendRequestMutation,
  useCancelFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
  useRemoveFriendMutation,
  useGetFriendsQuery,
  useGetPendingRequestsQuery,
  useGetSuggestedFriendsQuery,
} = userApi;
