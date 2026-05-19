import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { store } from '@/store/store';
import { resetUpload } from '@/store/slices/reelUploadSlice';
import type { RootState } from '@/store/store';

export function ReelUploadToast() {
  const { status, progress, error } = useSelector((s: RootState) => s.reelUpload);

  useEffect(() => {
    if (status !== 'done') return;
    const t = setTimeout(() => store.dispatch(resetUpload()), 3000);
    return () => clearTimeout(t);
  }, [status]);

  if (status === 'idle') return null;

  const pct = Math.round(progress * 100);

  const barColor =
    status === 'uploading' ? 'bg-blue-500' : status === 'done' ? 'bg-green-500' : 'bg-red-500';

  const label =
    status === 'uploading'
      ? pct < 95
        ? `Đang tải reel lên... ${pct}%`
        : 'Đang xử lý reel...'
      : status === 'done'
        ? 'Reel đã được đăng!'
        : `Đăng thất bại: ${error ?? 'lỗi không xác định'}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 overflow-hidden rounded-xl border bg-card shadow-lg">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className={`h-1 transition-all duration-300 ${barColor}`}
          style={{ width: `${status === 'uploading' ? pct : 100}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`size-2 shrink-0 rounded-full ${barColor}`} />
        <p className="flex-1 text-sm font-medium text-foreground">{label}</p>
        {status !== 'uploading' && (
          <button
            onClick={() => store.dispatch(resetUpload())}
            className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
