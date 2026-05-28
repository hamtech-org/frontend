import { createApi } from '@reduxjs/toolkit/query/react';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';

export type MediaUploadType = 'image' | 'video' | 'audio' | 'file';
export type MediaDeliveryScope = 'chat' | 'general';

export interface MediaUploadResult {
  mediaId: string;
  url: string;
  thumbnailUrl: string | null;
  visibility: 'public' | 'private';
  scope: MediaDeliveryScope;
  type: MediaUploadType;
  size: number;
  mimeType: string;
}

export const mediaApi = createApi({
  reducerPath: 'mediaApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Media'],
  endpoints: (builder) => ({
    uploadMedia: builder.mutation<
      ApiSuccessResponse<MediaUploadResult>,
      { file: File; mediaType: MediaUploadType; deliveryScope?: MediaDeliveryScope }
    >({
      query: ({ file, mediaType, deliveryScope = 'chat' }) => {
        const body = new FormData();
        body.append('mediaType', mediaType);
        body.append('deliveryScope', deliveryScope);
        body.append('file', file);
        return {
          url: '/media/upload',
          method: 'POST',
          body,
        };
      },
    }),

    /** Không gửi `mediaType`: backend tự nhận diện từng file (batch trộn loại). */
    uploadMediaMulti: builder.mutation<
      ApiSuccessResponse<MediaUploadResult[]>,
      { files: File[]; deliveryScope?: MediaDeliveryScope } | File[]
    >({
      query: (input) => {
        const files = Array.isArray(input) ? input : input.files;
        const deliveryScope = Array.isArray(input) ? 'chat' : (input.deliveryScope ?? 'chat');
        const body = new FormData();
        body.append('deliveryScope', deliveryScope);
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
