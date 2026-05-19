import { chatFileTypeAccent, chatFileTypeLabel } from '@/utils/chatFileDisplay';

type ChatFileTypeBadgeProps = {
  fileName: string;
  mimeType?: string | null;
  className?: string;
};

/** Badge PDF / XLSX / DOC… — dùng `EXT_TYPE_LABEL` trong `chatFileDisplay`. */
export function ChatFileTypeBadge({ fileName, mimeType, className }: ChatFileTypeBadgeProps) {
  const label = chatFileTypeLabel(fileName, mimeType);
  const accent = chatFileTypeAccent(fileName, mimeType);

  return (
    <span
      className={`flex h-10 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold tracking-wide text-white ${className ?? ''}`}
      style={{ backgroundColor: accent }}
      aria-hidden
    >
      {label.slice(0, 4)}
    </span>
  );
}
