import { FileText, X } from 'lucide-react';

import { chatFileTypeAccent, chatFileTypeLabel } from '@/utils/chatFileDisplay';

/** Kích thước thẻ file chờ gửi — đồng bộ web + mobile. */
export const PENDING_ATTACHMENT_CARD_WIDTH = 72;
export const PENDING_ATTACHMENT_CARD_HEIGHT = 100;
export const PENDING_ATTACHMENT_PREVIEW_HEIGHT = 56;
export const PENDING_ATTACHMENT_META_HEIGHT = 44;

export type PendingAttachment = {
  localId: string;
  file: File;
  previewUrl: string | null;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ChatPendingAttachmentsStripProps = {
  attachments: PendingAttachment[];
  onRemove: (localId: string) => void;
  removeDisabled?: boolean;
};

/** Dải preview file chờ gửi — mọi loại file cùng kích thước 72×100px. */
export function ChatPendingAttachmentsStrip({
  attachments,
  onRemove,
  removeDisabled = false,
}: ChatPendingAttachmentsStripProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-black/10 bg-black/3 p-2 dark:border-white/10 dark:bg-white/4">
      {attachments.map((p) => (
        <PendingAttachmentTile
          key={p.localId}
          item={p}
          onRemove={() => onRemove(p.localId)}
          removeDisabled={removeDisabled}
        />
      ))}
    </div>
  );
}

function PendingAttachmentTile({
  item,
  onRemove,
  removeDisabled,
}: {
  item: PendingAttachment;
  onRemove: () => void;
  removeDisabled: boolean;
}) {
  const { file, previewUrl } = item;
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  const typeLabel = chatFileTypeLabel(file.name, file.type);
  const typeAccent = chatFileTypeAccent(file.name, file.type);

  return (
    <div
      className="relative flex shrink-0 flex-col overflow-hidden rounded-lg border border-black/10 bg-white/80 dark:border-white/10 dark:bg-zinc-900/80"
      style={{
        width: PENDING_ATTACHMENT_CARD_WIDTH,
        height: PENDING_ATTACHMENT_CARD_HEIGHT,
      }}
    >
      <div
        className="w-full shrink-0 overflow-hidden bg-zinc-100/90 dark:bg-zinc-800/80"
        style={{ height: PENDING_ATTACHMENT_PREVIEW_HEIGHT }}
      >
        {previewUrl && isVideo ? (
          <video src={previewUrl} muted playsInline className="h-full w-full object-cover" />
        ) : previewUrl && isImage ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-black/5 dark:bg-white/5">
            <span
              className="rounded px-1 py-0.5 text-[9px] font-extrabold tracking-wide text-white"
              style={{ backgroundColor: typeAccent }}
            >
              {typeLabel.slice(0, 4)}
            </span>
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div
        className="flex shrink-0 flex-col justify-center border-t border-black/5 px-1 py-0.5 dark:border-white/5"
        style={{ height: PENDING_ATTACHMENT_META_HEIGHT }}
      >
        <p className="truncate text-[9px] font-medium leading-tight" title={file.name}>
          {file.name}
        </p>
        <p className="text-[8px] text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>

      <button
        type="button"
        title="Bỏ file"
        onClick={onRemove}
        disabled={removeDisabled}
        className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-90 hover:opacity-100 disabled:opacity-40"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
