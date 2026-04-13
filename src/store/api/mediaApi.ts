import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';

export type MediaUploadType = 'image' | 'video' | 'audio' | 'file';

export interface MediaUploadResult {
  mediaId: string;
  url: string;
  thumbnailUrl: string | null;
  type: MediaUploadType;
  size: number;
  mimeType: string;
}

export const mediaApi = createApi({
  reducerPath: 'mediaApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Media'],
  endpoints: (builder) => ({
    uploadMedia: builder.mutation<ApiSuccessResponse<MediaUploadResult>, { file: File; mediaType: MediaUploadType }>({
      query: ({ file, mediaType }) => {
        const body = new FormData();
        body.append('file', file);
        body.append('mediaType', mediaType);
        return {
          url: '/media/upload',
          method: 'POST',
          body,
        };
      },
    }),

    /** Không gửi `mediaType`: backend tự nhận diện từng file (batch trộn loại). */
    uploadMediaMulti: builder.mutation<ApiSuccessResponse<MediaUploadResult[]>, File[]>({
      query: (files) => {
        const body = new FormData();
        for (const f of files) {
          body.append('files', f);
        }
        return {
          url: '/media/upload/multi',
          method: 'POST',
          body,
        };
      },
    }),
  }),
});

export const { useUploadMediaMutation, useUploadMediaMultiMutation } = mediaApi;
