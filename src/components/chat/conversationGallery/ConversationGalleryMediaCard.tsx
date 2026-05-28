import { ImageIcon } from 'lucide-react';

import { CONVERSATION_GALLERY_THEME } from '@/components/chat/conversationGallery/conversationGalleryTheme';

type ConversationGalleryMediaCardProps = {
  who: string;
  when: string;
  thumbnailSrc?: string | null;
  isVideo?: boolean;
  onClick?: () => void;
};

export function ConversationGalleryMediaCard({
  who,
  when,
  thumbnailSrc,
  isVideo,
  onClick,
}: ConversationGalleryMediaCardProps) {
  const theme = CONVERSATION_GALLERY_THEME.media;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-3 rounded-xl border border-black/[0.06] bg-white p-2.5 text-left shadow-sm transition-colors hover:border-[#0068ff]/30 dark:border-white/10 dark:bg-[#242424]"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/10">
        {thumbnailSrc && !isVideo ? (
          <img src={thumbnailSrc} alt="" className="h-full w-full object-cover" />
        ) : thumbnailSrc && isVideo ? (
          <>
            <img src={thumbnailSrc} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[10px] font-bold text-white">
              ▶
            </span>
          </>
        ) : (
          <span
            className="flex h-full items-center justify-center"
            style={{ color: theme.tint, backgroundColor: theme.softBg }}
          >
            <ImageIcon className="h-6 w-6" strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-[13px] font-semibold text-foreground">{who}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{when || '—'}</p>
      </div>
    </button>
  );
}
