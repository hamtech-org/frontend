import { useEffect, useState } from 'react';

type AuthenticatedMediaProps = {
  /** Absolute URL (e.g. /api/v1/media/:id/download on same origin or full API URL). */
  src: string;
  alt?: string;
  className?: string;
  kind: 'image' | 'video';
  /** Chỉ áp dụng khi kind="video" (ví dụ lightbox). */
  videoAutoPlay?: boolean;
};

function isCloudFrontSignedUrl(raw: string): boolean {
  const src = (raw ?? '').trim();
  if (!src) return false;
  try {
    const u = new URL(src, window.location.origin);
    const host = u.hostname.toLowerCase();
    if (!host.endsWith('cloudfront.net')) return false;
    return (
      u.searchParams.has('Signature') &&
      u.searchParams.has('Key-Pair-Id') &&
      (u.searchParams.has('Expires') || u.searchParams.has('Policy'))
    );
  } catch {
    return false;
  }
}

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
        const token = localStorage.getItem('accessToken');
        const isSignedCdn = isCloudFrontSignedUrl(src);
        const headers = !isSignedCdn && token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await fetch(src, { headers });
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
