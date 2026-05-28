import { Link2 } from 'lucide-react';

import { CONVERSATION_GALLERY_THEME } from '@/components/chat/conversationGallery/conversationGalleryTheme';

type ConversationGalleryLinkCardProps = {
  href: string;
  metaLine: string;
  onClick?: () => void;
};

export function ConversationGalleryLinkCard({
  href,
  metaLine,
  onClick,
}: ConversationGalleryLinkCardProps) {
  const theme = CONVERSATION_GALLERY_THEME.link;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-3 rounded-xl border border-black/[0.06] bg-white p-3 text-left shadow-sm transition-colors hover:border-[#0068FF]/30 dark:border-white/10 dark:bg-[#242424]"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: theme.softBg, color: theme.tint }}
      >
        <Link2 className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-all text-[13px] font-medium" style={{ color: theme.tint }}>
          {href}
        </p>
        <p className="mt-1.5 text-[11px] text-muted-foreground">{metaLine}</p>
      </div>
    </button>
  );
}
