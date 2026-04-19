import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, File, Search, User, X } from 'lucide-react';
import type { IMessage } from '@/types/chat.types';
import { lastMessagePreviewContentFromMessage } from '@/utils/chatUtils';
import { formatZaloConversationTime } from '@/utils/formatDate';
import { toast } from 'react-toastify';

export type ConversationSearchPanelProps = {
  messages: IMessage[];
  currentUserId?: string;
  memberAvatarById: Map<string, string>;
  onClose: () => void;
  onSelectMessage: (messageId: string) => void;
  conversationTitle?: string;
};

function searchHaystack(m: IMessage): string {
  return [m.content, m.mediaOriginalName, m.senderDisplayName, m.senderId]
    .filter((x) => x != null && String(x).length > 0)
    .join(' ')
    .toLowerCase();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightMatch({ text, needle }: { text: string; needle: string }) {
  const n = needle.trim();
  if (!n) return <>{text}</>;
  try {
    const parts = text.split(new RegExp(`(${escapeRegExp(n)})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === n.toLowerCase() ? (
            <mark
              key={i}
              className="rounded-sm bg-blue-500/25 px-0.5 font-medium text-blue-700 dark:bg-blue-400/25 dark:text-blue-200"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

const INITIAL_MSG_LIMIT = 15;
const INITIAL_FILE_LIMIT = 8;

export function ConversationSearchPanel({
  messages,
  currentUserId,
  memberAvatarById,
  onClose,
  onSelectMessage,
  conversationTitle,
}: ConversationSearchPanelProps) {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [msgLimit, setMsgLimit] = useState(INITIAL_MSG_LIMIT);
  const [fileLimit, setFileLimit] = useState(INITIAL_FILE_LIMIT);
  const lastEmptyToastNeedle = useRef<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 400);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setMsgLimit(INITIAL_MSG_LIMIT);
    setFileLimit(INITIAL_FILE_LIMIT);
  }, [debouncedQ]);

  const { messageHits, fileHits } = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    if (!needle) return { messageHits: [] as IMessage[], fileHits: [] as IMessage[] };
    const msgOut: IMessage[] = [];
    const fileOut: IMessage[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]!;
      if (m.isRecalled || m.isDeleted) continue;
      if (!searchHaystack(m).includes(needle)) continue;
      if (m.type === 'file') {
        if (fileOut.length < 200) fileOut.push(m);
      } else if (msgOut.length < 200) {
        msgOut.push(m);
      }
      if (msgOut.length >= 200 && fileOut.length >= 200) break;
    }
    return { messageHits: msgOut, fileHits: fileOut };
  }, [messages, debouncedQ]);

  const totalHits = messageHits.length + fileHits.length;

  useEffect(() => {
    const needle = debouncedQ.trim().toLowerCase();
    if (!needle) {
      lastEmptyToastNeedle.current = null;
      return;
    }
    if (totalHits > 0) {
      lastEmptyToastNeedle.current = null;
      return;
    }
    if (lastEmptyToastNeedle.current === needle) return;
    lastEmptyToastNeedle.current = needle;
    toast.info('Không tìm thấy tin nhắn hoặc file phù hợp trong phạm vi tin đã tải.');
  }, [debouncedQ, totalHits]);

  const needleForUi = debouncedQ.trim();
  const shownMessages = messageHits.slice(0, msgLimit);
  const shownFiles = fileHits.slice(0, fileLimit);
  const hasMoreMsg = messageHits.length > msgLimit;
  const hasMoreFile = fileHits.length > fileLimit;

  const renderAvatar = (senderId: string, label: string) => {
    const url = memberAvatarById.get(senderId);
    const initial = label.trim().charAt(0).toUpperCase() || '?';
    if (url) {
      return <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />;
    }
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/10 text-[14px] font-semibold dark:bg-white/10">
        {initial}
      </div>
    );
  };

  const jump = (messageId: string) => {
    onSelectMessage(messageId);
    onClose();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#1a1a1a]">
      <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/5">
        <div className="h-8 w-8 shrink-0" aria-hidden />
        <h3 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold text-black dark:text-white">
          Tìm kiếm trong trò chuyện
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
          title="Quay lại thông tin"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="shrink-0 border-b border-black/5 px-4 py-3 dark:border-white/5">
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
            className="w-full rounded-xl border-2 border-[#0068ff]/50 bg-black/[0.04] py-2.5 pl-10 pr-16 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-[#0068ff] focus:ring-2 focus:ring-[#0068ff]/30 dark:border-[#0068ff]/45 dark:bg-white/[0.06]"
            autoComplete="off"
            autoFocus
          />
          {q.trim() !== '' ? (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-600/10"
            >
              Xóa
            </button>
          ) : null}
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
            <Calendar className="h-3.5 w-3.5" />
            Ngày gửi
          </button>
        </div>
        <p className="mt-2 text-[11px] font-medium leading-snug text-muted-foreground">
          Trong phạm vi tin đã tải — cuộn lịch sử chat để tải thêm nếu cần.
        </p>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {needleForUi === '' ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-[#0068ff]/10 text-[#0068ff] dark:bg-[#0068ff]/20">
              <Search className="h-12 w-12 stroke-[1.25]" />
            </div>
            <p className="max-w-sm text-sm font-medium leading-relaxed text-muted-foreground">
              Hãy nhập từ khóa để tìm tin nhắn và file trong trò chuyện
              {conversationTitle ? (
                <span className="mt-1 block truncate text-xs font-semibold text-foreground/80">{conversationTitle}</span>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="space-y-6 px-3 py-4 pb-8">
            <section>
              <h4 className="mb-2 px-1 text-[13px] font-bold text-foreground">Tin nhắn</h4>
              {messageHits.length === 0 ? (
                <p className="px-2 py-4 text-center text-[13px] text-muted-foreground">Không có tin nhắn khớp.</p>
              ) : (
                <>
                  <ul className="space-y-0">
                    {shownMessages.map((m) => {
                      const isMe = m.senderId === currentUserId;
                      const who = isMe ? 'Bạn' : (m.senderDisplayName?.trim() || m.senderId || 'Thành viên');
                      const preview = lastMessagePreviewContentFromMessage(m);
                      const time = formatZaloConversationTime(m.createdAt);
                      return (
                        <li key={m.messageId} className="border-b border-black/[0.04] last:border-0 dark:border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => jump(m.messageId)}
                            className="flex w-full gap-2.5 px-2 py-3 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                          >
                            {renderAvatar(m.senderId, who)}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-[14px] font-bold text-foreground">{who}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">
                                <HighlightMatch text={preview} needle={needleForUi} />
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {hasMoreMsg ? (
                    <button
                      type="button"
                      onClick={() => setMsgLimit((n) => n + INITIAL_MSG_LIMIT)}
                      className="mt-2 w-full rounded-xl border border-black/10 bg-black/[0.04] py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
                    >
                      Xem thêm
                    </button>
                  ) : null}
                </>
              )}
            </section>

            <section>
              <h4 className="mb-2 px-1 text-[13px] font-bold text-foreground">File</h4>
              {fileHits.length === 0 ? (
                <p className="px-2 py-4 text-center text-[13px] text-muted-foreground">Không có file khớp.</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {shownFiles.map((m) => {
                      const isMe = m.senderId === currentUserId;
                      const who = isMe ? 'Bạn' : (m.senderDisplayName?.trim() || m.senderId || 'Thành viên');
                      const name = m.mediaOriginalName?.trim() || 'Tập tin';
                      const sizeStr = formatFileSize(m.mediaSize ?? null);
                      const dateStr = m.createdAt
                        ? new Date(m.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                        : '';
                      return (
                        <li key={m.messageId}>
                          <button
                            type="button"
                            onClick={() => jump(m.messageId)}
                            className="flex w-full gap-3 rounded-xl border border-black/[0.06] bg-white p-3 text-left shadow-sm transition-colors hover:border-blue-600/25 dark:border-white/10 dark:bg-[#242424]"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-500/12 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                              <File className="h-6 w-6" strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-[13px] font-semibold text-foreground">
                                <HighlightMatch text={name} needle={needleForUi} />
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {[sizeStr, who, dateStr].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {hasMoreFile ? (
                    <button
                      type="button"
                      onClick={() => setFileLimit((n) => n + INITIAL_FILE_LIMIT)}
                      className="mt-2 w-full rounded-xl border border-black/10 bg-black/[0.04] py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
                    >
                      Xem thêm
                    </button>
                  ) : null}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
