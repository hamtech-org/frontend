import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { REELS } from '@/features/newsfeed/constants';
import { useFeedPagination } from '@/features/newsfeed/hooks/useFeedPagination';
import { useHorizontalScrollerControls } from '@/features/newsfeed/hooks/useHorizontalScrollerControls';
import { CreatePostPromptCard } from '@/features/newsfeed/components/CreatePostPromptCard';
import { ReelsSection } from '@/features/newsfeed/components/ReelsSection';
import { FeedSection } from '@/features/newsfeed/components/FeedSection';

export default function HomePage() {
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { posts, hasMore, isLoadingInitial, isFetchingNext, loadMoreRef } = useFeedPagination();
  const { scrollerRef, canScrollLeft, canScrollRight, updateNavState, scrollByDirection } =
    useHorizontalScrollerControls();

  const createPostName = useMemo(
    () => currentUser?.displayName?.trim() || 'Bạn',
    [currentUser?.displayName],
  );
  const createPostAvatar = useMemo(() => currentUser?.avatar || '', [currentUser?.avatar]);
  const createPostInitial = useMemo(
    () => createPostName.charAt(0).toUpperCase() || 'U',
    [createPostName],
  );

  return (
    <div className="editorial-void max-w-[800px] mx-auto space-y-5 pt-1 md:pt-2 lg:pt-3">
      <section className="space-y-3">
        <CreatePostPromptCard
          createPostName={createPostName}
          createPostAvatar={createPostAvatar}
          createPostInitial={createPostInitial}
          onCreatePost={() => navigate('/posts/new')}
        />
        <ReelsSection
          reels={REELS}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          scrollerRef={scrollerRef}
          onScroll={updateNavState}
          onScrollByDirection={scrollByDirection}
        />
      </section>

      <FeedSection
        posts={posts}
        isLoadingInitial={isLoadingInitial}
        isFetchingNext={isFetchingNext}
        hasMore={hasMore}
        loadMoreRef={loadMoreRef}
      />
    </div>
  );
}
