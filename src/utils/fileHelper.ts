const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const isImage = (mimeType: string): boolean => IMAGE_TYPES.includes(mimeType);
export const isVideo = (mimeType: string): boolean => VIDEO_TYPES.includes(mimeType);

export const validateFileSize = (file: File): boolean => {
  if (isImage(file.type)) return file.size <= MAX_IMAGE_SIZE;
  if (isVideo(file.type)) return file.size <= MAX_VIDEO_SIZE;
  return file.size <= MAX_FILE_SIZE;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
