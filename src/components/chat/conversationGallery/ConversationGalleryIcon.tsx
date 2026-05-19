import { FileText, ImageIcon, Link2 } from 'lucide-react';

import type { ConversationGalleryKind } from '@/components/chat/conversationGallery/conversationGalleryTheme';

type ConversationGalleryIconProps = {
  kind: ConversationGalleryKind;
  className?: string;
  strokeWidth?: number;
};

export function ConversationGalleryIcon({
  kind,
  className = 'h-[18px] w-[18px]',
  strokeWidth = 2,
}: ConversationGalleryIconProps) {
  if (kind === 'media') return <ImageIcon className={className} strokeWidth={strokeWidth} />;
  if (kind === 'file') return <FileText className={className} strokeWidth={strokeWidth} />;
  return <Link2 className={className} strokeWidth={strokeWidth} />;
}
