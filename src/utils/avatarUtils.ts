import type { CSSProperties } from 'react';

/** Chữ viết tắt trên avatar kiểu Zalo: 2 ký tự, tên nhiều từ lấy đầu từ đầu + đầu từ cuối. */
export function zaloInitials(
  name: string | undefined | null,
  userId: string | undefined | null,
): string {
  const raw = (name || '').trim();
  const uid = userId || '';
  if (!raw) return (uid.slice(0, 2) || '?').toUpperCase();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? '';
    const b = parts[parts.length - 1][0] ?? '';
    return `${a}${b}`.toUpperCase().slice(0, 2);
  }
  const chars = Array.from(raw);
  if (chars.length >= 2) return `${chars[0]}${chars[1]}`.toUpperCase();
  return (chars[0] ?? '?').toUpperCase();
}

function hueFromSeed(seed: string | undefined | null): number {
  if (!seed) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = seed.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h) % 360;
}

export function zaloAvatarSurfaceStyle(userId: string | undefined | null): CSSProperties {
  const h = hueFromSeed(userId);
  return { backgroundColor: `hsl(${h} 52% 46%)` };
}
