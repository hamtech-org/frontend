import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyGetFeedQuery } from '@/store/api/newsfeedApi';
import type { IPost } from '@/types/newsfeed.types';
import type { ReactionType } from '@/types/reaction.types';
import { FEED_PAGE_SIZE } from '@/features/newsfeed/constants';
import { mergeDedupPosts } from '@/features/newsfeed/utils/feedMerge';
import { toFeedPage } from '@/features/newsfeed/adapters/newsfeedApi.adapter';

export const useFeedPagination = () => {
  const [triggerGetFeed] = useLazyGetFeedQuery();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const didBootstrapFeedRef = useRef(false);

  useEffect(() => {
    const handlePostCreated = (e: CustomEvent<IPost>) => {
      setPosts((prev) => {
        // Avoid duplicate if already exists
        if (prev.some((p) => p.postId === e.detail.postId)) return prev;
        return [e.detail, ...prev];
      });
    };

    const handlePostDeleted = (e: CustomEvent<string>) => {
      setPosts((prev) => prev.filter((p) => p.postId !== e.detail));
    };

    const handlePostUpdated = (e: CustomEvent<Partial<IPost>>) => {
      setPosts((prev) =>
        prev.map((p) => (p.postId === e.detail.postId ? { ...p, ...e.detail } : p)),
      );
    };

    const handlePostReacted = (e: CustomEvent<{ postId: string; type: ReactionType | null }>) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.postId !== e.detail.postId) return p;
          const { type } = e.detail;
          const oldType = p.currentUserReaction;
          const newCounts = { ...p.reactionsCount };
          if (oldType) newCounts[oldType] = Math.max(0, (newCounts[oldType] ?? 1) - 1);
          if (type) newCounts[type] = (newCounts[type] ?? 0) + 1;
          return { ...p, currentUserReaction: type, reactionsCount: newCounts };
        }),
      );
    };

    window.addEventListener('post:created', handlePostCreated as EventListener);
    window.addEventListener('post:deleted', handlePostDeleted as EventListener);
    window.addEventListener('post:updated', handlePostUpdated as EventListener);
    window.addEventListener('post:reacted', handlePostReacted as EventListener);

    return () => {
      window.removeEventListener('post:created', handlePostCreated as EventListener);
      window.removeEventListener('post:deleted', handlePostDeleted as EventListener);
      window.removeEventListener('post:updated', handlePostUpdated as EventListener);
      window.removeEventListener('post:reacted', handlePostReacted as EventListener);
    };
  }, []);

  const fetchFeedPage = useCallback(
    async (cursor: string | null, replace: boolean): Promise<void> => {
      if (!replace && (!hasMore || isFetchingNext)) return;
      if (replace) setIsLoadingInitial(true);
      else setIsFetchingNext(true);

      try {
        const response = await triggerGetFeed(
          {
            limit: FEED_PAGE_SIZE,
            cursor,
          },
          true,
        ).unwrap();
        const page = toFeedPage(response);
        setPosts((prev) => (replace ? page.items : mergeDedupPosts(prev, page.items)));
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch {
        if (replace) {
          setPosts([]);
          setNextCursor(null);
          setHasMore(false);
        }
      } finally {
        if (replace) setIsLoadingInitial(false);
        else setIsFetchingNext(false);
      }
    },
    [hasMore, isFetchingNext, triggerGetFeed],
  );

  useEffect(() => {
    if (didBootstrapFeedRef.current) return;
    didBootstrapFeedRef.current = true;
    void fetchFeedPage(null, true);
  }, [fetchFeedPage]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (!hasMore || isFetchingNext || isLoadingInitial) return;
        void fetchFeedPage(nextCursor, false);
      },
      { rootMargin: '200px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchFeedPage, hasMore, isFetchingNext, isLoadingInitial, nextCursor]);

  return {
    posts,
    hasMore,
    isLoadingInitial,
    isFetchingNext,
    loadMoreRef,
  };
};
