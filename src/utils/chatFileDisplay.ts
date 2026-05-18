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

const EXT_TYPE_LABEL: Record<string, string> = {
  PDF: 'PDF',
  DOC: 'DOC',
  DOCX: 'DOCX',
  XLS: 'XLS',
  XLSX: 'XLSX',
  PPT: 'PPT',
  PPTX: 'PPTX',
  ZIP: 'ZIP',
  RAR: 'RAR',
  '7Z': '7Z',
  TXT: 'TXT',
  CSV: 'CSV',
  MP3: 'MP3',
  WAV: 'WAV',
  M4A: 'M4A',
};

function fileExtension(fileName: string): string {
  const base = fileName.trim();
  if (!base.includes('.')) return '';
  return (base.split('.').pop() ?? '').toUpperCase();
}

/** Nhãn loại file: PDF, XLSX, … — đồng bộ mobile `chatMediaDisplay.ts`. */
export function chatFileTypeLabel(fileName: string, mimeType?: string | null): string {
  const ext = fileExtension(fileName);
  if (ext && EXT_TYPE_LABEL[ext]) return EXT_TYPE_LABEL[ext];
  if (ext && ext.length <= 8) return ext;

  const m = (mimeType ?? '').toLowerCase();
  if (m.includes('pdf')) return 'PDF';
  if (m.includes('spreadsheet') || m.includes('excel') || m.includes('sheet')) return 'XLSX';
  if (m.includes('word') || m.includes('msword') || m.includes('document')) return 'DOC';
  if (m.includes('presentation') || m.includes('powerpoint')) return 'PPT';
  if (m.includes('zip') && !m.includes('gzip')) return 'ZIP';
  if (m.includes('rar')) return 'RAR';
  if (m.startsWith('audio/')) return 'MP3';
  return 'FILE';
}

/** Màu badge icon loại file (Zalo). */
export function chatFileTypeAccent(fileName: string, mimeType?: string | null): string {
  const label = chatFileTypeLabel(fileName, mimeType);
  if (label === 'PDF') return '#E53935';
  if (label === 'XLSX' || label === 'XLS' || label === 'CSV') return '#2E7D32';
  if (label === 'DOC' || label === 'DOCX') return '#1565C0';
  if (label === 'PPT' || label === 'PPTX') return '#E65100';
  if (label === 'ZIP' || label === 'RAR' || label === '7Z') return '#F9A825';
  if (label === 'MP3' || label === 'WAV' || label === 'M4A') return '#6A1B9A';
  return '#5C6BC0';
}

function inferFileNameFromMime(mime: string | null | undefined): string | null {
  if (!mime) return null;
  const m = mime.toLowerCase();
  if (m.includes('pdf')) return 'document.pdf';
  if (m.includes('spreadsheet') || m.includes('excel')) return 'spreadsheet.xlsx';
  if (m.includes('word')) return 'document.docx';
  if (m.includes('presentation') || m.includes('powerpoint')) return 'presentation.pptx';
  if (m.includes('zip')) return 'archive.zip';
  if (m.includes('rar')) return 'archive.rar';
  return null;
}

/** Tên file hiển thị cho ghim / bảng tin — ưu tiên `mediaOriginalName`, không dùng placeholder. */
export function pinnedChatFileDisplayName(
  msg: Pick<IMessage, 'type' | 'content' | 'mediaOriginalName' | 'mediaType'>,
): string {
  const server = msg.mediaOriginalName?.trim();
  if (server && server !== '[File]') return server;
  const content = (msg.content ?? '').trim();
  if (msg.type === 'file' && content && content !== '[File]' && !content.startsWith('{')) {
    return content;
  }
  const inferred = inferFileNameFromMime(msg.mediaType);
  if (inferred) {
    const base = inferred.split('/').pop() ?? inferred;
    return base;
  }
  return 'Tệp tin';
}
