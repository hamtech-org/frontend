/**
 * Origin cho link mời nhóm (copy/chia sẻ).
 * - Dev (`npm run dev`): không set VITE_PUBLIC_WEB_ORIGIN → dùng window.location.origin (localhost:5173).
 * - Production (`npm run build`): .env.production → https://hamtech.app
 */
export function getPublicWebOrigin(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_WEB_ORIGIN as string | undefined)?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}
export function getJoinGroupUrl(suffix: string | undefined | null): string {
  const s = String(suffix ?? '')
    .trim()
    .toLowerCase();
  if (!s) return '';
  const origin = getPublicWebOrigin();
  if (!origin) return `/join/${s}`;
  return `${origin}/join/${s}`;
}
