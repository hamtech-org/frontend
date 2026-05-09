import { useState, useCallback } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, Flag, Eye } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useReactToReelMutation, useToggleSaveReelMutation } from '@/store/api/newsfeedApi';
import type { ReactionType } from '@/types/reaction.types';
import type { IReel } from '@/types/newsfeed.types';
import type { VideoRect } from './ReelPlayerFull';

interface Props {
  reel: IReel;
  onOpenComments: () => void;
  onOpenReport: () => void;
  videoRect?: VideoRect;
}

function totalReactions(counts: Partial<Record<ReactionType, number>>): number {
  return Object.values(counts).reduce((acc, v) => acc + (v ?? 0), 0);
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export const ReelActionRail = ({ reel, onOpenComments, onOpenReport, videoRect }: Props) => {
  const [reactToReel] = useReactToReelMutation();
  const [toggleSave] = useToggleSaveReelMutation();

  const [liked, setLiked] = useState<ReactionType | null>(reel.currentUserReaction ?? null);
  const [likeCount, setLikeCount] = useState(totalReactions(reel.reactionsCount));
  const [saved, setSaved] = useState(reel.isSaved ?? false);
  const [saveCount, setSaveCount] = useState(reel.savesCount);
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLike = useCallback(async () => {
    const prevLiked = liked;
    const prevCount = likeCount;

    if (liked) {
      setLiked(null);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      setLiked('like');
      setLikeCount((c) => c + 1);
    }

    try {
      await reactToReel({ reelId: reel.reelId, type: 'like' }).unwrap();
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  }, [liked, likeCount, reel.reelId, reactToReel]);

  const handleSave = useCallback(async () => {
    const prevSaved = saved;
    const prevCount = saveCount;

    setSaved((s) => !s);
    setSaveCount((c) => (saved ? Math.max(0, c - 1) : c + 1));

    try {
      await toggleSave(reel.reelId).unwrap();
    } catch {
      setSaved(prevSaved);
      setSaveCount(prevCount);
    }
  }, [saved, saveCount, reel.reelId, toggleSave]);

  return (
    <div
      className="absolute z-20 flex flex-col items-center gap-5"
      style={
        videoRect
          ? {
              left: videoRect.left + videoRect.width + 8,
              bottom: videoRect.top + 96,
            }
          : {
              right: 12,
              bottom: 96,
            }
      }
    >
      {/* Like */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void handleLike();
        }}
        className="flex flex-col items-center gap-1 group"
        aria-label="Thích"
      >
        <Heart
          className={`size-7 drop-shadow-md transition-transform group-active:scale-90 ${
            liked ? 'text-red-500' : 'text-white'
          }`}
          fill={liked ? 'currentColor' : 'none'}
          strokeWidth={2}
        />
        <span className="text-xs font-semibold text-white drop-shadow-sm">
          {formatCount(likeCount)}
        </span>
      </button>

      {/* Comment */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenComments();
        }}
        className="flex flex-col items-center gap-1 group"
        aria-label="Bình luận"
      >
        <MessageCircle
          className="size-7 text-white drop-shadow-md transition-transform group-active:scale-90"
          strokeWidth={2}
        />
        <span className="text-xs font-semibold text-white drop-shadow-sm">
          {formatCount(reel.commentsCount)}
        </span>
      </button>

      {/* Share */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="flex flex-col items-center gap-1 group"
        aria-label="Chia sẻ"
      >
        <Share2
          className="size-7 text-white drop-shadow-md transition-transform group-active:scale-90"
          strokeWidth={2}
        />
        <span className="text-xs font-semibold text-white drop-shadow-sm">
          {formatCount(reel.sharesCount)}
        </span>
      </button>

      {/* More */}
      <Popover open={moreOpen} onOpenChange={setMoreOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center group"
            aria-label="Thêm"
          >
            <MoreHorizontal
              className="size-7 text-white drop-shadow-md transition-transform group-active:scale-90"
              strokeWidth={2}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-1.5 rounded-xl"
          side="left"
          align="end"
          sideOffset={8}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              void handleSave();
              setMoreOpen(false);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Bookmark
              className={`size-4 ${saved ? 'text-yellow-500' : 'text-muted-foreground'}`}
              fill={saved ? 'currentColor' : 'none'}
            />
            {saved ? 'Bỏ lưu' : 'Lưu reel'}
            {saveCount > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {formatCount(saveCount)}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              onOpenReport();
              setMoreOpen(false);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted text-destructive"
          >
            <Flag className="size-4" />
            Báo cáo
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground">
            <Eye className="size-4" />
            {formatCount(reel.viewsCount)} lượt xem
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
