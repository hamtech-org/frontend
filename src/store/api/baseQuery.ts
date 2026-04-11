import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const baseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * Enhanced base query with token refresh capability
 * Automatically refreshes access token when it expires (401 error)
 */
export const baseQueryWithReauth: BaseQueryFn<FetchArgs | string, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await baseQuery(args, api, extraOptions);

  // If 401 Unauthorized, try to refresh token
  if (result.error?.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        // Attempt to refresh token
        const refreshResult = await baseQuery(
          {
            url: '/auth/refresh-token',
            method: 'POST',
            body: { refreshToken },
          },
          api,
          extraOptions,
        );

        if (refreshResult.data) {
          const newAccessToken = (refreshResult.data as ApiSuccessResponse<{ accessToken: string }>)
            .data?.accessToken;

          if (newAccessToken) {
            // Update token in localStorage
            localStorage.setItem('accessToken', newAccessToken);

            // Retry original request with new token
            result = await baseQuery(args, api, extraOptions);
          }
        }
      } catch (err) {
        console.error('❌ Token refresh failed:', err);
      }
    }

    // If refresh failed or no refresh token, clear auth and redirect
    if (result.error?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }

  return result;
};
