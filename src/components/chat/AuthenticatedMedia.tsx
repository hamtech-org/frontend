import { useEffect, useState } from 'react';

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
 * Fetches private media with Bearer token then displays via blob URL (img/video).
 */
export function AuthenticatedMedia({
  src,
  alt = '',
  className,
  kind,
  videoAutoPlay = false,
}: AuthenticatedMediaProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const run = async () => {
      try {
        const fetchUrl = resolveChatMediaFetchUrl(src);
        if (!fetchUrl) throw new Error('empty');
        const token = localStorage.getItem('accessToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await fetch(fetchUrl, { headers, redirect: 'follow' });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setFailed(false);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setBlobUrl(null);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (failed) {
    return (
      <p className="text-xs opacity-80 italic px-1 py-2">
        Không tải được media (kiểm tra đăng nhập hoặc quyền).
      </p>
    );
  }

  if (!blobUrl) {
    return (
      <div
        className="rounded-lg min-h-32 max-w-full max-h-[min(75vh,32rem)] bg-zinc-200/50 dark:bg-zinc-600/35 animate-pulse"
        aria-hidden
      />
    );
  }

  if (kind === 'video') {
    return (
      <video
        src={blobUrl}
        controls
        className={className}
        playsInline
        preload="metadata"
        autoPlay={videoAutoPlay}
      />
    );
  }

  return <img src={blobUrl} alt={alt} className={className} loading="lazy" decoding="async" />;
}
