import type { RefObject } from 'react';
import type { IPost } from '@/types/newsfeed.types';
import { PostCard } from '@/features/newsfeed/components/PostCard';
import { FeedLoadState } from '@/features/newsfeed/components/FeedLoadState';

interface Props {
  posts: IPost[];
  isLoadingInitial: boolean;
  isFetchingNext: boolean;
  hasMore: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  onOpenPost: (postId: string) => void;
}

export const FeedSection = ({
  posts,
  isLoadingInitial,
  isFetchingNext,
  hasMore,
  loadMoreRef,
  onOpenPost,
}: Props) => (
  <section className="space-y-6 pb-2">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-display font-bold tracking-tight">Dành cho bạn</h2>
    </div>

    <div className="space-y-6">
      <FeedLoadState
        isLoadingInitial={isLoadingInitial}
        isFetchingNext={isFetchingNext}
        hasMore={hasMore}
        hasPosts={posts.length > 0}
      />
      {posts.map((post) => (
        <PostCard key={post.postId} post={post} onOpenPost={onOpenPost} />
      ))}
      <div ref={loadMoreRef} />
    </div>
  </section>
);
