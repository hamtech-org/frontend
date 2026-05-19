import { Image as ImageIcon, Link2, Video } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CONVERSATION_GALLERY_THEME } from '@/components/chat/conversationGallery/conversationGalleryTheme';
import type { IMessage } from '@/types/chat.types';
import {
  conversationSearchLeadKind,
  conversationSearchMediaThumbUrl,
  conversationSearchResultMeta,
  conversationSearchResultTitle,
  isConversationSearchLinkMessage,
} from '@/utils/conversationSearchDisplay';
import { lastMessagePreviewContentFromMessage } from '@/utils/chatUtils';

type ConversationSearchMessageCardProps = {
  message: IMessage;
  currentUserId?: string;
  senderLabel: string;
  avatarUrl?: string | null;
  timeLabel: string;
  needle: string;
  onClick: () => void;
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightTitle({ text, needle }: { text: string; needle: string }) {
  const n = needle.trim();
  if (!n)
    return (
      <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{text}</p>
    );
  try {
    const parts = text.split(new RegExp(`(${escapeRegExp(n)})`, 'gi'));
    return (
      <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
        {parts.map((part, i) =>
          part.toLowerCase() === n.toLowerCase() ? (
            <mark
              key={i}
              className="rounded-sm bg-blue-500/25 px-0.5 font-semibold text-blue-700 dark:text-blue-200"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    );
  } catch {
    return (
      <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{text}</p>
    );
  }
}

function SenderAvatarLead({
  avatarUrl,
  senderLabel,
}: {
  avatarUrl?: string | null;
  senderLabel: string;
}) {
  const initial = senderLabel.trim().charAt(0).toUpperCase() || '?';
  return (
    <Avatar className="size-12 shrink-0">
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : null}
      <AvatarFallback className="text-[15px] font-semibold">{initial}</AvatarFallback>
    </Avatar>
  );
}

function LeadVisual({
  message: m,
  linkLike,
  avatarUrl,
  senderLabel,
}: {
  message: IMessage;
  linkLike: boolean;
  avatarUrl?: string | null;
  senderLabel: string;
}) {
  const mediaTheme = CONVERSATION_GALLERY_THEME.media;
  const linkTheme = CONVERSATION_GALLERY_THEME.link;
  const lead = conversationSearchLeadKind(m, linkLike);

  if (lead === 'image-thumb') {
    const src = conversationSearchMediaThumbUrl(m);
    return (
      <div
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px]"
        style={{ backgroundColor: mediaTheme.softBg }}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center"
            style={{ color: mediaTheme.tint }}
          >
            <ImageIcon className="h-6 w-6" strokeWidth={1.75} />
          </span>
        )}
      </div>
    );
  }

  if (lead === 'video-icon') {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: mediaTheme.softBg, color: mediaTheme.tint }}
      >
        <Video className="h-6 w-6" strokeWidth={1.75} />
      </div>
    );
  }

  if (lead === 'link-icon') {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: linkTheme.softBg, color: linkTheme.tint }}
      >
        <Link2 className="h-5 w-5" strokeWidth={2} />
      </div>
    );
  }

  return <SenderAvatarLead avatarUrl={avatarUrl} senderLabel={senderLabel} />;
}

export function ConversationSearchMessageCard({
  message: m,
  currentUserId,
  senderLabel,
  avatarUrl,
  timeLabel,
  needle,
  onClick,
}: ConversationSearchMessageCardProps) {
  const rawPreview = lastMessagePreviewContentFromMessage(m, currentUserId);
  const linkLike = isConversationSearchLinkMessage(m, rawPreview);
  const title = conversationSearchResultTitle(m, rawPreview);
  const meta = conversationSearchResultMeta(senderLabel, timeLabel);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-black/[0.08] bg-white p-3 text-left shadow-sm transition-colors hover:border-[#0068ff]/30 hover:bg-black/[0.02] dark:border-white/10 dark:bg-[#242424] dark:hover:bg-white/[0.04]"
    >
      <LeadVisual message={m} linkLike={linkLike} avatarUrl={avatarUrl} senderLabel={senderLabel} />
      <div className="min-w-0 flex-1">
        <HighlightTitle text={title} needle={needle} />
        <p className="mt-1 truncate text-[12px] text-muted-foreground">{meta}</p>
      </div>
    </button>
  );
}
