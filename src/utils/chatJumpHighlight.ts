/** Class animation nhảy tới tin (ghim / trích dẫn / tìm kiếm). */
export const CHAT_JUMP_HIGHLIGHT_CLASS = 'chat-msg-jump-highlight';

/**
 * Viền/nhấn sáng bọc sát khối nội dung (bubble, ảnh, file, poll) — không bọc avatar hay hàng rộng.
 */
export function jumpHighlightContentClass(isHighlighted: boolean): string {
  if (!isHighlighted) return '';
  return `${CHAT_JUMP_HIGHLIGHT_CLASS} !border-2 !border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]`;
}

/** Shell media (ảnh/video/file) — giữ bo góc khớp thẻ. */
export function jumpHighlightMediaShellClass(isHighlighted: boolean): string {
  if (!isHighlighted) return '';
  return `${CHAT_JUMP_HIGHLIGHT_CLASS} !border-2 !border-blue-500`;
}

/** Bubble chữ — bo góc theo hướng gửi/nhận. */
export function jumpHighlightTextBubbleClass(isHighlighted: boolean, isMe: boolean): string {
  if (!isHighlighted) return '';
  const corner = isMe ? 'rounded-br-sm' : 'rounded-bl-sm';
  return `${CHAT_JUMP_HIGHLIGHT_CLASS} !border-2 !border-blue-500 ring-0 ${corner}`;
}
