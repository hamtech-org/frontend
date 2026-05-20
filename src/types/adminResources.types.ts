export type ResourceSource = 'chat_direct' | 'chat_group' | 'post' | 'reel' | 'avatar' | 'other';

export type ResourceMediaType = 'image' | 'video' | 'audio' | 'file';

export interface IResourceBreakdownCell {
  source: ResourceSource;
  type: ResourceMediaType;
  bytes: number;
  count: number;
}

export interface IResourceBySourceRow {
  source: ResourceSource;
  bytes: number;
  count: number;
  percent: number;
}

export interface IResourceByTypeRow {
  type: ResourceMediaType;
  bytes: number;
  count: number;
  percent: number;
}

export interface IResourceTopUploader {
  userId: string;
  displayName: string;
  bytes: number;
  count: number;
}

export interface IAdminResourceSummary {
  totalBytes: number;
  totalFiles: number;
  computedAt: string;
  cachedUntil: string;
  matrix: IResourceBreakdownCell[];
  bySource: IResourceBySourceRow[];
  byType: IResourceByTypeRow[];
  topUploaders: IResourceTopUploader[];
}

export const RESOURCE_SOURCE_LABELS: Record<ResourceSource, string> = {
  chat_direct: 'Chat 1-1',
  chat_group: 'Chat nhóm',
  post: 'Bài viết',
  reel: 'Reels',
  avatar: 'Avatar',
  other: 'Khác',
};

export const RESOURCE_TYPE_LABELS: Record<ResourceMediaType, string> = {
  image: 'Hình ảnh',
  video: 'Video',
  audio: 'Âm thanh',
  file: 'Tệp khác',
};
