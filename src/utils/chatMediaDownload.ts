const MEDIA_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function isCloudFrontSignedUrl(raw: string): boolean {
  const src = raw.trim();
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

export function sanitizeDownloadFilename(name: string): string {
  const cleaned = name.replace(/[^\w.\-() \u00C0-\u024F]+/g, '_').trim();
  return cleaned.slice(0, 200) || 'download';
}

export function parseMediaIdFromStoredUrl(urlStr: string): string | null {
  const trimmed = urlStr.trim();
  if (!trimmed) return null;
  if (/\/conversations\/[^/]+\/avatar/i.test(trimmed)) {
    return null;
  }
  try {
    const u = /^https?:\/\//i.test(trimmed)
      ? new URL(trimmed)
      : new URL(trimmed, window.location.origin);
    const path = u.pathname.replace(/\/+$/, '');
    const app = path.match(
      /\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(?:download|thumbnail)$/i,
    );
    if (app?.[1]) return app[1];
    const s3 = path.match(
      /\/(?:chat|public)\/[^/]+\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(?:original|thumb)\b/i,
    );
    if (s3?.[1]) return s3[1];
    const loose = trimmed.match(MEDIA_UUID);
    return loose?.[0] ?? null;
  } catch {
    const loose = trimmed.match(MEDIA_UUID);
    return loose?.[0] ?? null;
  }
}

function buildClientMediaApiUrl(mediaId: string, endpoint: 'download' | 'thumbnail'): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api/v1';
  const base = raw.replace(/\/+$/, '');
  const suffix = `/media/${mediaId}/${endpoint}`;
  if (/^https?:\/\//i.test(base)) {
    return `${base}${suffix}`;
  }
  const prefix = base.startsWith('/') ? base : `/${base}`;
  return `${window.location.origin}${prefix}${suffix}`;
}

export function buildClientMediaDownloadUrl(mediaId: string): string {
  return buildClientMediaApiUrl(mediaId, 'download');
}

export function buildClientMediaThumbnailUrl(mediaId: string): string {
  return buildClientMediaApiUrl(mediaId, 'thumbnail');
}

function isThumbnailStoredUrl(urlStr: string): boolean {
  const trimmed = urlStr.trim();
  if (!trimmed) return false;
  try {
    const u = /^https?:\/\//i.test(trimmed)
      ? new URL(trimmed)
      : new URL(trimmed, window.location.origin);
    const path = u.pathname.replace(/\/+$/, '');
    if (/\/media\/[0-9a-f-]{36}\/thumbnail$/i.test(path)) return true;
    return /\/(?:chat|public)\/[^/]+\/[0-9a-f-]{36}\/thumb\b/i.test(path);
  } catch {
    return /\/thumb\b/i.test(trimmed);
  }
}

/**
 * URL ổn định để hiển thị ảnh/video — server redirect sang CDN ký mới (không dùng URL hết hạn trong DB).
 */
export function resolveChatMediaFetchUrl(storedUrl: string): string {
  const trimmed = storedUrl.trim();
  if (!trimmed) return '';
  const mediaId = parseMediaIdFromStoredUrl(trimmed);
  if (mediaId) {
    return isThumbnailStoredUrl(trimmed)
      ? buildClientMediaThumbnailUrl(mediaId)
      : buildClientMediaDownloadUrl(mediaId);
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = window.location.origin;
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

/** URL tải file — server stream kèm Content-Disposition đúng tên. */
export function buildClientMediaAttachmentUrl(mediaId: string, filename?: string): string {
  const base = buildClientMediaDownloadUrl(mediaId);
  const params = new URLSearchParams({ attachment: '1' });
  const safe = filename?.trim();
  if (safe) params.set('filename', safe);
  return `${base}?${params.toString()}`;
}

export function resolveChatMediaDownloadUrl(storedUrl: string): string {
  const trimmed = storedUrl.trim();
  if (!trimmed) return '';
  const mediaId = parseMediaIdFromStoredUrl(trimmed);
  if (mediaId) return buildClientMediaDownloadUrl(mediaId);
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = window.location.origin;
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export function resolveChatMediaAttachmentUrl(storedUrl: string, filename?: string): string {
  const trimmed = storedUrl.trim();
  if (!trimmed) return '';
  const safeName = filename?.trim() ? sanitizeDownloadFilename(filename) : undefined;
  const mediaId = parseMediaIdFromStoredUrl(trimmed);
  if (mediaId) return buildClientMediaAttachmentUrl(mediaId, safeName);
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = window.location.origin;
  const absolute = trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
  return absolute;
}

function triggerBrowserDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Tải blob media (copy ảnh, xử lý clipboard) — ưu tiên `?attachment=1` để tránh CORS sau redirect CDN. */
export async function fetchChatMediaBlob(storedUrl: string): Promise<Blob> {
  const trimmed = storedUrl.trim();
  if (!trimmed) throw new Error('empty url');

  const mediaId = parseMediaIdFromStoredUrl(trimmed);
  const url = mediaId
    ? buildClientMediaAttachmentUrl(mediaId)
    : isCloudFrontSignedUrl(trimmed)
      ? trimmed
      : resolveChatMediaFetchUrl(trimmed);
  if (!url) throw new Error('empty url');

  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> =
    mediaId || !isCloudFrontSignedUrl(url)
      ? token
        ? { Authorization: `Bearer ${token}` }
        : {}
      : {};

  const res = await fetch(url, { headers, redirect: 'follow' });
  if (!res.ok) throw new Error(String(res.status));
  const blob = await res.blob();
  if (!blob.size) throw new Error('empty blob');
  return blob;
}

async function downloadViaFetchBlob(url: string, filename: string): Promise<boolean> {
  let blob: Blob;
  try {
    blob = await fetchChatMediaBlob(url);
  } catch {
    return false;
  }
  if (!blob.size) return false;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
  return true;
}

export async function downloadAuthedChatMedia(
  storedUrl: string,
  filename: string,
): Promise<boolean> {
  try {
    const safeName = sanitizeDownloadFilename(filename);
    const mediaId = parseMediaIdFromStoredUrl(storedUrl);
    const url = mediaId
      ? buildClientMediaAttachmentUrl(mediaId, safeName)
      : resolveChatMediaAttachmentUrl(storedUrl, safeName);
    if (!url) return false;

    const viaBlob = await downloadViaFetchBlob(url, safeName);
    if (viaBlob) return true;

    triggerBrowserDownload(url, safeName);
    return true;
  } catch {
    return false;
  }
}
