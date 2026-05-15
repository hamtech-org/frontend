/**
 * Cùng quy ước với backend `buildMediaDownloadUrl` — endpoint redirect sang CDN (URL không hết hạn).
 * Luôn trả URL tuyệt đối để vượt `z.string().url()` khi gọi API cập nhật nhóm.
 */
export function buildClientMediaDownloadUrl(mediaId: string): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api/v1';
  const base = raw.replace(/\/+$/, '');
  const suffix = `/media/${mediaId}/download`;
  if (/^https?:\/\//i.test(base)) {
    return `${base}${suffix}`;
  }
  const prefix = base.startsWith('/') ? base : `/${base}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${prefix}${suffix}`;
}
