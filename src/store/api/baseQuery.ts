import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryApi,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';
import type { IAuthTokens } from '@/types/auth.types';
import { sessionTokensRefreshed } from '@/store/authSession.actions';

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

/** Một lần refresh cho mọi request 401 đồng thời (tránh đua rotation refresh trên server). */
let refreshPromise: Promise<boolean> | null = null;

/** RTK `fetchBaseQuery` khai báo tham số thứ 3 là `{}`; chuẩn hóa từ `unknown` không dùng kiểu `{}`. */
function toFetchExtraOptions(extra: unknown): Record<string, unknown> {
  if (extra !== null && typeof extra === 'object' && !Array.isArray(extra)) {
    return { ...(extra as Record<string, unknown>) };
  }
  return {};
}

async function runRefreshOnce(api: BaseQueryApi, extraOptions: unknown): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  const refreshResult = await baseQuery(
    {
      url: '/auth/refresh-token',
      method: 'POST',
      body: { refreshToken },
    },
    api,
    toFetchExtraOptions(extraOptions),
  );

  if (refreshResult.error || !refreshResult.data) return false;

  const body = refreshResult.data as ApiSuccessResponse<IAuthTokens>;
  const { accessToken, refreshToken: newRefresh } = body.data;
  if (!accessToken || !newRefresh) return false;

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefresh);
  api.dispatch(sessionTokensRefreshed({ accessToken, refreshToken: newRefresh }));
  return true;
}

function awaitSharedRefresh(api: BaseQueryApi, extraOptions: unknown): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = runRefreshOnce(api, extraOptions).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Enhanced base query with token refresh capability
 * Automatically refreshes access token when it expires (401 error)
 */
export const baseQueryWithReauth: BaseQueryFn<
  FetchArgs | string,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  const isAuthEndpoint =
    typeof args === 'string' ? args.includes('/auth/') : args.url.includes('/auth/');

  if (result.error?.status === 401 && !isAuthEndpoint) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshed = await awaitSharedRefresh(api, extraOptions);
        if (refreshed) {
          result = await baseQuery(args, api, extraOptions);
        }
      } catch (err) {
        console.error('❌ Token refresh failed:', err);
      }
    }

    if (result.error?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  return result;
};
