import type { LucideIcon } from 'lucide-react';
import { BarChart2, FileText, Image as ImageIcon, MessageSquare, Pin, Video } from 'lucide-react';
import type { IMessage } from '@/types/chat.types';
import { AuthenticatedMedia } from '@/components/chat/AuthenticatedMedia';
import { ChatFileTypeBadge } from '@/components/chat/ChatFileTypeBadge';
import { resolveChatFileBubbleMeta } from '@/utils/chatFileDisplay';
import {
  bulletinPinnedPreviewLine,
  mediaThumbSrcForPinnedRow,
  pinnedBulletinCardTitle,
  pinnedBulletinMetaLine,
  pinnedMessageAccent,
  pinnedMessageKind,
  pollQuestionFromPinnedMessage,
  shouldShowPinnedBulletinPreview,
  type PinnedMessageKind,
} from '@/utils/chatUtils';

const KIND_ICONS: Record<PinnedMessageKind, LucideIcon> = {
  message: MessageSquare,
  poll: BarChart2,
  image: ImageIcon,
  video: Video,
  file: FileText,
};

type BulletinPinnedMessageCardProps = {
  msg: IMessage;
  when: string;
  viewerUserId?: string;
  onClick: () => void;
};

/** Thẻ tin ghim trong bảng tin nhóm — gọn: tiêu đề + người gửi/thời gian, không lặp loại tin. */
export function BulletinPinnedMessageCard({
  msg,
  when,
  viewerUserId,
  onClick,
}: BulletinPinnedMessageCardProps) {
  const who = String(msg.senderDisplayName ?? '').trim() || 'Thành viên';
  const kind = pinnedMessageKind(msg);
  const accent = pinnedMessageAccent(msg);
  const Icon = KIND_ICONS[kind];
  const title = pinnedBulletinCardTitle(msg, viewerUserId);
  const pollQ = pollQuestionFromPinnedMessage(msg);
  const preview = pollQ ?? bulletinPinnedPreviewLine(msg, viewerUserId);
  const showPreview = shouldShowPinnedBulletinPreview(kind, title, preview);
  const thumb = kind === 'image' || kind === 'video' ? mediaThumbSrcForPinnedRow(msg) : null;
  const meta = pinnedBulletinMetaLine(who, when);
  const fileMeta = kind === 'file' ? resolveChatFileBubbleMeta(msg) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-black/[0.06] bg-white p-3 text-left shadow-sm transition-all hover:border-blue-200/80 hover:bg-blue-50/40 hover:shadow-md dark:border-white/10 dark:bg-[#242424] dark:hover:border-blue-500/30 dark:hover:bg-blue-950/20"
      title="Nhấn để mở tin ghim"
    >
      <div className="flex items-start gap-2.5">
        <span className={`relative shrink-0 ${kind === 'file' ? 'h-10 w-9' : 'h-9 w-9'}`}>
          {kind === 'file' && fileMeta ? (
            <ChatFileTypeBadge
              fileName={fileMeta.fileName}
              mimeType={fileMeta.mimeType}
              className="shadow-sm transition-transform group-hover:scale-105"
            />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-transform group-hover:scale-105"
              style={{ backgroundColor: accent }}
            >
              <Icon className="h-[18px] w-[18px] text-white" strokeWidth={2} aria-hidden />
            </span>
          )}
          <span
            className="absolute -left-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#242424]"
            aria-hidden
          >
            <Pin className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[14px] font-bold leading-snug text-foreground">
            {title || '…'}
          </span>
          <span className="mt-0.5 block truncate text-[12px] font-medium text-muted-foreground">
            {meta}
          </span>
          {showPreview ? (
            <span className="mt-1 line-clamp-2 block text-[13px] font-medium leading-snug text-foreground/85 whitespace-pre-line">
              {preview}
            </span>
          ) : null}
        </span>

        {thumb ? (
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-200 ring-1 ring-black/5 dark:bg-zinc-800">
            <AuthenticatedMedia
              src={thumb}
              kind="image"
              className="h-full w-full object-cover"
              alt=""
            />
            {kind === 'video' ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                <Video className="h-4 w-4 text-white" strokeWidth={2.5} aria-hidden />
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </button>
  );
}
