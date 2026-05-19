import { useEffect, useMemo, useState } from 'react';

import { resolveChatMediaFetchUrl } from '@/utils/chatMediaDownload';

type AuthenticatedMediaProps = {
  /** URL lưu trong tin nhắn (CDN ký, S3 path, hoặc `/api/v1/media/:id/download`). */
  src: string;
  alt?: string;
  className?: string;
  kind: 'image' | 'video';
  /** Chỉ áp dụng khi kind="video" (ví dụ lightbox). */
  videoAutoPlay?: boolean;
};

/**
 * Hiển thị media chat qua URL API `/media/:id/download` (redirect CDN).
 * Trình duyệt tự follow redirect — không dùng fetch+blob (tránh lỗi CORS sau 302).
 */
export function AuthenticatedMedia({
  src,
  alt = '',
  className,
  kind,
  videoAutoPlay = false,
}: AuthenticatedMediaProps) {
  const displayUrl = useMemo(() => resolveChatMediaFetchUrl(src), [src]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(!displayUrl);
  }, [displayUrl]);

  if (!displayUrl || failed) {
    return (
      <p className="text-xs opacity-80 italic px-1 py-2">
        Không tải được media (kiểm tra đăng nhập hoặc quyền).
      </p>
    );
  }

  const skeleton = !loaded ? (
    <div
      className="absolute inset-0 rounded-lg bg-zinc-200/50 dark:bg-zinc-600/35 animate-pulse"
      aria-hidden
    />
  ) : null;

  if (kind === 'video') {
    return (
      <div className="relative min-h-8">
        {skeleton}
        <video
          src={displayUrl}
          controls
          className={className}
          playsInline
          preload="metadata"
          autoPlay={videoAutoPlay}
          onLoadedData={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-8">
      {skeleton}
      <img
        src={displayUrl}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
