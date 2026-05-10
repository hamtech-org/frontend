import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useGetReelsFeedQuery, useLazyGetReelsFeedQuery } from '@/store/api/newsfeedApi';
import { ReelPlayerFull } from '@/features/reels/components/ReelPlayerFull';
import type { VideoRect } from '@/features/reels/components/ReelPlayerFull';
import { ReelActionRail } from '@/features/reels/components/ReelActionRail';
import { ReelCommentsSheet } from '@/features/reels/components/ReelCommentsSheet';
import { ReelReportDialog } from '@/features/reels/components/ReelReportDialog';
import { CreateReelModal } from '@/features/reels/components/CreateReelModal';
import type { IReel } from '@/types/newsfeed.types';

export default function ReelsPage() {
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [commentsReelId, setCommentsReelId] = useState<string | null>(null);
  const [reportReelId, setReportReelId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [globalVolume, setGlobalVolume] = useState(1);
  const [globalMuted, setGlobalMuted] = useState(true);
  const [videoRect, setVideoRect] = useState<VideoRect | undefined>(undefined);

  // Fetch initial page
  const { data, isLoading, isFetching } = useGetReelsFeedQuery({ feed: 'foryou', limit: 10 });
  const [fetchMore] = useLazyGetReelsFeedQuery();

  // Accumulate reels across pages
  const [allReels, setAllReels] = useState<IReel[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Reset khi data thay đổi (initial fetch hoặc switch tab)
  useEffect(() => {
    if (data?.data) {
      setAllReels(data.data.items);
      setNextCursor(data.data.nextCursor);
      setHasMore(data.data.hasMore);
      setVisibleIndex(0);
    }
  }, [data]);

  // Intersection Observer cho snap scroll
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const itemRefs = useCallback((node: HTMLDivElement | null, index: number) => {
    if (!node) return;
    // Observe this element
    if (observerRef.current) {
      observerRef.current.observe(node);
    }
    node.dataset.index = String(index);
  }, []);

  // Setup Intersection Observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(idx)) {
              setVisibleIndex(idx);
            }
          }
        }
      },
      {
        root: containerRef.current,
        threshold: 0.6,
      },
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [allReels.length]); // Re-create when reels change

  // Load more khi gần cuối
  useEffect(() => {
    if (visibleIndex >= allReels.length - 3 && hasMore && nextCursor && !isFetching) {
      fetchMore({ feed: 'foryou', limit: 10, cursor: nextCursor })
        .unwrap()
        .then((res) => {
          if (res?.data) {
            setAllReels((prev) => [...prev, ...res.data.items]);
            setNextCursor(res.data.nextCursor);
            setHasMore(res.data.hasMore);
          }
        })
        .catch(() => {});
    }
  }, [visibleIndex, allReels.length, hasMore, nextCursor, isFetching, fetchMore]);

  return (
    <div className="h-full w-full bg-black flex overflow-hidden">
      {/* Main video column */}
      <div className="relative flex-1 flex flex-col min-w-0">
        {/* Create button */}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="absolute top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition-all hover:bg-white/30 hover:scale-110"
          aria-label="Tạo reel mới"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="size-8 text-white animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allReels.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-white/60">
            <p className="text-lg font-semibold">Chưa có reel nào</p>
            <p className="text-sm mt-1">Hãy quay lại sau hoặc thử tab khác!</p>
          </div>
        )}

        {/* Snap scroll container */}
        {allReels.length > 0 && (
          <div
            ref={containerRef}
            className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory scrollbar-hide"
            style={{ scrollSnapType: 'y mandatory' }}
          >
            {allReels.map((reel, index) => (
              <div
                key={reel.reelId}
                ref={(node) => itemRefs(node, index)}
                className="relative w-full h-full snap-start snap-always"
              >
                <ReelPlayerFull
                  reel={reel}
                  isVisible={visibleIndex === index}
                  volume={globalVolume}
                  onVolumeChange={setGlobalVolume}
                  isMuted={globalMuted}
                  onMutedChange={setGlobalMuted}
                  onVideoRectChange={visibleIndex === index ? setVideoRect : undefined}
                />
                <ReelActionRail
                  reel={reel}
                  videoRect={videoRect}
                  onOpenComments={() => setCommentsReelId(reel.reelId)}
                  onOpenReport={() => setReportReelId(reel.reelId)}
                />
              </div>
            ))}

            {/* Loading more indicator */}
            {isFetching && (
              <div className="h-20 flex items-center justify-center">
                <Loader2 className="size-6 text-white/60 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comments sidebar — đẩy video qua thay vì overlay */}
      {commentsReelId && (
        <ReelCommentsSheet reelId={commentsReelId} onClose={() => setCommentsReelId(null)} />
      )}

      {/* Report Dialog */}
      <ReelReportDialog
        reelId={reportReelId ?? ''}
        open={!!reportReelId}
        onOpenChange={(open) => {
          if (!open) setReportReelId(null);
        }}
      />

      {/* Create Reel Modal */}
      <CreateReelModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
