import type { IMessage } from '@/types/chat.types';

function imageDisplaySrc(msg: IMessage): string {
  const full = msg.mediaUrl ?? '';
  const thumb = msg.thumbnailUrl ?? '';
  const mime = (msg.mediaType ?? '').toLowerCase();
  if (mime.includes('heic') || mime.includes('heif')) {
    return thumb || full;
  }
  return full || thumb;
}

/** Preview thumbnail cho tin file (Zalo). */
export function chatFilePreviewUrl(msg: IMessage): string | null {
  const thumb = (msg.thumbnailUrl ?? '').trim();
  if (thumb) return thumb;
  const mime = (msg.mediaType ?? '').toLowerCase();
  if (mime.startsWith('image/')) {
    const src = imageDisplaySrc(msg);
    return src || null;
  }
  return null;
}

export function chatFileTypeLabel(fileName: string, mimeType?: string | null): string {
  const ext = fileName.includes('.') ? (fileName.split('.').pop() ?? '').toUpperCase() : '';
  if (ext && ext.length <= 8) return ext;
  const m = (mimeType ?? '').toLowerCase();
  if (m.includes('pdf')) return 'PDF';
  if (m.includes('spreadsheet') || m.includes('excel')) return 'XLSX';
  if (m.includes('word')) return 'DOC';
  if (m.includes('zip')) return 'ZIP';
  return 'FILE';
}

export function chatFileTypeAccent(fileName: string, mimeType?: string | null): string {
  const label = chatFileTypeLabel(fileName, mimeType);
  if (label === 'PDF') return '#E53935';
  if (label === 'XLSX' || label === 'XLS') return '#2E7D32';
  if (label === 'DOC' || label === 'DOCX') return '#1565C0';
  if (label === 'ZIP' || label === 'RAR') return '#F9A825';
  return '#5C6BC0';
}
