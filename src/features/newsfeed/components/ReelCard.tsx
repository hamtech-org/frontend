import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { IReel } from '@/types/newsfeed.types';

interface Props {
  reel: IReel;
}

/** Format số lớn: 1200 → 1.2K */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Card thumbnail cho reel trong horizontal strip (HomePage).
 * Click → navigate to /reels (full-screen feed).
 */
export const ReelCard = ({ reel }: Props) => {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ y: -5 }}
      onClick={() => navigate(`/reels/${reel.reelId}`)}
      className="relative shrink-0 w-[132px] h-[220px] rounded-xl overflow-hidden group cursor-pointer"
    >
      {reel.thumbnailUrl ? (
        <img
          src={reel.thumbnailUrl}
          alt={reel.caption || 'Reel'}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-neutral-900">
          <Play className="size-9 fill-white text-white opacity-80" />
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

      {/* Author avatar */}
      <Avatar className="absolute top-2.5 left-2.5 size-8 border-2 border-blue-500">
        {reel.author?.avatar && (
          <AvatarImage src={reel.author.avatar} referrerPolicy="no-referrer" />
        )}
        <AvatarFallback className="text-xs bg-card/40 text-white">
          {reel.author?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>

      {/* Bottom info */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
        <div className="flex items-center gap-1">
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="text-xs font-bold">{formatCount(reel.viewsCount)}</span>
        </div>
        <p className="text-sm font-bold mt-1 leading-tight line-clamp-2">
          {reel.author?.displayName ?? 'Người dùng'}
        </p>
      </div>
    </motion.div>
  );
};
