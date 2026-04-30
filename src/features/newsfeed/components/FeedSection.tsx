import type { RefObject } from 'react';
import type { IPost } from '@/types/newsfeed.types';
import { PostCard } from '@/features/newsfeed/components/PostCard';
import { FeedLoadState } from '@/features/newsfeed/components/FeedLoadState';

interface Props {
  posts: IPost[];
  isLoadingInitial: boolean;
  isFetchingNext: boolean;
  hasMore: boolean;
  loadMoreRef: RefObject<HTMLDivElement>;
}

export const FeedSection = ({
  posts,
  isLoadingInitial,
  isFetchingNext,
  hasMore,
  loadMoreRef,
}: Props) => (
  <section className="space-y-4 pb-1">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-display font-bold tracking-tight">Dành cho bạn</h2>
    </div>

    <div className="space-y-4">
      {isLoadingInitial ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`post-skeleton-${index}`}
              className="animate-pulse rounded-2xl border border-border/40 bg-card p-4"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted/70" />
                <div className="space-y-2">
                  <div className="h-3 w-32 rounded bg-muted/70" />
                  <div className="h-2.5 w-20 rounded bg-muted/60" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-muted/70" />
                <div className="h-3 w-5/6 rounded bg-muted/60" />
              </div>
              <div className="mt-3 h-44 w-full rounded-xl bg-muted/60" />
            </div>
          ))}
        </div>
      ) : null}
      {posts.map((post) => (
        <PostCard key={post.postId} post={post} />
      ))}
      <FeedLoadState
        isFetchingNext={isFetchingNext}
        hasMore={hasMore}
        hasPosts={posts.length > 0}
      />
      <div ref={loadMoreRef} />
    </div>
  </section>
);
