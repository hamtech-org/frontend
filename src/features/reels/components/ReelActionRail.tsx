import { useState, useCallback, useRef } from 'react';
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Bookmark,
  Flag,
  Eye,
  Trash2,
} from 'lucide-react';
import { Player } from '@lottiefiles/react-lottie-player';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { RootState } from '@/store/store';
import {
  useReactToReelMutation,
  useToggleSaveReelMutation,
  useDeleteReelMutation,
  useShareReelMutation,
} from '@/store/api/newsfeedApi';
import { REACTION_META } from '@/types/reaction.types';
import type { ReactionType } from '@/types/reaction.types';
import { FloatingEmoji } from '@/components/common/ReactionButton/FloatingEmoji';
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

const ReactionPickerItem = ({
  type,
  meta,
  onReact,
}: {
  type: ReactionType;
  meta: (typeof REACTION_META)[ReactionType];
  onReact: (type: ReactionType) => void;
}) => {
  const playerRef = useRef<Player>(null);
  return (
    <button
      type="button"
      title={meta.label}
      onClick={(e) => {
        e.stopPropagation();
        onReact(type);
      }}
      onMouseEnter={() => playerRef.current?.play()}
      onMouseLeave={() => playerRef.current?.stop()}
      className="size-10 flex items-center justify-center rounded-full hover:bg-muted transition-transform hover:scale-125 hover:-translate-y-1 active:scale-90"
    >
      <div className="size-8">
        <Player
          ref={playerRef}
          src={meta.lottie}
          autoplay
          loop
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </button>
  );
};

export const ReelActionRail = ({ reel, onOpenComments, onOpenReport, videoRect }: Props) => {
  const [reactToReel] = useReactToReelMutation();
  const [toggleSave] = useToggleSaveReelMutation();
  const [deleteReel] = useDeleteReelMutation();
  const [shareReel] = useShareReelMutation();
  const currentUserId = useSelector((state: RootState) => state.auth.user?.userId);
  const navigate = useNavigate();
  const isAuthor = reel.author?.userId === currentUserId;

  const [liked, setLiked] = useState<ReactionType | null>(reel.currentUserReaction ?? null);
  const [likeCount, setLikeCount] = useState(totalReactions(reel.reactionsCount));
  const [saved, setSaved] = useState(reel.isSaved ?? false);
  const [saveCount, setSaveCount] = useState(reel.savesCount);
  const [sharesCount, setSharesCount] = useState(reel.sharesCount);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const [floatingEmoji, setFloatingEmoji] = useState<{
    id: number;
    gif: string;
    x: number;
    y: number;
  } | null>(null);

  const handleReact = useCallback(
    async (type: ReactionType) => {
      const prevLiked = liked;
      const prevCount = likeCount;
      setReactionPickerOpen(false);

      const toggling = type === liked;

      if (!toggling && likeButtonRef.current) {
        const rect = likeButtonRef.current.getBoundingClientRect();
        const meta = REACTION_META[type];
        if (meta) {
          setFloatingEmoji({
            id: Date.now(),
            gif: meta.gif,
            x: rect.left + rect.width / 2,
            y: rect.top,
          });
        }
      }

      if (toggling) {
        setLiked(null);
        setLikeCount((c) => Math.max(0, c - 1));
      } else if (!liked) {
        setLiked(type);
        setLikeCount((c) => c + 1);
      } else {
        setLiked(type);
      }

      try {
        await reactToReel({ reelId: reel.reelId, type }).unwrap();
      } catch {
        setLiked(prevLiked);
        setLikeCount(prevCount);
      }
    },
    [liked, likeCount, reel.reelId, reactToReel],
  );

  const handleDefaultLikeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void handleReact(liked ?? 'like');
    },
    [liked, handleReact],
  );

  const handleReactionEnter = useCallback(() => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(() => setReactionPickerOpen(true), 400);
  }, []);

  const handleReactionLeave = useCallback(() => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(() => setReactionPickerOpen(false), 300);
  }, []);

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

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/reels/${reel.reelId}`;
    setSharesCount((c) => c + 1);
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: reel.caption ?? 'Reel', url });
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            // User aborted the share dialog. We can still count it.
          } else {
            throw shareErr;
          }
        }
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Đã copy link reel');
      }
      await shareReel(reel.reelId).unwrap();
    } catch (err) {
      setSharesCount((c) => Math.max(0, c - 1));
    }
  }, [reel.reelId, reel.caption, shareReel]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Xóa reel này? Hành động không thể hoàn tác.')) return;
    try {
      await deleteReel(reel.reelId).unwrap();
      toast.success('Đã xóa reel');
      navigate('/reels');
    } catch {
      toast.error('Không thể xóa reel');
    }
  }, [reel.reelId, deleteReel, navigate]);

  const currentMeta = liked ? REACTION_META[liked] : null;

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
      {/* Avatar */}
      <div className="relative mb-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (reel.author?.userId) navigate(`/profile/${reel.author.userId}`);
          }}
          className="block"
        >
          {reel.author?.avatar ? (
            <img
              src={reel.author.avatar}
              alt={reel.author.displayName}
              className="size-12 rounded-full border-2 border-white/80 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="size-12 rounded-full border-2 border-white/80 bg-primary/80 flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {reel.author?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
          )}
        </button>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 size-5 rounded-full bg-primary flex items-center justify-center">
          <span className="text-white text-xs font-bold leading-none">+</span>
        </div>
      </div>

      {/* Like + Reaction picker */}
      <div
        className="relative flex flex-col items-center gap-1"
        onMouseEnter={handleReactionEnter}
        onMouseLeave={handleReactionLeave}
      >
        {reactionPickerOpen && (
          <div
            className="absolute bottom-full right-0 mb-2 flex items-center gap-1 rounded-full bg-background p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-200 z-50"
            onMouseEnter={() => {
              if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
              setReactionPickerOpen(true);
            }}
            onMouseLeave={handleReactionLeave}
            onClick={(e) => e.stopPropagation()}
          >
            {(
              Object.entries(REACTION_META) as [
                ReactionType,
                (typeof REACTION_META)[ReactionType],
              ][]
            ).map(([type, meta]) => (
              <ReactionPickerItem
                key={type}
                type={type}
                meta={meta}
                onReact={(t) => void handleReact(t)}
              />
            ))}
          </div>
        )}

        <button
          ref={likeButtonRef}
          type="button"
          onClick={handleDefaultLikeClick}
          className="flex flex-col items-center gap-1 group"
          aria-label="Thích"
        >
          {currentMeta ? (
            <div className="size-7 drop-shadow-md">
              <Player
                src={currentMeta.lottie}
                autoplay
                loop={false}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ) : (
            <ThumbsUp
              className="size-7 text-white drop-shadow-md transition-transform group-active:scale-90"
              strokeWidth={2}
            />
          )}
          <span
            className="text-xs font-semibold drop-shadow-sm"
            style={{ color: currentMeta ? currentMeta.color : 'white' }}
          >
            {formatCount(likeCount)}
          </span>
        </button>

        {floatingEmoji && (
          <FloatingEmoji
            key={floatingEmoji.id}
            gif={floatingEmoji.gif}
            x={floatingEmoji.x}
            y={floatingEmoji.y}
            onComplete={() => setFloatingEmoji(null)}
          />
        )}
      </div>

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
          void handleShare();
        }}
        className="flex flex-col items-center gap-1 group"
        aria-label="Chia sẻ"
      >
        <Share2
          className="size-7 text-white drop-shadow-md transition-transform group-active:scale-90"
          strokeWidth={2}
        />
        <span className="text-xs font-semibold text-white drop-shadow-sm">
          {formatCount(sharesCount)}
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
          {isAuthor && (
            <button
              onClick={() => {
                setMoreOpen(false);
                void handleDelete();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted text-destructive"
            >
              <Trash2 className="size-4" />
              Xóa reel
            </button>
          )}
          <div className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground">
            <Eye className="size-4" />
            {formatCount(reel.viewsCount)} lượt xem
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
