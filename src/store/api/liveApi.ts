import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';

export type LiveCategory = 'tech' | 'study' | 'entertainment' | 'sales' | 'chat' | 'other';
export type LiveCoverColor = 'blue' | 'green' | 'purple' | 'orange' | 'gray';

export const LIVE_CATEGORIES: { value: LiveCategory; label: string }[] = [
  { value: 'tech', label: 'Công nghệ' },
  { value: 'study', label: 'Học tập' },
  { value: 'entertainment', label: 'Giải trí' },
  { value: 'sales', label: 'Bán hàng' },
  { value: 'chat', label: 'Trò chuyện' },
  { value: 'other', label: 'Khác' },
];

export const LIVE_COVER_COLORS: Record<LiveCoverColor, string> = {
  blue: 'linear-gradient(135deg,#3b82f6,#1e3a8a)',
  green: 'linear-gradient(135deg,#10b981,#065f46)',
  purple: 'linear-gradient(135deg,#a855f7,#581c87)',
  orange: 'linear-gradient(135deg,#f59e0b,#7c2d12)',
  gray: 'linear-gradient(135deg,#475569,#1e293b)',
};

export function getLiveCategoryLabel(category: LiveCategory): string {
  return LIVE_CATEGORIES.find((c) => c.value === category)?.label ?? 'Khác';
}

export interface LiveSessionPublic {
  sessionId: string;
  channelName: string;
  title: string;
  hostUserId: string;
  status: 'live' | 'ended';
  startedAt: string;
  category: LiveCategory;
  coverImageUrl?: string;
  coverColor?: LiveCoverColor;
}

export interface LiveSessionListItem extends LiveSessionPublic {
  hostDisplayName: string;
  hostAvatar: string | null;
  viewerCount: number;
}

export interface CreateLiveSessionBody {
  title?: string;
  category?: LiveCategory;
  coverImageUrl?: string;
  coverColor?: LiveCoverColor;
}

export const liveApi = createApi({
  reducerPath: 'liveApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['LiveList', 'LiveSession'],
  endpoints: (builder) => ({
    listLiveSessions: builder.query<LiveSessionListItem[], void>({
      query: () => '/live/sessions',
      transformResponse: (res: ApiSuccessResponse<LiveSessionListItem[]>) => res.data,
      providesTags: ['LiveList'],
    }),

    getLiveSession: builder.query<LiveSessionPublic, string>({
      query: (sessionId) => `/live/sessions/${sessionId}`,
      transformResponse: (res: ApiSuccessResponse<LiveSessionPublic>) => res.data,
      providesTags: (_r, _e, sessionId) => [{ type: 'LiveSession', id: sessionId }],
    }),

    createLiveSession: builder.mutation<LiveSessionPublic, CreateLiveSessionBody | void>({
      query: (body) => ({
        url: '/live/sessions',
        method: 'POST',
        body: body && typeof body === 'object' ? body : {},
      }),
      transformResponse: (res: ApiSuccessResponse<LiveSessionPublic>) => res.data,
      invalidatesTags: ['LiveList'],
    }),

    patchLiveSession: builder.mutation<
      LiveSessionPublic,
      {
        sessionId: string;
        title?: string;
        category?: LiveCategory;
        coverImageUrl?: string;
        coverColor?: LiveCoverColor;
      }
    >({
      query: ({ sessionId, ...body }) => ({
        url: `/live/sessions/${sessionId}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (res: ApiSuccessResponse<LiveSessionPublic>) => res.data,
      invalidatesTags: (_r, _e, arg) => ['LiveList', { type: 'LiveSession', id: arg.sessionId }],
    }),

    endLiveSession: builder.mutation<void, { sessionId: string }>({
      query: ({ sessionId }) => ({
        url: `/live/sessions/${sessionId}/end`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, arg) => ['LiveList', { type: 'LiveSession', id: arg.sessionId }],
    }),
  }),
});

export const {
  useListLiveSessionsQuery,
  useGetLiveSessionQuery,
  useCreateLiveSessionMutation,
  usePatchLiveSessionMutation,
  useEndLiveSessionMutation,
} = liveApi;
