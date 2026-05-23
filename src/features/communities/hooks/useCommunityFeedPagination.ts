import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyGetJoinedCommunitiesFeedQuery } from '@/store/api/communityApi';
import type { IPost } from '@/types/newsfeed.types';
import type { ReactionType } from '@/types/reaction.types';
import { mergeDedupPosts } from '@/features/newsfeed/utils/feedMerge';

export const useCommunityFeedPagination = () => {
  const [triggerGetFeed] = useLazyGetJoinedCommunitiesFeedQuery();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const didBootstrapFeedRef = useRef(false);

  useEffect(() => {
    const handlePostCreated = (e: CustomEvent<IPost>) => {
      // Chỉ push vào feed cộng đồng nếu post đó có groupId/communityId
      if (!e.detail.groupId && !e.detail.communityId) return;
      setPosts((prev) => {
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
            limit: 15,
            cursor,
          },
          true,
        ).unwrap();

        const items = Array.isArray(response?.data?.items) ? response.data.items : [];
        const resNextCursor = response?.data?.nextCursor ?? null;
        const resHasMore = Boolean(response?.data?.hasMore);

        setPosts((prev) => (replace ? items : mergeDedupPosts(prev, items)));
        setNextCursor(resNextCursor);
        setHasMore(resHasMore);
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
