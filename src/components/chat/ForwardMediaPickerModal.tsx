import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Image as ImageIcon, Search, User, Users, Video, X } from 'lucide-react';
import type { IConversation, IMessage } from '@/types/chat.types';
import { AuthenticatedMedia } from '@/components/chat/AuthenticatedMedia';
import { resolveGroupAvatarDisplayUrl } from '@/utils/groupAvatarUrl';

type ForwardTab = 'recent' | 'groups' | 'friends';

type ForwardMediaPickerModalProps = {
  open: boolean;
  onClose: () => void;
  conversations: IConversation[];
  excludeConversationId: string | null;
  /** Tin đang chia sẻ (ảnh / video / file). */
  message: IMessage | null;
  onShare: (conversationIds: string[], caption: string) => Promise<void>;
};

function sortConvsByRecent(convs: IConversation[]) {
  return [...convs].sort((a, b) => {
    const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return tb - ta;
  });
}

function imagePreviewSrc(msg: IMessage): string {
  const full = msg.mediaUrl ?? '';
  const thumb = msg.thumbnailUrl ?? '';
  const mime = (msg.mediaType ?? '').toLowerCase();
  if (mime.includes('heic') || mime.includes('heif')) return thumb || full || '';
  return thumb || full || '';
}

function isPdfFile(msg: IMessage): boolean {
  const n = (msg.mediaOriginalName ?? '').toLowerCase();
  const m = (msg.mediaType ?? '').toLowerCase();
  return n.endsWith('.pdf') || m.includes('pdf');
}

function ForwardPreview({ msg }: { msg: IMessage }) {
  if (msg.type === 'image') {
    const src = imagePreviewSrc(msg);
    if (!src) {
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-600">
            <ImageIcon className="h-6 w-6 text-slate-500" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Chia sẻ ảnh</p>
            <p className="truncate text-xs text-slate-600 dark:text-slate-400">Ảnh</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-200 ring-1 ring-black/5 dark:bg-slate-700 dark:ring-white/10">
          <AuthenticatedMedia
            src={src}
            kind="image"
            className="h-full w-full object-cover"
            alt=""
          />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Chia sẻ ảnh</p>
          <p className="truncate text-xs text-slate-600 dark:text-slate-400">Hình ảnh</p>
        </div>
      </div>
    );
  }

  if (msg.type === 'video') {
    const thumb = msg.thumbnailUrl ?? msg.mediaUrl ?? '';
    return (
      <div className="flex items-center gap-3">
        {thumb ? (
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-black/5">
            <AuthenticatedMedia
              src={thumb}
              kind="image"
              className="h-full w-full object-cover"
              alt=""
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/25">
              <Video className="h-6 w-6 text-white drop-shadow" aria-hidden />
            </span>
          </span>
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
            <Video className="h-7 w-7 text-violet-600 dark:text-violet-300" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Chia sẻ video</p>
          <p className="truncate text-xs text-slate-600 dark:text-slate-400">
            {msg.mediaOriginalName?.trim() || 'Video'}
          </p>
        </div>
      </div>
    );
  }

  if (msg.type === 'file') {
    const name = msg.mediaOriginalName?.trim() || 'Tệp tin';
    const pdf = isPdfFile(msg);
    return (
      <div className="flex items-center gap-3">
        {pdf ? (
          <span className="flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-red-600 text-[10px] font-black leading-tight text-white shadow-sm">
            PDF
          </span>
        ) : (
          <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md bg-rose-100 dark:bg-rose-900/50">
            <FileText className="h-6 w-6 text-rose-700 dark:text-rose-300" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Chia sẻ file</p>
          <p className="truncate text-xs text-slate-600 dark:text-slate-400">{name}</p>
        </div>
      </div>
    );
  }

  return null;
}

export function ForwardMediaPickerModal({
  open,
  onClose,
  conversations,
  excludeConversationId,
  message,
  onShare,
}: ForwardMediaPickerModalProps) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<ForwardTab>('recent');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setTab('recent');
    setSelectedIds(new Set());
    setCaption('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  const baseList = useMemo(
    () => conversations.filter((c) => c.conversationId !== excludeConversationId),
    [conversations, excludeConversationId],
  );

  const tabFiltered = useMemo(() => {
    if (tab === 'groups') return baseList.filter((c) => c.type === 'group');
    if (tab === 'friends') return baseList.filter((c) => c.type === 'direct');
    return baseList;
  }, [baseList, tab]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = tabFiltered;
    if (s) {
      list = list.filter(
        (c) =>
          (c.name ?? '').toLowerCase().includes(s) || c.conversationId.toLowerCase().includes(s),
      );
    }
    return sortConvsByRecent(list);
  }, [tabFiltered, q]);

  const toggleId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleShare = async () => {
    if (selectedIds.size === 0 || !message) return;
    setSubmitting(true);
    try {
      await onShare([...selectedIds], caption);
      onClose();
    } catch {
      /* toast ở tầng gọi */
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || typeof document === 'undefined' || !message) return null;

  return createPortal(
    <div className="fixed inset-0 z-[320] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Đóng"
        disabled={submitting}
        onClick={() => {
          if (!submitting) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-share-title"
        className="relative flex max-h-[min(92vh,640px)] w-full max-w-[440px] flex-col rounded-t-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2
            id="forward-share-title"
            className="text-[17px] font-bold text-slate-900 dark:text-slate-50"
          >
            Chia sẻ
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-slate-100"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0068ff] focus:ring-1 focus:ring-[#0068ff]/30 dark:border-slate-600 dark:bg-zinc-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1 border-b border-slate-100 px-2 pt-1 dark:border-slate-800">
          {(
            [
              { id: 'recent' as const, label: 'Gần đây' },
              { id: 'groups' as const, label: 'Nhóm trò chuyện' },
              { id: 'friends' as const, label: 'Bạn bè' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={submitting}
              onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 px-2.5 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                tab === t.id
                  ? 'border-[#0068ff] text-[#0068ff]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-[140px] max-h-[220px] flex-1 overflow-y-auto px-1 py-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Không có hội thoại phù hợp.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((c) => {
                const name = c.name ?? 'Hội thoại';
                const isGroup = c.type === 'group';
                const checked = selectedIds.has(c.conversationId);
                const avatarSrc = isGroup
                  ? resolveGroupAvatarDisplayUrl(c.avatar, {
                      conversationId: c.conversationId,
                      updatedAt: c.updatedAt,
                    })
                  : c.avatar;
                return (
                  <li key={c.conversationId}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={submitting}
                        onChange={() => toggleId(c.conversationId)}
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#0068ff] focus:ring-[#0068ff]/40 dark:border-slate-600"
                      />
                      <div className="relative h-10 w-10 shrink-0">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt=""
                            className="h-10 w-10 rounded-full border border-slate-100 object-cover dark:border-slate-700"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/40">
                            {isGroup ? (
                              <Users
                                className="h-4 w-4 text-sky-600 dark:text-sky-300"
                                aria-hidden
                              />
                            ) : (
                              <User
                                className="h-4 w-4 text-sky-600 dark:text-sky-300"
                                aria-hidden
                              />
                            )}
                          </div>
                        )}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                        {name}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-100/90 px-3 py-3 dark:border-slate-700 dark:bg-zinc-800/80">
          <ForwardPreview msg={message} />
        </div>

        <div className="shrink-0 px-3 pb-2">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={submitting}
            placeholder="Nhập tin nhắn..."
            rows={2}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0068ff] focus:ring-1 focus:ring-[#0068ff]/25 dark:border-slate-600 dark:bg-zinc-900 dark:text-slate-100"
          />
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-3 py-3 dark:border-slate-700">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-full px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting || selectedIds.size === 0}
            onClick={() => void handleShare()}
            className="rounded-full bg-[#0068ff] px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0056d6] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? 'Đang gửi…' : 'Chia sẻ'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
