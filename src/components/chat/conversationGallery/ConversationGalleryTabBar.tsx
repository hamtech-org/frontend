import {
  CONVERSATION_GALLERY_KINDS,
  CONVERSATION_GALLERY_THEME,
  type ConversationGalleryKind,
} from '@/components/chat/conversationGallery/conversationGalleryTheme';

type ConversationGalleryTabBarProps = {
  active: ConversationGalleryKind;
  onChange: (kind: ConversationGalleryKind) => void;
};

export function ConversationGalleryTabBar({ active, onChange }: ConversationGalleryTabBarProps) {
  return (
    <div className="flex shrink-0 gap-2 border-b border-black/5 px-4 py-3 dark:border-white/5">
      {CONVERSATION_GALLERY_KINDS.map((kind) => {
        const theme = CONVERSATION_GALLERY_THEME[kind];
        const isActive = active === kind;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onChange(kind)}
            className={`flex flex-1 items-center justify-center rounded-xl border px-2 py-2 text-[12px] font-semibold transition-colors ${
              isActive
                ? 'border-transparent text-white shadow-sm'
                : 'border-black/[0.08] bg-black/[0.03] text-muted-foreground hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]'
            }`}
            style={isActive ? { backgroundColor: theme.tint } : undefined}
          >
            <span className="truncate">{theme.label}</span>
          </button>
        );
      })}
    </div>
  );
}
