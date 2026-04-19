import type { IConversation, IMessage, MessageType, TypingUserEntry } from '@/types/chat.types';

export function decodeJwtUserId(token: string | null): string | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part)) as { userId?: string; sub?: string };
    return payload.userId ?? payload.sub ?? null;
  } catch {
    return null;
  }
}

export function typingLabel(entry: TypingUserEntry): string {
  return entry.displayName.trim() || entry.userId;
}

export function typingInitial(entry: TypingUserEntry): string {
  const ch = typingLabel(entry).trim().slice(0, 1).toUpperCase();
  return ch || '?';
}

/** Tin hệ thống / thông báo nhóm (dòng giữa) — không đưa vào tìm kiếm trong trò chuyện. */
export function isSystemChatNotificationMessage(msg: IMessage): boolean {
  if ((msg as { type?: string }).type === 'system') return true;
  if ((msg as { position?: string }).position === 'center') return true;
  return false;
}

/** Dòng `content` hiển thị trên sidebar / lastMessage (tin đầy đủ từ socket hoặc API). */
export function lastMessagePreviewContentFromMessage(msg: Pick<IMessage, 'content' | 'type' | 'isRecalled' | 'isDeleted' | 'mediaOriginalName'>): string {
  if (msg.isRecalled) return 'Tin nhắn đã được thu hồi';
  if (msg.isDeleted) return 'Tin nhắn đã xóa';
  const c = (msg.content ?? '').trim();
  if (c !== '') return msg.content ?? '';
  if (msg.type === 'image') return 'Hình ảnh';
  if (msg.type === 'video') return 'Video';
  if (msg.type === 'file') return msg.mediaOriginalName?.trim() || 'Tệp tin';
  return msg.content ?? '';
}

/** Danh sách hội thoại: sắp theo `lastMessage.createdAt` giảm dần (mới nhất trước). */
export function sortConversationsByLastMessage(convs: IConversation[]): IConversation[] {
  return [...convs].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

/** Bỏ dạng [Ảnh]/[Video]/[File] từ backend — hiển thị text thuần cho sidebar. */
function normalizeLastMessagePreview(type: MessageType, content: string): string {
  const t = (content ?? '').trim();
  if (type === 'image') {
    if (t === '' || t === '[Ảnh]' || t === '[ ]') return 'Hình ảnh';
    return t;
  }
  if (type === 'video') {
    if (t === '' || t === '[Video]') return 'Video';
    return t;
  }
  if (type === 'file') {
    if (t === '' || t === '[File]') return 'Tệp tin';
    return t;
  }
  return content ?? '';
}

/**
 * Một dòng preview cho thanh "Tin nhắn được ghim" (Zalo): ảnh/video/file/cuộc gọi, không dùng [].
 */
/** URL ảnh/video nhỏ cho hàng trong danh sách ghim (Zalo). */
export function mediaThumbSrcForPinnedRow(msg: IMessage): string | null {
  if (msg.type === 'image') {
    const full = msg.mediaUrl ?? '';
    const thumb = msg.thumbnailUrl ?? '';
    const mime = (msg.mediaType ?? '').toLowerCase();
    if (!full && !thumb) return null;
    if (mime.includes('heic') || mime.includes('heif')) return thumb || full || null;
    return thumb || full || null;
  }
  if (msg.type === 'video') {
    return msg.thumbnailUrl ?? msg.mediaUrl ?? null;
  }
  return null;
}

export function extractFirstHttpUrl(content: string): string | null {
  const m = (content ?? '').trim().match(/https?:\/\/[^\s<]+/);
  return m ? m[0] : null;
}

export function formatPinnedMessagePreviewLine(msg: IMessage): string {
  if (msg.isRecalled) return 'Tin nhắn đã được thu hồi';
  if (msg.isDeleted) return 'Tin nhắn đã xóa';
  if (msg.type === 'call') {
    const content = msg.content ?? '';
    try {
      const payload = JSON.parse(content) as { kind?: string; callType?: string };
      if (payload.kind === 'missed') return 'Cuộc gọi nhỡ';
      if (payload.kind === 'rejected') return 'Cuộc gọi bị từ chối';
      return payload.callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại';
    } catch {
      return 'Cuộc gọi';
    }
  }
  if ((msg as { type?: string }).type === 'system') {
    return 'Thông báo';
  }
  if (msg.type === 'poll') return 'Bình chọn';
  if (msg.type === 'sticker' || msg.type === 'emoji') return 'Nhãn dán';
  if (msg.type === 'location') return 'Vị trí';
  if (msg.type === 'schedule') return 'Lịch hẹn';
  return normalizeLastMessagePreview(msg.type, msg.content ?? '');
}

/** Dòng preview tin cuối trên danh sách hội thoại (direct / group, Bạn vs tên). */
export function formatConversationListLastPreview(conv: IConversation, currentUserId: string): string {
  const lm = conv.lastMessage;
  if (!lm) return 'Chưa có tin nhắn';
  const content = lm.content ?? '';
  const formatCallPreview = (): string => {
    try {
      const payload = JSON.parse(content) as { kind?: string; callType?: string };
      const kind = payload.kind;
      const callType = payload.callType;
      if (kind === 'missed') return 'Cuộc gọi nhỡ';
      if (kind === 'rejected') return 'Cuộc gọi bị từ chối';
      if (callType === 'video') return 'Cuộc gọi video';
      return 'Cuộc gọi thoại';
    } catch {
      return 'Cuộc gọi';
    }
  };

  const formatSystemPreview = (): string | null => {
    if (lm.type !== ('system' as any)) return null;
    if (typeof content !== 'string') return null;
    const raw = content.trim();
    if (!raw.startsWith('{')) return null;
    try {
      const obj = JSON.parse(raw) as any;
      const kind = String(obj?.kind ?? '');
      const actorId = String(obj?.actor?.userId ?? lm.senderId ?? '');
      const actorName = String(obj?.actor?.name ?? lm.senderDisplayName ?? 'Ai đó').trim() || 'Ai đó';
      const who = currentUserId && actorId && actorId === currentUserId ? 'Bạn' : actorName;

      if (kind === 'task_joined') {
        const title = String(obj?.task?.title ?? '').trim();
        return title ? `${who} đã tham gia công việc "${title}"` : `${who} đã tham gia công việc`;
      }
      if (kind === 'task_assigned') {
        const title = String(obj?.task?.title ?? '').trim();
        return title ? `${who} đã giao việc "${title}"` : `${who} đã giao việc`;
      }
      if (kind === 'poll_created') {
        const question = String(obj?.poll?.question ?? '').trim();
        return question ? `${who} đã tạo một bình chọn: ${question}` : `${who} đã tạo một bình chọn`;
      }
      if (kind === 'poll_voted') {
        const optionText = String(obj?.poll?.optionText ?? '').trim();
        return optionText ? `${who} đã bình chọn: ${optionText}` : `${who} đã bình chọn`;
      }
      if (kind === 'poll_vote_changed') {
        const optionText = String(obj?.poll?.optionText ?? '').trim();
        return optionText ? `${who} đã thay đổi bình chọn: ${optionText}` : `${who} đã thay đổi bình chọn`;
      }
      if (kind === 'poll_unvoted') {
        const optionText = String(obj?.poll?.optionText ?? '').trim();
        return optionText ? `${who} đã rút phiếu: ${optionText}` : `${who} đã rút phiếu`;
      }
      if (kind === 'poll_option_added') {
        const optionText = String(obj?.poll?.optionText ?? '').trim();
        return optionText ? `${who} đã thêm lựa chọn: ${optionText}` : `${who} đã thêm lựa chọn`;
      }
      if (kind === 'poll_closed') {
        const question = String(obj?.poll?.question ?? '').trim();
        return question ? `${who} đã đóng bình chọn: ${question}` : `${who} đã đóng bình chọn`;
      }
      return null;
    } catch {
      return null;
    }
  };

  const systemPreview = formatSystemPreview();
  // Với system message dạng sự kiện (giống Zalo), trả về câu hoàn chỉnh, không prefix "Tên:"
  if (systemPreview) return systemPreview;

  const previewText = normalizeLastMessagePreview(
    lm.type,
    lm.type === 'call' ? formatCallPreview() : content,
  );
  if (currentUserId && lm.senderId === currentUserId) {
    return `Bạn: ${previewText}`;
  }
  if (conv.type === 'direct') {
    return previewText;
  }
  const name = lm.senderDisplayName?.trim() || 'Thành viên';
  return `${name}: ${previewText}`;
}

const IMAGE_PLACEHOLDER_LABEL = 'Hình ảnh';

function isImagePlaceholderText(s: string): boolean {
  const t = s.trim();
  return t === 'Ảnh' || t === IMAGE_PLACEHOLDER_LABEL;
}

/**
 * Tách prefix ("Bạn:", "Tên:") và phần sau icon.
 * Tin chỉ media (không chú thích): suffix là nhãn hiển thị — ví dụ "Hình ảnh" sau icon.
 */
export function parseConversationListMediaPreview(
  full: string,
  type: MessageType | undefined,
): { prefix: string; suffix: string } {
  const isMedia = type === 'image' || type === 'video' || type === 'file';
  if (!isMedia) return { prefix: '', suffix: full };

  const videoLabel = 'Video';
  const fileLabel = 'Tệp tin';

  const mBan = /^Bạn:\s*(.*)$/s.exec(full);
  if (mBan) {
    const rest = mBan[1].trim();
    if (type === 'image' && isImagePlaceholderText(rest)) {
      return { prefix: 'Bạn:', suffix: IMAGE_PLACEHOLDER_LABEL };
    }
    if (type === 'video' && rest === videoLabel) return { prefix: 'Bạn:', suffix: videoLabel };
    if (type === 'file' && rest === fileLabel) return { prefix: 'Bạn:', suffix: fileLabel };
    return { prefix: 'Bạn:', suffix: rest };
  }

  const mNamed = /^(.+):\s*(.*)$/s.exec(full);
  if (mNamed) {
    const rest = mNamed[2].trim();
    if (type === 'image' && isImagePlaceholderText(rest)) {
      return { prefix: `${mNamed[1]}:`, suffix: IMAGE_PLACEHOLDER_LABEL };
    }
    if (type === 'video' && rest === videoLabel) {
      return { prefix: `${mNamed[1]}:`, suffix: videoLabel };
    }
    if (type === 'file' && rest === fileLabel) {
      return { prefix: `${mNamed[1]}:`, suffix: fileLabel };
    }
    return { prefix: `${mNamed[1]}:`, suffix: rest };
  }

  if (type === 'image' && isImagePlaceholderText(full)) {
    return { prefix: '', suffix: IMAGE_PLACEHOLDER_LABEL };
  }
  if (type === 'video' && full.trim() === videoLabel) return { prefix: '', suffix: videoLabel };
  if (type === 'file' && full.trim() === fileLabel) return { prefix: '', suffix: fileLabel };
  return { prefix: '', suffix: full };
}
