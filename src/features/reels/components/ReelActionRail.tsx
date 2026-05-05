import { useState, useCallback } from 'react';
import { Heart, MessageCircle, Bookmark, Flag, Share2, Eye } from 'lucide-react';
import { useReactToReelMutation, useToggleSaveReelMutation } from '@/store/api/newsfeedApi';
import type { ReactionType } from '@/types/reaction.types';
import type { IReel } from '@/types/newsfeed.types';

interface Props {
  reel: IReel;
  onOpenComments: () => void;
  onOpenReport: () => void;
}

/** Tổng reactions từ reactionsCount map */
function totalReactions(counts: Partial<Record<ReactionType, number>>): number {
  return Object.values(counts).reduce((acc, v) => acc + (v ?? 0), 0);
}

/** Format số lớn: 1200 → 1.2K */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Cột action bên phải reel (TikTok-style):
 * ❤️ Like, 💬 Comment, 🔖 Save, 📤 Share, 🚩 Report, 👁 Views
 */
export const ReelActionRail = ({ reel, onOpenComments, onOpenReport }: Props) => {
  const [reactToReel] = useReactToReelMutation();
  const [toggleSave] = useToggleSaveReelMutation();

  // Optimistic local state
  const [liked, setLiked] = useState<ReactionType | null>(reel.currentUserReaction ?? null);
  const [likeCount, setLikeCount] = useState(totalReactions(reel.reactionsCount));
  const [saved, setSaved] = useState(reel.isSaved ?? false);
  const [saveCount, setSaveCount] = useState(reel.savesCount);

  const handleLike = useCallback(async () => {
    const prevLiked = liked;
    const prevCount = likeCount;

    if (liked) {
      // Toggle off
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

  const actions = [
    {
      icon: Heart,
      label: 'Thích',
      count: formatCount(likeCount),
      active: !!liked,
      activeColor: 'text-red-500',
      fillWhenActive: true,
      onClick: handleLike,
    },
    {
      icon: MessageCircle,
      label: 'Bình luận',
      count: formatCount(reel.commentsCount),
      active: false,
      activeColor: '',
      fillWhenActive: false,
      onClick: onOpenComments,
    },
    {
      icon: Bookmark,
      label: 'Lưu',
      count: formatCount(saveCount),
      active: saved,
      activeColor: 'text-yellow-400',
      fillWhenActive: true,
      onClick: handleSave,
    },
    {
      icon: Share2,
      label: 'Chia sẻ',
      count: formatCount(reel.sharesCount),
      active: false,
      activeColor: '',
      fillWhenActive: false,
      onClick: () => {
        // TODO Phase C: share flow
      },
    },
    {
      icon: Flag,
      label: 'Báo cáo',
      count: '',
      active: false,
      activeColor: '',
      fillWhenActive: false,
      onClick: onOpenReport,
    },
  ];

  return (
    <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
          }}
          className="flex flex-col items-center gap-1 group"
          aria-label={action.label}
        >
          <div
            className={`size-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center 
              transition-all duration-200 group-hover:bg-black/50 group-active:scale-90
              ${action.active ? action.activeColor : 'text-white'}`}
          >
            <action.icon
              className="size-5"
              fill={action.active && action.fillWhenActive ? 'currentColor' : 'none'}
            />
          </div>
          {action.count && (
            <span className="text-xs font-semibold text-white drop-shadow-sm">{action.count}</span>
          )}
        </button>
      ))}

      {/* Views count (display only) */}
      <div className="flex flex-col items-center gap-1 opacity-70">
        <Eye className="size-4 text-white" />
        <span className="text-[10px] text-white">{formatCount(reel.viewsCount)}</span>
      </div>
    </div>
  );
};
