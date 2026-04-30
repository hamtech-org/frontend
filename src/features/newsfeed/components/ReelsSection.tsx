import { ChevronRight, Plus } from 'lucide-react';
import type { RefObject } from 'react';
import type { ReelItem } from '@/features/newsfeed/constants';
import { ReelCard } from '@/features/newsfeed/components/ReelCard';

interface Props {
  reels: ReelItem[];
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollerRef: RefObject<HTMLDivElement>;
  onScroll: () => void;
  onScrollByDirection: (direction: 'left' | 'right') => void;
}

export const ReelsSection = ({
  reels,
  canScrollLeft,
  canScrollRight,
  scrollerRef,
  onScroll,
  onScrollByDirection,
}: Props) => (
  <div className="relative">
    {canScrollLeft ? (
      <button
        type="button"
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 size-8 rounded-full bg-background/90 shadow-sm flex items-center justify-center"
        onClick={() => onScrollByDirection('left')}
        aria-label="Cuộn reels sang trái"
      >
        <ChevronRight className="w-5 h-5 text-foreground rotate-180" />
      </button>
    ) : null}
    {canScrollRight ? (
      <button
        type="button"
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 size-8 rounded-full bg-background/90 shadow-sm flex items-center justify-center"
        onClick={() => onScrollByDirection('right')}
        aria-label="Cuộn reels sang phải"
      >
        <ChevronRight className="w-5 h-5 text-foreground" />
      </button>
    ) : null}

    <div
      ref={scrollerRef}
      className="no-scrollbar flex items-stretch gap-2.5 overflow-x-auto pb-1"
      onScroll={onScroll}
    >
      <button
        type="button"
        className="relative shrink-0 w-[132px] rounded-xl overflow-hidden bg-card shadow-sm"
      >
        <div className="h-[180px] bg-accent/60 flex items-center justify-center">
          <div className="size-14 rounded-full bg-primary/20" />
        </div>
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 size-9 rounded-full bg-blue-600 border-4 border-background flex items-center justify-center">
          <Plus className="w-4 h-4 text-white" />
        </div>
        <div className="py-2.5 text-xs font-bold text-foreground bg-background/70">Tạo tin</div>
      </button>

      {reels.map((reel) => (
        <ReelCard key={reel.id} reel={reel} />
      ))}
    </div>
  </div>
);
