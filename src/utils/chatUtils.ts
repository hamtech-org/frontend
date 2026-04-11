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
  if (currentUserId && lm.senderId === currentUserId) {
    return `Bạn: ${content}`;
  }
  if (conv.type === 'direct') {
    return content;
  }
  const name = lm.senderDisplayName?.trim() || 'Thành viên';
  return `${name}: ${content}`;
}
