import { useRef, useCallback, useState, useEffect } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetReelsFeedQuery } from '@/store/api/newsfeedApi';
import { ReelCard } from '@/features/newsfeed/components/ReelCard';

/**
 * Horizontal reel strip trên HomePage.
 * Fetch 6 reels gần nhất từ API thay vì mock data.
 */
export const ReelsSection = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useGetReelsFeedQuery({ feed: 'foryou', limit: 6 });
  const reels = data?.data?.items ?? [];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateNavState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    updateNavState();
  }, [reels.length, updateNavState]);

  const scrollByDirection = useCallback(
    (direction: 'left' | 'right') => {
      const el = scrollerRef.current;
      if (!el) return;
      el.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
      setTimeout(updateNavState, 350);
    },
    [updateNavState],
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex items-stretch gap-2.5 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`reel-skeleton-${i}`}
            className="shrink-0 w-[132px] h-[220px] rounded-xl bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Ẩn section nếu không có reels
  if (reels.length === 0) return null;

  return (
    <div className="relative">
      {canScrollLeft ? (
        <button
          type="button"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 size-8 rounded-full bg-background/90 shadow-sm flex items-center justify-center"
          onClick={() => scrollByDirection('left')}
          aria-label="Cuộn reels sang trái"
        >
          <ChevronRight className="w-5 h-5 text-foreground rotate-180" />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 size-8 rounded-full bg-background/90 shadow-sm flex items-center justify-center"
          onClick={() => scrollByDirection('right')}
          aria-label="Cuộn reels sang phải"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      ) : null}

      <div
        ref={scrollerRef}
        className="no-scrollbar flex items-stretch gap-2.5 overflow-x-auto pb-1"
        onScroll={updateNavState}
      >
        {/* Create reel card */}
        <button
          type="button"
          className="relative shrink-0 w-[132px] rounded-xl overflow-hidden bg-card shadow-sm"
          onClick={() => navigate('/reels')}
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
          <ReelCard key={reel.reelId} reel={reel} />
        ))}
      </div>
    </div>
  );
};
