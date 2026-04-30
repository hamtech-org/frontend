import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyGetFeedQuery } from '@/store/api/newsfeedApi';
import type { IPost } from '@/types/newsfeed.types';
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
