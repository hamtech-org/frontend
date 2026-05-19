import { ChatFileTypeBadge } from '@/components/chat/ChatFileTypeBadge';

type ConversationGalleryFileCardProps = {
  fileName: string;
  mimeType?: string | null;
  metaLine: string;
  onClick?: () => void;
};

export function ConversationGalleryFileCard({
  fileName,
  mimeType,
  metaLine,
  onClick,
}: ConversationGalleryFileCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-black/[0.06] bg-white p-3 text-left shadow-sm transition-colors hover:border-[#0068ff]/30 dark:border-white/10 dark:bg-[#242424]"
    >
      <ChatFileTypeBadge fileName={fileName} mimeType={mimeType} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{fileName}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{metaLine}</p>
      </div>
    </button>
  );
}
