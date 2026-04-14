import type { TypingUserEntry } from '@/store/slices/chatSlice';
import type { IConversation } from '@/types/chat.types';

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

  const previewText = lm.type === 'call' ? formatCallPreview() : content;
  if (currentUserId && lm.senderId === currentUserId) {
    return `Bạn: ${previewText}`;
  }
  if (conv.type === 'direct') {
    return previewText;
  }
  const name = lm.senderDisplayName?.trim() || 'Thành viên';
  return `${name}: ${previewText}`;
}
