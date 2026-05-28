import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Search, User, Users, X } from 'lucide-react';
import { ChatFileTypeBadge } from '@/components/chat/ChatFileTypeBadge';
import { ConversationSearchMessageCard } from '@/components/chat/conversationGallery/ConversationSearchMessageCard';
import { resolveChatFileBubbleMeta } from '@/utils/chatFileDisplay';
import type { IConversation, IMessage } from '@/types/chat.types';
import {
  formatConversationListLastPreview,
  isSystemChatNotificationMessage,
  sortConversationsForSidebar,
} from '@/utils/chatUtils';
import { formatZaloConversationTime } from '@/utils/formatDate';
import { toast } from 'react-toastify';
import { apiClient } from '@/services/api';
import type { ApiSuccessResponse } from '@/types/api.types';
import { resolveChatMediaFetchUrl } from '@/utils/chatMediaDownload';
import { resolveGroupAvatarDisplayUrl } from '@/utils/groupAvatarUrl';

export type ConversationSearchMemberRow = {
  userId?: string;
  displayName?: string | null;
  name?: string | null;
};

export type ConversationSearchPanelProps = {
  messages: IMessage[];
  currentUserId?: string;
  memberAvatarById: Map<string, string>;
  onClose: () => void;
  onSelectMessage: (messageId: string) => void;
  conversationTitle?: string;
  /** Thành viên nhóm — dùng cho lọc “Người gửi”. */
  conversationMembers?: ConversationSearchMemberRow[];
  conversationId?: string;
  /** Giống sidebar ConversationListPanel: tìm hội thoại theo tên / preview / id. */
  conversations?: IConversation[];
  onSelectConversation?: (conversationId: string) => void;
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

/** Biên ngày theo giờ máy người dùng → ISO gửi API browse. */
function localDayBoundsIso(dateStr: string): { from: string; to: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, mo, d] = dateStr.split('-').map(Number);
  const start = new Date(y, mo - 1, d, 0, 0, 0, 0);
  const end = new Date(y, mo - 1, d, 23, 59, 59, 999);
  if (Number.isNaN(start.getTime())) return null;
  return { from: start.toISOString(), to: end.toISOString() };
}

function messageOnLocalDay(createdAt: string, dateStr: string): boolean {
  if (!dateStr) return true;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return false;
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return key === dateStr;
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
  conversationMembers = [],
  conversationId,
  conversations = [],
  onSelectConversation,
}: ConversationSearchPanelProps) {
  /** Tìm trong panel info chat: chỉ tin/file của hội thoại đang mở, không liệt kê hội thoại. */
  const showConversationMatches = Boolean(onSelectConversation) && !conversationId?.trim();

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [senderUserId, setSenderUserId] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [browseRemote, setBrowseRemote] = useState<IMessage[] | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [msgLimit, setMsgLimit] = useState(INITIAL_MSG_LIMIT);
  const [fileLimit, setFileLimit] = useState(INITIAL_FILE_LIMIT);
  const lastEmptyToastNeedle = useRef<string | null>(null);

  const memberSelectOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { userId: string; label: string }[] = [];
    for (const row of conversationMembers) {
      const id = row.userId?.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const raw = (row.displayName ?? row.name ?? '').trim();
      const label = currentUserId && id === currentUserId ? 'Bạn' : raw || 'Thành viên';
      out.push({ userId: id, label });
    }
    out.sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    return out;
  }, [conversationMembers, currentUserId]);

  useEffect(() => {
    setSenderUserId('');
    setDateFilter('');
    setBrowseRemote(null);
    setBrowseError(null);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || (!senderUserId && !dateFilter)) {
      setBrowseRemote(null);
      setBrowseLoading(false);
      setBrowseError(null);
      return;
    }
    let cancelled = false;
    setBrowseLoading(true);
    setBrowseError(null);
    const params: Record<string, string> = { limit: '250' };
    if (senderUserId) params.senderId = senderUserId;
    if (dateFilter) {
      const bounds = localDayBoundsIso(dateFilter);
      if (bounds) {
        params.from = bounds.from;
        params.to = bounds.to;
      }
    }
    void apiClient
      .get<ApiSuccessResponse<IMessage[]>>(
        `/chat/conversations/${conversationId}/messages/browse`,
        {
          params,
        },
      )
      .then((res) => {
        if (cancelled) return;
        const payload = res.data?.data;
        setBrowseRemote(Array.isArray(payload) ? payload : []);
      })
      .catch(() => {
        if (cancelled) return;
        setBrowseRemote(null);
        setBrowseError('Không tải được thêm tin từ máy chủ.');
        toast.warning('Lọc theo thành viên/ngày: chỉ hiển thị tin đã tải trên máy (lỗi mạng).');
      })
      .finally(() => {
        if (!cancelled) setBrowseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, senderUserId, dateFilter]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 400);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setMsgLimit(INITIAL_MSG_LIMIT);
    setFileLimit(INITIAL_FILE_LIMIT);
  }, [debouncedQ, senderUserId, dateFilter]);

  const searchPool = useMemo(() => {
    const map = new Map<string, IMessage>();
    for (const m of messages) map.set(m.messageId, m);
    if (browseRemote?.length) {
      for (const m of browseRemote) map.set(m.messageId, m);
    }
    return Array.from(map.values()).sort((a, b) => {
      const ap = a.isPinned ? 1 : 0;
      const bp = b.isPinned ? 1 : 0;
      if (bp !== ap) return bp - ap;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [messages, browseRemote]);

  const listableConversations = useMemo(
    () => conversations.filter((c) => !(c.type === 'group' && c.isDeleted)),
    [conversations],
  );

  const filteredConversationsFull = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    if (!needle || !showConversationMatches) return [] as IConversation[];
    const hit = listableConversations.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const preview = formatConversationListLastPreview(c, currentUserId ?? '').toLowerCase();
      return (
        name.includes(needle) ||
        preview.includes(needle) ||
        c.conversationId.toLowerCase().includes(needle)
      );
    });
    return sortConversationsForSidebar(hit);
  }, [listableConversations, debouncedQ, currentUserId, showConversationMatches]);

  const filteredConversationsDisplay = filteredConversationsFull.slice(0, 8);
  const conversationMatchCount = filteredConversationsFull.length;

  const { messageHits, fileHits } = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    const hasText = needle.length > 0;
    if (!hasText && !senderUserId && !dateFilter) {
      return { messageHits: [] as IMessage[], fileHits: [] as IMessage[] };
    }
    const msgOut: IMessage[] = [];
    const fileOut: IMessage[] = [];
    for (let i = searchPool.length - 1; i >= 0; i--) {
      const m = searchPool[i]!;
      if (m.isRecalled || m.isDeleted) continue;
      if (isSystemChatNotificationMessage(m)) continue;
      if (senderUserId && m.senderId !== senderUserId) continue;
      if (dateFilter && !messageOnLocalDay(m.createdAt, dateFilter)) continue;
      if (hasText && !searchHaystack(m).includes(needle)) continue;
      if (m.type === 'file') {
        if (fileOut.length < 200) fileOut.push(m);
      } else if (msgOut.length < 200) {
        msgOut.push(m);
      }
      if (msgOut.length >= 200 && fileOut.length >= 200) break;
    }
    return { messageHits: msgOut, fileHits: fileOut };
  }, [searchPool, debouncedQ, senderUserId, dateFilter]);

  const totalHits = conversationMatchCount + messageHits.length + fileHits.length;

  useEffect(() => {
    const needle = debouncedQ.trim().toLowerCase();
    if (!needle && !senderUserId && !dateFilter) {
      lastEmptyToastNeedle.current = null;
      return;
    }
    if (totalHits > 0) {
      lastEmptyToastNeedle.current = null;
      return;
    }
    const toastKey = `${needle}\0${senderUserId}\0${dateFilter}`;
    if (lastEmptyToastNeedle.current === toastKey) return;
    lastEmptyToastNeedle.current = toastKey;
    toast.info(
      showConversationMatches
        ? 'Không tìm thấy hội thoại, tin nhắn hoặc file phù hợp (đã gộp tin tải thêm từ máy chủ nếu có).'
        : 'Không tìm thấy tin nhắn hoặc file phù hợp (đã gộp tin tải thêm từ máy chủ nếu có).',
    );
  }, [debouncedQ, totalHits, showConversationMatches, senderUserId, dateFilter]);

  const needleForUi = debouncedQ.trim();
  const shownMessages = messageHits.slice(0, msgLimit);
  const shownFiles = fileHits.slice(0, fileLimit);
  const hasMoreMsg = messageHits.length > msgLimit;
  const hasMoreFile = fileHits.length > fileLimit;

  const jump = (messageId: string) => {
    onSelectMessage(messageId);
    onClose();
  };

  const pickConversation = (conversationId: string) => {
    onSelectConversation?.(conversationId);
    onClose();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#1a1a1a]">
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
        <div className="mt-3 flex min-w-0 items-center gap-1.5 whitespace-nowrap">
          <span className="flex h-7 shrink-0 items-center text-[10px] font-semibold text-muted-foreground">
            Lọc theo
          </span>

          {memberSelectOptions.length > 0 ? (
            <label className="flex h-7 min-w-0 max-w-[140px] items-center gap-1 rounded-lg border border-black/[0.08] bg-black/[0.04] px-2 shadow-sm dark:border-white/[0.1] dark:bg-white/[0.05]">
              <User className="h-3 w-3 shrink-0 text-muted-foreground" />

              <select
                value={senderUserId}
                onChange={(e) => setSenderUserId(e.target.value)}
                className="min-w-0 flex-1 truncate border-0 bg-transparent text-[11px] font-medium outline-none"
              >
                <option value="">Người gửi</option>
                {memberSelectOptions.map((opt) => (
                  <option key={opt.userId} value={opt.userId}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <button
              type="button"
              disabled
              className="flex h-7 items-center gap-1 rounded-lg border border-black/[0.08] bg-black/[0.04] px-2 text-[11px] text-muted-foreground opacity-60 dark:border-white/[0.1] dark:bg-white/[0.05]"
            >
              <User className="h-3 w-3" />
              Người gửi
            </button>
          )}

          <div className="flex h-7 items-center gap-1 rounded-lg border border-black/[0.08] bg-black/[0.04] px-2 shadow-sm dark:border-white/[0.1] dark:bg-white/[0.05]">
            <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-[105px] border-0 bg-transparent text-[11px] font-medium outline-none"
            />

            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        {browseError ? (
          <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            {browseError}
          </p>
        ) : null}
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {!needleForUi && !senderUserId && !dateFilter ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-[#0068ff]/10 text-[#0068ff] dark:bg-[#0068ff]/20">
              <Search className="h-12 w-12 stroke-[1.25]" />
            </div>
            <p className="max-w-sm text-sm font-medium leading-relaxed text-muted-foreground">
              {showConversationMatches
                ? 'Chọn thành viên hoặc ngày để xem tin; có thể thêm từ khóa để thu hẹp. Hoặc chỉ nhập từ khóa để tìm hội thoại / tin.'
                : 'Chọn thành viên hoặc ngày để xem tin; có thể thêm từ khóa để thu hẹp.'}
              {conversationTitle ? (
                <span className="mt-1 block truncate text-xs font-semibold text-foreground/80">
                  {conversationTitle}
                </span>
              ) : null}
            </p>
          </div>
        ) : totalHits === 0 && !browseLoading ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Search className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">Không tìm thấy kết quả</p>
            <p className="mt-1 max-w-xs text-[12px] text-muted-foreground/80">
              {showConversationMatches
                ? 'Thử tên hội thoại, nội dung tin hoặc file (trong chat đang mở).'
                : 'Thử từ khóa khác hoặc cuộn lịch sử để tải thêm tin.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6 px-3 py-4 pb-8">
            {browseLoading ? (
              <p className="px-1 py-2 text-center text-[12px] font-medium text-muted-foreground">
                Đang tải tin từ máy chủ theo bộ lọc…
              </p>
            ) : null}
            {showConversationMatches && filteredConversationsDisplay.length > 0 ? (
              <section>
                <h4 className="mb-2 px-1 text-[13px] font-bold text-foreground">
                  Hội thoại ({conversationMatchCount})
                </h4>
                <ul className="divide-y divide-black/[0.05] overflow-hidden rounded-xl border border-black/[0.06] dark:divide-white/[0.06] dark:border-white/10">
                  {filteredConversationsDisplay.map((contact) => {
                    const displayName = contact.name ?? 'Hội thoại';
                    const preview = formatConversationListLastPreview(contact, currentUserId ?? '');
                    const avatarSrc =
                      contact.type === 'group'
                        ? resolveGroupAvatarDisplayUrl(contact.avatar, {
                            conversationId: contact.conversationId,
                            avatarVersion: String(contact.memberCount ?? ''),
                          })
                        : contact.avatar
                          ? resolveChatMediaFetchUrl(contact.avatar)
                          : undefined;
                    return (
                      <li key={contact.conversationId}>
                        <button
                          type="button"
                          onClick={() => pickConversation(contact.conversationId)}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                        >
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                              {contact.type === 'group' ? (
                                <Users className="h-4 w-4 text-blue-600" />
                              ) : (
                                <User className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-foreground">
                              <HighlightMatch text={displayName} needle={needleForUi} />
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              <HighlightMatch text={preview} needle={needleForUi} />
                            </p>
                          </div>
                          {contact.type === 'group' ? (
                            <Users className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section>
              <h4 className="mb-2 px-1 text-[13px] font-bold text-foreground">
                {conversationId?.trim() ? 'Tin nhắn' : 'Tin nhắn (trong hội thoại hiện tại)'}
              </h4>
              {messageHits.length === 0 ? (
                <p className="px-2 py-4 text-center text-[13px] text-muted-foreground">
                  Không có tin nhắn khớp.
                </p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {shownMessages.map((m) => {
                      const isMe = m.senderId === currentUserId;
                      const who = isMe
                        ? 'Bạn'
                        : m.senderDisplayName?.trim() || m.senderId || 'Thành viên';
                      const time = formatZaloConversationTime(m.createdAt);
                      return (
                        <li key={m.messageId}>
                          <ConversationSearchMessageCard
                            message={m}
                            currentUserId={currentUserId}
                            senderLabel={who}
                            avatarUrl={memberAvatarById.get(m.senderId) ?? null}
                            timeLabel={time}
                            needle={needleForUi}
                            onClick={() => jump(m.messageId)}
                          />
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
                <p className="px-2 py-4 text-center text-[13px] text-muted-foreground">
                  Không có file khớp.
                </p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {shownFiles.map((m) => {
                      const isMe = m.senderId === currentUserId;
                      const who = isMe
                        ? 'Bạn'
                        : m.senderDisplayName?.trim() || m.senderId || 'Thành viên';
                      const { fileName: name, mimeType } = resolveChatFileBubbleMeta(m);
                      const sizeStr = formatFileSize(m.mediaSize ?? null);
                      const dateStr = m.createdAt
                        ? new Date(m.createdAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                          })
                        : '';
                      return (
                        <li key={m.messageId}>
                          <button
                            type="button"
                            onClick={() => jump(m.messageId)}
                            className="flex w-full gap-3 rounded-xl border border-black/[0.06] bg-white p-3 text-left shadow-sm transition-colors hover:border-[#5C6BC0]/35 dark:border-white/10 dark:bg-[#242424]"
                          >
                            <ChatFileTypeBadge fileName={name} mimeType={mimeType} size="md" />
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
