import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import type { IMessage } from '@/types/chat.types';
import { AuthenticatedMedia } from '@/components/chat/AuthenticatedMedia';
import { jumpHighlightMediaShellClass } from '@/utils/chatJumpHighlight';

interface ChatAlbumMessageBubbleProps {
  msg: IMessage;
  isMe: boolean;
  isJumpHighlight: boolean;
  jumpFlashNonce: number;
  onOpenLightbox: (items: any[], startIndex: number) => void;
}

export function ChatAlbumMessageBubble({
  msg,
  isMe: _isMe,
  isJumpHighlight,
  jumpFlashNonce,
  onOpenLightbox,
}: ChatAlbumMessageBubbleProps) {
  const items = msg.medias || [];
  if (items.length === 0) return null;

  const visibleItems = items.slice(0, 4);
  const remainingCount = items.length - 4;

  const getGridClass = () => {
    if (items.length === 2) return 'grid grid-cols-2 gap-1.5 h-44 sm:h-52';
    if (items.length === 3) return 'grid grid-cols-3 gap-1.5 h-32 sm:h-40';
    return 'grid grid-cols-2 grid-rows-2 gap-1.5 h-64 sm:h-80';
  };

  const handleItemClick = (index: number) => {
    const lightboxItems = items.map((item) => ({
      url: item.url,
      type: item.type,
    }));
    onOpenLightbox(lightboxItems, index);
  };

  return (
    <motion.div
      key={isJumpHighlight ? jumpFlashNonce : undefined}
      className={`w-full max-w-[28rem] sm:max-w-[32rem] overflow-hidden rounded-2xl border border-[#B8C9E8] bg-white shadow-xs dark:border-white/15 dark:bg-zinc-900 ${jumpHighlightMediaShellClass(isJumpHighlight)}`}
    >
      <div className={getGridClass()}>
        {visibleItems.map((item, index) => {
          const isLastVisible = index === 3;
          const showOverlay = isLastVisible && remainingCount > 0;
          const isVideo = item.type === 'video';

          // Use thumbnailUrl for videos if available, otherwise url
          const displayUrl = isVideo ? item.thumbnailUrl || item.url : item.url;
          const displayKind = isVideo ? 'image' : item.type; // display video thumbnail as static image in grid

          return (
            <button
              key={item.mediaId}
              type="button"
              className="relative w-full h-full cursor-zoom-in overflow-hidden focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/60 group bg-black/[0.04] dark:bg-black/40"
              onClick={() => handleItemClick(index)}
            >
              <AuthenticatedMedia
                src={displayUrl}
                kind={displayKind}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 select-none"
                alt={item.originalName || `Ảnh đính kèm ${index + 1}`}
              />

              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs border border-white/20 transition-transform group-hover:scale-110">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                </div>
              )}

              {showOverlay && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
                  <span className="text-xl sm:text-2xl font-black text-white tracking-wide">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
