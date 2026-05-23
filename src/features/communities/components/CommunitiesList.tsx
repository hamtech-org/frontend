import { useEffect, useState } from 'react';
import { Settings, Search, Plus, Newspaper, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { searchService } from '@/services/search.service';
import { useListCommunitiesQuery, useJoinCommunityMutation } from '@/store/api/communityApi';
import type { ISearchGroupResult } from '@/types/search.types';
import {
  COMMUNITY_CATEGORIES,
  type ICommunity,
  type CommunityCategory,
} from '@/types/community.types';
import { NAV_ITEMS, CATEGORY_LABEL, type CommunityBrowseMode } from '../constants';
import { canManageCommunity } from '../utils/helpers';
import { MiniCommunityRow } from './MiniCommunityRow';
import { SearchGroupRow } from './SearchGroupRow';
import { CommunityGridSection } from './CommunityGridSection';
import { CommunityFormDialog } from './CommunityFormDialog';
import { EmptyState } from './EmptyState';
import { CommunityDiscoveryCard } from './CommunityDiscoveryCard';
import { useCommunityFeedPagination } from '../hooks/useCommunityFeedPagination';
import { PostCard } from '@/features/newsfeed/components/PostCard';
import { Loader2 } from 'lucide-react';

export function CommunitiesList() {
  const [category, setCategory] = useState<CommunityCategory | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<CommunityBrowseMode>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ISearchGroupResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [showAllForYou, setShowAllForYou] = useState(false);
  const [showAllOther, setShowAllOther] = useState(false);
  const { data, isLoading } = useListCommunitiesQuery({ category, limit: 30 });
  const { data: joined, isLoading: joinedLoading } = useListCommunitiesQuery({
    scope: 'joined',
    limit: 50,
  });
  const [joinCommunity, joinState] = useJoinCommunityMutation();
  const {
    posts: feedPosts,
    hasMore: feedHasMore,
    isLoadingInitial: feedLoadingInitial,
    isFetchingNext: feedFetchingNext,
    loadMoreRef: feedLoadMoreRef,
  } = useCommunityFeedPagination();
  const communities = data?.data.items ?? [];
  const joinedCommunities = joined?.data.items ?? [];
  const managedCommunities = joinedCommunities.filter((community) =>
    canManageCommunity(community.viewerRole),
  );
  const memberCommunities = joinedCommunities.filter(
    (community) => !canManageCommunity(community.viewerRole),
  );
  const visibleCommunities = communities.filter(
    (community) => !dismissedIds.has(community.groupId),
  );
  const forYouCommunities = visibleCommunities.slice(0, 4);
  const otherCommunities = visibleCommunities.slice(4);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    searchService
      .searchGroups({ q: debouncedSearch, pageSize: 8 })
      .then((result: { items?: ISearchGroupResult[] }) => {
        if (!cancelled) setSearchResults(result.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const dismissCommunity = (groupId: string): void => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(groupId);
      return next;
    });
  };

  const handleJoin = async (groupId: string): Promise<void> => {
    try {
      const res = await joinCommunity({ groupId }).unwrap();
      toast.success(
        res.data.status === 'requested' ? 'Đã gửi yêu cầu tham gia' : 'Đã tham gia nhóm',
      );
    } catch {
      toast.error('Không thể tham gia nhóm');
    }
  };

  const renderJoinedList = (items: ICommunity[], emptyText: string) => {
    if (joinedLoading) {
      return (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      );
    }

    if (!items.length) {
      return <p className="px-2 text-sm text-muted-foreground">{emptyText}</p>;
    }

    return (
      <div className="flex flex-col gap-1">
        {items.map((community) => (
          <MiniCommunityRow key={community.groupId} community={community} />
        ))}
      </div>
    );
  };

  const contentTitle =
    mode === 'discover'
      ? 'Gợi ý cho bạn'
      : mode === 'joined'
        ? 'Nhóm của bạn'
        : 'Bảng feed của bạn';

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-muted/30">
      <div className="grid min-h-[calc(100dvh-64px)] grid-cols-1 lg:grid-cols-[344px_1fr]">
        <aside className="hidden border-b border-border bg-background lg:block lg:sticky lg:top-0 lg:h-[calc(100dvh-64px)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-foreground">Nhóm</h1>
              <Button size="icon" variant="secondary" aria-label="Cài đặt nhóm">
                <Settings className="size-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm kiếm nhóm"
                className="h-10 rounded-full bg-muted pl-9"
              />
            </div>

            {searchQuery.trim().length >= 2 && (
              <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2">
                <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Kết quả tìm kiếm
                </div>
                {searchLoading ? (
                  <div className="flex flex-col gap-2 p-2">
                    <Skeleton className="h-12 rounded-xl" />
                    <Skeleton className="h-12 rounded-xl" />
                  </div>
                ) : searchResults.length ? (
                  searchResults.map((group) => <SearchGroupRow key={group.groupId} group={group} />)
                ) : (
                  <p className="px-2 pb-2 text-sm text-muted-foreground">
                    Không tìm thấy nhóm phù hợp.
                  </p>
                )}
              </section>
            )}

            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = mode === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMode(item.key)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                      active ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`flex size-9 items-center justify-center rounded-full ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <Button
              onClick={() => setDialogOpen(true)}
              className="w-full justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-colors duration-200 rounded-xl font-semibold h-11 cursor-pointer"
            >
              <Plus className="size-4" />
              Tạo cộng đồng mới
            </Button>

            <div className="h-px bg-border" />

            <section className="flex flex-col gap-2">
              <h2 className="px-2 text-sm font-bold text-foreground">Chủ đề</h2>
              <div className="px-2 lg:px-0">
                <Select
                  value={category || 'all'}
                  onValueChange={(val) => {
                    setCategory(val === 'all' ? undefined : (val as CommunityCategory));
                    setMode('discover');
                  }}
                >
                  <SelectTrigger className="w-full rounded-xl bg-card border border-border h-10">
                    <SelectValue placeholder="Chọn chủ đề" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Tất cả chủ đề</SelectItem>
                    {COMMUNITY_CATEGORIES.map((item: CommunityCategory) => (
                      <SelectItem key={item} value={item}>
                        {CATEGORY_LABEL[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <div className="h-px bg-border" />

            <section className="flex flex-col gap-2">
              <h2 className="px-2 text-sm font-bold text-foreground">Nhóm do bạn quản lý</h2>
              {renderJoinedList(managedCommunities, 'Bạn chưa quản lý nhóm nào.')}
            </section>

            <div className="h-px bg-border" />

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 px-2">
                <h2 className="text-sm font-bold text-foreground">Nhóm bạn đã tham gia</h2>
                {!!memberCommunities.length && (
                  <Button variant="link" size="sm" onClick={() => setMode('joined')}>
                    Xem tất cả
                  </Button>
                )}
              </div>
              {renderJoinedList(memberCommunities.slice(0, 6), 'Bạn chưa tham gia nhóm nào.')}
            </section>
          </div>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex max-w-[1420px] flex-col gap-8">
            {/* Mobile Header (only visible on screens < lg) */}
            <div className="flex flex-col gap-4 border-b border-border pb-4 lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-foreground">Nhóm</h1>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    onClick={() => setDialogOpen(true)}
                    aria-label="Tạo cộng đồng mới"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-colors duration-200 rounded-xl cursor-pointer"
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button size="icon" variant="secondary" aria-label="Cài đặt nhóm">
                    <Settings className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm kiếm nhóm"
                  className="h-10 rounded-full bg-muted pl-9"
                />
              </div>

              {searchQuery.trim().length >= 2 && (
                <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2">
                  <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Kết quả tìm kiếm
                  </div>
                  {searchLoading ? (
                    <div className="flex flex-col gap-2 p-2">
                      <Skeleton className="h-12 rounded-xl" />
                      <Skeleton className="h-12 rounded-xl" />
                    </div>
                  ) : searchResults.length ? (
                    searchResults.map((group) => (
                      <SearchGroupRow key={group.groupId} group={group} />
                    ))
                  ) : (
                    <p className="px-2 pb-2 text-sm text-muted-foreground">
                      Không tìm thấy nhóm phù hợp.
                    </p>
                  )}
                </div>
              )}

              {/* Navigation and Category sliders */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = mode === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setMode(item.key)}
                        className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                        }`}
                      >
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex w-full mt-1">
                  <Select
                    value={category || 'all'}
                    onValueChange={(val) => {
                      setCategory(val === 'all' ? undefined : (val as CommunityCategory));
                      setMode('discover');
                    }}
                  >
                    <SelectTrigger className="w-full rounded-xl bg-background border border-border h-10">
                      <SelectValue placeholder="Chọn chủ đề" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Tất cả chủ đề</SelectItem>
                      {COMMUNITY_CATEGORIES.map((item: CommunityCategory) => (
                        <SelectItem key={item} value={item}>
                          {CATEGORY_LABEL[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {mode === 'discover' && (
              <>
                <CommunityGridSection
                  title={contentTitle}
                  description="Nhóm mà bạn có thể quan tâm."
                  communities={forYouCommunities}
                  dismissed={dismissedIds}
                  expanded={showAllForYou}
                  loading={isLoading}
                  joining={joinState.isLoading}
                  onToggleExpanded={() => setShowAllForYou((prev) => !prev)}
                  onDismiss={dismissCommunity}
                  onJoin={(groupId) => void handleJoin(groupId)}
                />

                <div className="h-px bg-border" />

                <CommunityGridSection
                  title="Gợi ý khác"
                  communities={otherCommunities}
                  dismissed={dismissedIds}
                  expanded={showAllOther}
                  loading={isLoading}
                  joining={joinState.isLoading}
                  onToggleExpanded={() => setShowAllOther((prev) => !prev)}
                  onDismiss={dismissCommunity}
                  onJoin={(groupId) => void handleJoin(groupId)}
                />
              </>
            )}

            {mode === 'joined' && (
              <section className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Nhóm của bạn</h2>
                  <p className="text-sm text-muted-foreground">
                    Tất cả nhóm bạn đang quản lý hoặc đã tham gia.
                  </p>
                </div>
                {joinedLoading ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-80 rounded-xl" />
                    ))}
                  </div>
                ) : joinedCommunities.length ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {joinedCommunities.map((community) => (
                      <CommunityDiscoveryCard
                        key={community.groupId}
                        community={community}
                        joining={joinState.isLoading}
                        onDismiss={() => dismissCommunity(community.groupId)}
                        onJoin={() => void handleJoin(community.groupId)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="Bạn chưa tham gia nhóm nào"
                    description="Khám phá các nhóm theo chủ đề để bắt đầu."
                  />
                )}
              </section>
            )}

            {mode === 'feed' && (
              <section className="flex flex-col gap-6 max-w-[680px] mx-auto w-full">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Bảng tin cộng đồng</h2>
                  <p className="text-sm text-muted-foreground">
                    Bài viết mới nhất từ các cộng đồng bạn đã tham gia.
                  </p>
                </div>

                {feedLoadingInitial ? (
                  <div className="flex flex-col gap-4">
                    <Skeleton className="h-64 rounded-2xl w-full" />
                    <Skeleton className="h-64 rounded-2xl w-full" />
                  </div>
                ) : feedPosts.length ? (
                  <div className="flex flex-col gap-4">
                    {feedPosts.map((post) => (
                      <PostCard key={post.postId} post={post} className="w-full max-w-full" />
                    ))}

                    {feedHasMore && (
                      <div ref={feedLoadMoreRef} className="flex justify-center p-4">
                        {feedFetchingNext ? (
                          <Loader2 className="animate-spin size-6 text-primary" />
                        ) : (
                          <span className="text-sm text-muted-foreground">Đang tải thêm...</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={Newspaper}
                    title="Chưa có bài viết nào"
                    description="Hãy tham gia các cộng đồng và cùng thảo luận với mọi người."
                  />
                )}
              </section>
            )}
          </div>
        </section>
      </div>

      <CommunityFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </main>
  );
}
export default CommunitiesList;
