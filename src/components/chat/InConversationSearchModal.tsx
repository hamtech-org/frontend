import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { FileText, Search, User, X } from 'lucide-react';
import type { IMessage } from '@/types/chat.types';
import { lastMessagePreviewContentFromMessage } from '@/utils/chatUtils';
import { formatZaloConversationTime } from '@/utils/formatDate';

type InConversationSearchModalProps = {
  open: boolean;
  onClose: () => void;
  conversationTitle?: string;
  messages: IMessage[];
  currentUserId?: string;
  onSelectMessage: (messageId: string) => void;
};

function searchHaystack(m: IMessage): string {
  return [
    m.content,
    m.mediaOriginalName,
    m.senderDisplayName,
    m.senderId,
  ]
    .filter((x) => x != null && String(x).length > 0)
    .join(' ')
    .toLowerCase();
}

export function InConversationSearchModal({
  open,
  onClose,
  conversationTitle,
  messages,
  currentUserId,
  onSelectMessage,
}: InConversationSearchModalProps) {
  const [q, setQ] = useState('');

  useEffect(() => {
    if (open) setQ('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const out: IMessage[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]!;
      if (m.isRecalled || m.isDeleted) continue;
      if (!searchHaystack(m).includes(needle)) continue;
      out.push(m);
      if (out.length >= 80) break;
    }
    return out;
  }, [messages, q]);

  const tree = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-[2px] dark:bg-black/60"
          role="presentation"
          onClick={() => onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="in-conv-search-title"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="my-auto w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#1a1a1a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center justify-center border-b border-black/5 px-10 py-3 dark:border-white/5">
              <h2
                id="in-conv-search-title"
                className="text-center text-[17px] font-bold text-foreground"
              >
                Tìm kiếm trong trò chuyện
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-black/5 px-4 py-3 dark:border-white/5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nhập từ khóa để tìm kiếm"
                  className="w-full rounded-xl border-2 border-[#0068ff]/50 bg-black/[0.04] py-2.5 pl-10 pr-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-[#0068ff] focus:ring-2 focus:ring-[#0068ff]/30 dark:border-[#0068ff]/45 dark:bg-white/[0.06]"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Lọc theo:</span>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-1.5 text-xs font-semibold text-muted-foreground opacity-60 dark:border-white/10 dark:bg-white/[0.04]"
                  title="Sắp có"
                >
                  <User className="h-3.5 w-3.5" />
                  Người gửi
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-1.5 text-xs font-semibold text-muted-foreground opacity-60 dark:border-white/10 dark:bg-white/[0.04]"
                  title="Sắp có"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Ngày gửi
                </button>
              </div>
              <p className="mt-2 text-[11px] font-medium leading-snug text-muted-foreground">
                Trong phạm vi tin đã tải — cuộn lịch sử chat để tải thêm nếu cần.
              </p>
            </div>

            <div className="max-h-[min(420px,55vh)] overflow-y-auto">
              {q.trim() === '' ? (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-2xl bg-[#0068ff]/10 text-[#0068ff] dark:bg-[#0068ff]/20">
                    <Search className="h-14 w-14 stroke-[1.25]" />
                  </div>
                  <p className="max-w-sm text-sm font-medium leading-relaxed text-muted-foreground">
                    Hãy nhập từ khóa để bắt đầu tìm kiếm tin nhắn và file trong trò chuyện
                    {conversationTitle ? (
                      <span className="mt-1 block truncate text-xs font-semibold text-foreground/80">
                        {conversationTitle}
                      </span>
                    ) : null}
                  </p>
                </div>
              ) : results.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">Không có tin nhắn khớp</p>
              ) : (
                <ul className="py-1">
                  {results.map((m) => {
                    const isMe = m.senderId === currentUserId;
                    const who = isMe ? 'Bạn' : (m.senderDisplayName?.trim() || m.senderId || 'Thành viên');
                    const preview = lastMessagePreviewContentFromMessage(m);
                    const time = formatZaloConversationTime(m.createdAt);
                    return (
                      <li key={m.messageId}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectMessage(m.messageId);
                            onClose();
                          }}
                          className="flex w-full flex-col gap-0.5 border-b border-black/[0.04] px-4 py-3 text-left transition-colors hover:bg-black/[0.04] dark:border-white/[0.06] dark:hover:bg-white/[0.06]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[14px] font-bold text-foreground">{who}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
                          </div>
                          <span className="line-clamp-2 text-[13px] text-muted-foreground">{preview}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(tree, document.body);
}
