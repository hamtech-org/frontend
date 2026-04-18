import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  MoreHorizontal,
  PinOff,
  Video,
} from 'lucide-react';
import type { IMessage } from '@/types/chat.types';
import {
  extractFirstHttpUrl,
  formatPinnedMessagePreviewLine,
  mediaThumbSrcForPinnedRow,
} from '@/utils/chatUtils';
import { AuthenticatedMedia } from '@/components/chat/AuthenticatedMedia';

type PinnedMessagesBarProps = {
  pinnedMessages: IMessage[];
  onScrollToMessage: (messageId: string) => void;
  onTogglePin: (msg: IMessage) => void;
};

function truncateUrl(url: string, max = 42): string {
  if (url.length <= max) return url;
  return `${url.slice(0, 28)}…${url.slice(-8)}`;
}

/** Dùng chung cho thanh ghim và modal giới hạn ghim. */
export function PinnedRowPreview({ msg }: { msg: IMessage }) {
  const thumb = mediaThumbSrcForPinnedRow(msg);
  const sender = msg.senderDisplayName?.trim() || msg.senderId;

  if (msg.type === 'image' && thumb) {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className="font-medium text-slate-800 dark:text-slate-100 shrink-0">{sender}:</span>
        <span className="relative w-5 h-5 rounded overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 ring-1 ring-black/5">
          <AuthenticatedMedia src={thumb} kind="image" className="w-full h-full object-cover" alt="" />
        </span>
        <span className="truncate text-slate-600 dark:text-slate-300">Ảnh</span>
      </span>
    );
  }

  if (msg.type === 'image') {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className="font-medium text-slate-800 dark:text-slate-100 shrink-0">{sender}:</span>
        <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
        <span className="truncate text-slate-600 dark:text-slate-300">Ảnh</span>
      </span>
    );
  }

  if (msg.type === 'video' && thumb) {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className="font-medium text-slate-800 dark:text-slate-100 shrink-0">{sender}:</span>
        <span className="relative w-5 h-5 rounded overflow-hidden bg-zinc-900 shrink-0 ring-1 ring-black/5">
          <AuthenticatedMedia src={thumb} kind="image" className="w-full h-full object-cover" alt="" />
        </span>
        <span className="truncate text-slate-600 dark:text-slate-300">Video</span>
      </span>
    );
  }

  if (msg.type === 'video') {
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className="font-medium text-slate-800 dark:text-slate-100 shrink-0">{sender}:</span>
        <Video className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
        <span className="truncate text-slate-600 dark:text-slate-300">Video</span>
      </span>
    );
  }

  if (msg.type === 'file') {
    const name = msg.mediaOriginalName?.trim() || 'Tệp tin';
    return (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className="font-medium text-slate-800 dark:text-slate-100 shrink-0">{sender}:</span>
        <FileText className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
        <span className="truncate text-slate-600 dark:text-slate-300">{name}</span>
      </span>
    );
  }

  if (msg.type === 'text') {
    const url = extractFirstHttpUrl(msg.content ?? '');
    if (url) {
      return (
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="font-medium text-slate-800 dark:text-slate-100 shrink-0">{sender}:</span>
          <Link2 className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden />
          <span className="truncate text-slate-600 dark:text-slate-300">Link · {truncateUrl(url)}</span>
        </span>
      );
    }
  }

  const line = formatPinnedMessagePreviewLine(msg);
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <span className="font-medium text-slate-800 dark:text-slate-100 shrink-0">{sender}:</span>
      <span className="truncate text-slate-600 dark:text-slate-300">{line}</span>
    </span>
  );
}

function PinnedRow({
  msg,
  onScrollToMessage,
  onTogglePin,
}: {
  msg: IMessage;
  onScrollToMessage: (id: string) => void;
  onTogglePin: (m: IMessage) => void;
}) {
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!menuPos) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (moreBtnRef.current?.contains(t)) return;
      if (menuPanelRef.current?.contains(t)) return;
      setMenuPos(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuPos]);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    const w = 168;
    const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
    setMenuPos({ top: r.bottom + 6, left });
  };

  const menuPortal =
    menuPos && typeof document !== 'undefined'
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[290]"
              aria-hidden
              onMouseDown={(e) => {
                e.preventDefault();
                setMenuPos(null);
              }}
            />
            <div
              ref={menuPanelRef}
              data-pin-menu
              role="menu"
              className="fixed z-[300] min-w-[168px] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-zinc-900 shadow-xl py-1"
              style={{ top: menuPos.top, left: menuPos.left }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-[13px] text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                onClick={() => {
                  setMenuPos(null);
                  void onTogglePin(msg);
                }}
              >
                <PinOff className="w-4 h-4 opacity-70" />
                Bỏ ghim
              </button>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="group/pinrow flex items-stretch gap-2.5 px-3 sm:px-6 py-2.5 border-b border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-zinc-900 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 hover:shadow-[inset_0_0_0_1px_rgba(0,104,255,0.12)]">
        <button
          type="button"
          title="Xem trong khung chat"
          className="flex items-start gap-3 min-w-0 flex-1 text-left py-0.5 rounded-lg -mx-1 px-1 transition-transform duration-200 active:scale-[0.995] group-hover/pinrow:translate-x-0.5"
          onClick={() => onScrollToMessage(msg.messageId)}
        >
          <div className="w-9 h-9 rounded-full bg-[#0068ff] flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover/pinrow:scale-105 group-hover/pinrow:shadow-md">
            <MessageSquare className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
          <div className="flex flex-col min-w-0 gap-0.5 pt-0.5">
            <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-tight">Tin nhắn</p>
            <div className="text-[13px] leading-snug">
              <PinnedRowPreview msg={msg} />
            </div>
          </div>
        </button>
        <div className="relative flex items-center shrink-0">
          <button
            ref={moreBtnRef}
            type="button"
            title="Thao tác"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#0068ff] transition-colors"
            onClick={openMenu}
          >
            <MoreHorizontal className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
      {menuPortal}
    </>
  );
}

/**
 * Danh sách ghim kiểu Zalo: nền trắng / xám, không tông vàng.
 */
export function PinnedMessagesBar({
  pinnedMessages,
  onScrollToMessage,
  onTogglePin,
}: PinnedMessagesBarProps) {
  const total = pinnedMessages.length;
  const [expanded, setExpanded] = useState(true);

  if (total === 0) return null;

  if (!expanded) {
    return (
      <div className="w-full shrink-0 border-b border-slate-200 dark:border-slate-700 bg-[#f5f6f8] dark:bg-zinc-800/50">
        <button
          type="button"
          className="w-full px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 text-left rounded-none transition-all duration-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60 hover:shadow-[inset_0_0_0_1px_rgba(0,104,255,0.15)] active:scale-[0.998]"
          onClick={() => setExpanded(true)}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <span className="inline-flex w-7 h-7 rounded-full bg-[#0068ff] items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-white" strokeWidth={2} />
            </span>
            Danh sách ghim ({total})
          </span>
          <span className="text-[13px] text-slate-600 dark:text-slate-400 flex items-center gap-1 shrink-0">
            Mở rộng
            <ChevronDown className="w-4 h-4" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full shrink-0 flex flex-col border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2 bg-[#f5f6f8] dark:bg-zinc-800/80 border-b border-slate-200/90 dark:border-slate-700/90">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Danh sách ghim ({total})</h3>
        <button
          type="button"
          className="text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-[#0068ff] dark:hover:text-blue-300 flex items-center gap-1 py-1 px-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors"
          onClick={() => setExpanded(false)}
        >
          Thu gọn
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-[min(50vh,320px)] overflow-y-auto custom-scrollbar">
        {pinnedMessages.map((msg) => (
          <PinnedRow
            key={msg.messageId}
            msg={msg}
            onScrollToMessage={onScrollToMessage}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>
    </div>
  );
}
