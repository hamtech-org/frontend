import type { LiveCoverColor } from '@/store/api/liveApi';
import { LIVE_COVER_COLORS } from '@/store/api/liveApi';
import { zaloAvatarSurfaceStyle } from '@/utils/avatarUtils';

export function formatLiveDuration(startedAt: string): string {
  const ms = Math.max(0, Date.now() - new Date(startedAt).getTime());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function resolveLiveCoverBackground(opts: {
  coverImageUrl?: string;
  coverColor?: LiveCoverColor;
  hostUserId: string;
}): { type: 'image'; url: string } | { type: 'gradient'; background: string } {
  if (opts.coverImageUrl) {
    return { type: 'image', url: opts.coverImageUrl };
  }
  if (opts.coverColor && LIVE_COVER_COLORS[opts.coverColor]) {
    return { type: 'gradient', background: LIVE_COVER_COLORS[opts.coverColor] };
  }
  const fallback = zaloAvatarSurfaceStyle(opts.hostUserId);
  return {
    type: 'gradient',
    background: fallback.backgroundColor
      ? `linear-gradient(135deg, ${String(fallback.backgroundColor)}, #1e293b)`
      : LIVE_COVER_COLORS.gray,
  };
}
