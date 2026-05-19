import { ChevronRight } from 'lucide-react';

import {
  CONVERSATION_GALLERY_THEME,
  type ConversationGalleryKind,
} from '@/components/chat/conversationGallery/conversationGalleryTheme';

type ConversationGalleryNavRowProps = {
  kind: ConversationGalleryKind;
  onClick: () => void;
  disabled?: boolean;
};

export function ConversationGalleryNavRow({
  kind,
  onClick,
  disabled,
}: ConversationGalleryNavRowProps) {
  const theme = CONVERSATION_GALLERY_THEME[kind];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-black/5 px-4 py-3.5 text-left transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/5 dark:hover:bg-white/[0.06]"
    >
      <span className="min-w-0 flex-1 text-[14px] font-bold text-foreground">{theme.navLabel}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
    </button>
  );
}
