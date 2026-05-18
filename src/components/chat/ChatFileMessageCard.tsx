import type { MouseEvent, ReactNode } from 'react';
import { CircleCheck, Download, Files, FolderOpen } from 'lucide-react';

import { AuthenticatedMedia } from '@/components/chat/AuthenticatedMedia';
import { chatFilePreviewUrl, chatFileTypeAccent, chatFileTypeLabel } from '@/utils/chatFileDisplay';
import { formatFileSize } from '@/utils/fileHelper';
import type { IMessage } from '@/types/chat.types';

type ChatFileMessageCardProps = {
  msg: IMessage;
  mediaSavedOnDevice: boolean;
  showCaption: boolean;
  replyHeader?: ReactNode;
  captionBlock?: ReactNode;
  onOpen: () => void;
  onOpenDownloadsHint: () => void;
  onDownload: () => void;
  onContextMenu?: (e: MouseEvent) => void;
};

/** Thẻ file kiểu Zalo: preview + footer xanh + caption trong một khối. */
export function ChatFileMessageCard({
  msg,
  mediaSavedOnDevice,
  showCaption,
  replyHeader,
  captionBlock,
  onOpen,
  onOpenDownloadsHint,
  onDownload,
  onContextMenu,
}: ChatFileMessageCardProps) {
  const fileName = msg.mediaOriginalName?.trim() || 'Tệp đính kèm';
  const preview = chatFilePreviewUrl(msg);
  const typeLabel = chatFileTypeLabel(fileName, msg.mediaType);
  const accent = chatFileTypeAccent(fileName, msg.mediaType);
  const sizeStr = msg.mediaSize != null && msg.mediaSize > 0 ? formatFileSize(msg.mediaSize) : null;
  const metaLine = [typeLabel, sizeStr].filter(Boolean).join(' • ');
  const caption = (msg.content ?? '').trim();
  const hasCaption = showCaption && caption.length > 0;

  return (
    <div
      className="flex w-full max-w-[min(100%,20rem)] min-w-[268px] flex-col overflow-hidden rounded-xl border border-[#B8C9E8] bg-white shadow-sm dark:border-white/15 dark:bg-zinc-900"
      onContextMenu={onContextMenu}
    >
      {replyHeader}
      <button
        type="button"
        className="block w-full cursor-pointer border-0 bg-white p-0 text-left dark:bg-zinc-900"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        aria-label="Xem trước file"
      >
        {preview ? (
          <AuthenticatedMedia
            src={preview}
            kind="image"
            className="block h-[148px] w-full object-cover bg-[#F5F6F8] dark:bg-zinc-950"
            alt=""
          />
        ) : (
          <div className="flex h-[132px] w-full items-center justify-center bg-white dark:bg-zinc-900">
            <Files className="h-12 w-12 text-[#B0B8C4] dark:text-zinc-600" strokeWidth={1.5} />
          </div>
        )}
      </button>

      <div className="flex items-center gap-2 border-t border-[#D8E6F8] bg-[#E8F1FC] px-2.5 py-2.5 dark:border-white/10 dark:bg-[#2A3140]">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <span
            className="flex h-10 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold tracking-wide text-white"
            style={{ backgroundColor: accent }}
          >
            {typeLabel.slice(0, 4)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-foreground">
              {fileName}
            </span>
            <span className="mt-0.5 block">
              {metaLine ? (
                <span className="block text-[11px] text-muted-foreground">{metaLine}</span>
              ) : null}
              {mediaSavedOnDevice ? (
                <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CircleCheck className="h-3 w-3 shrink-0" aria-hidden />
                  Đã có trên máy
                </span>
              ) : null}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {mediaSavedOnDevice ? (
            <button
              type="button"
              aria-label="Gợi ý thư mục tải xuống"
              title="Thư mục Tải xuống"
              className="rounded-lg border border-[#C5D0E0] bg-white p-2 hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDownloadsHint();
              }}
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Tải xuống"
            title="Tải xuống"
            className="rounded-lg border border-[#C5D0E0] bg-white p-2 hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {hasCaption && captionBlock ? (
        <div className="border-t border-black/6 bg-white px-3 py-2 dark:border-white/10 dark:bg-zinc-900">
          {captionBlock}
        </div>
      ) : null}
    </div>
  );
}
