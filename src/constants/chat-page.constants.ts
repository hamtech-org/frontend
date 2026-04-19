import type { IMessage } from '@/types/chat.types';
import type { MediaUploadResult } from '@/store/api/mediaApi';

export const CHAT_NEAR_BOTTOM_PX = 80;
export const MAX_PENDING_FILES = 10;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export function roughMaxBytesForFile(file: File): number {
  if (file.type.startsWith('image/')) return MAX_IMAGE_BYTES;
  if (file.type.startsWith('video/')) return MAX_VIDEO_BYTES;
  return MAX_FILE_BYTES;
}

export function messageTypeFromUploadResult(r: MediaUploadResult): IMessage['type'] {
  if (r.type === 'image') return 'image';
  if (r.type === 'video') return 'video';
  return 'file';
}
