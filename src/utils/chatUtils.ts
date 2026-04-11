import type { TypingUserEntry } from '@/store/slices/chatSlice';

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
