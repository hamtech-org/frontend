import { chatFileTypeAccent, chatFileTypeLabel } from '@/utils/chatFileDisplay';

type ChatFileTypeBadgeProps = {
  fileName: string;
  mimeType?: string | null;
  /** `sm` hàng preview ghim; `md` thẻ chat / danh sách ghim. */
  size?: 'sm' | 'md';
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<ChatFileTypeBadgeProps['size']>, string> = {
  sm: 'h-5 min-w-[22px] w-[22px] rounded text-[8px]',
  md: 'h-10 w-9 rounded-md text-[10px]',
};

/** Badge PDF / XLSX / DOC… — dùng `EXT_TYPE_LABEL` trong `chatFileDisplay`. */
export function ChatFileTypeBadge({
  fileName,
  mimeType,
  size = 'md',
  className,
}: ChatFileTypeBadgeProps) {
  const label = chatFileTypeLabel(fileName, mimeType);
  const accent = chatFileTypeAccent(fileName, mimeType);

  return (
    <span
      className={`flex shrink-0 items-center justify-center font-extrabold tracking-wide text-white ${SIZE_CLASS[size]} ${className ?? ''}`}
      style={{ backgroundColor: accent }}
      aria-hidden
    >
      {label.slice(0, 4)}
    </span>
  );
}
