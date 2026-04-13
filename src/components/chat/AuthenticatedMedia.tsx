import { useEffect, useState } from 'react';

type AuthenticatedMediaProps = {
  /** Absolute URL (e.g. /api/v1/media/:id/download on same origin or full API URL). */
  src: string;
  alt?: string;
  className?: string;
  kind: 'image' | 'video';
};

/**
 * Fetches private media with Bearer token then displays via blob URL (img/video).
 */
export function AuthenticatedMedia({ src, alt = '', className, kind }: AuthenticatedMediaProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const run = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(src, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
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
    return <div className="rounded-lg h-40 max-w-full bg-black/10 dark:bg-white/10 animate-pulse" aria-hidden />;
  }

  if (kind === 'video') {
    return <video src={blobUrl} controls className={className} playsInline />;
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}
