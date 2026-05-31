import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CalendarDays,
  Check,
  Grid3X3,
  Heart,
  List,
  Loader2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreatePostModal } from '@/features/newsfeed/components/CreatePostModal';
import { CreatePostPromptCard } from '@/features/newsfeed/components/CreatePostPromptCard';
import { PostCard } from '@/features/newsfeed/components/PostCard';
import { CreateReelModal } from '@/features/reels/components/CreateReelModal';
import { useGetPostsByAuthorQuery, useGetReelsByAuthorQuery } from '@/store/api/newsfeedApi';
import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useGetFriendRequestStatusQuery,
  useGetFriendsQuery,
  useGetUserByIdQuery,
  useRemoveFriendMutation,
  useSendFriendRequestMutation,
} from '@/store/api/userApi';
import type { RootState } from '@/store/store';
import type { IPost } from '@/types/newsfeed.types';

type ProfileTab = 'posts' | 'about' | 'reels' | 'photos' | 'friends';

interface PublicProfilePageProps {
  userId: string;
}

const getInitials = (name?: string | null): string => {
  const value = name?.trim() || 'U';
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const formatJoinDate = (value?: string | null): string => {
  if (!value) return 'Chưa có thông tin';
  return new Date(value).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  });
};

export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ userId }) => {
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isSelf = currentUser?.userId === userId;
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<IPost | undefined>(undefined);

  const { data: profileRes, isLoading, isError } = useGetUserByIdQuery(userId);
  const { data: postsRes, isLoading: postsLoading } = useGetPostsByAuthorQuery({
    authorId: userId,
    limit: 20,
  });
  const { data: reelsRes, isLoading: reelsLoading } = useGetReelsByAuthorQuery({
    authorId: userId,
    limit: 12,
  });
  const { data: friendsRes, isLoading: friendsLoading } = useGetFriendsQuery(
    { limit: 9, offset: 0 },
    { skip: !isSelf },
  );
  const { data: friendStatusRes } = useGetFriendRequestStatusQuery(
    { userId },
    { skip: isSelf || !userId },
  );

  const [sendFriendRequest, { isLoading: sendingRequest }] = useSendFriendRequestMutation();
  const [cancelFriendRequest, { isLoading: cancellingRequest }] = useCancelFriendRequestMutation();
  const [acceptFriendRequest, { isLoading: acceptingRequest }] = useAcceptFriendRequestMutation();
  const [removeFriend, { isLoading: removingFriend }] = useRemoveFriendMutation();

  const profile = profileRes?.data;
  const posts = postsRes?.data.items ?? [];
  const reels = reelsRes?.data.items ?? [];
  const friends = friendsRes?.data ?? [];
  const mediaUrls = useMemo(
    () => posts.flatMap((post) => post.mediaUrls ?? []).slice(0, 12),
    [posts],
  );
  const friendStatus = friendStatusRes?.data.status ?? 'none';
  const actionLoading = sendingRequest || cancellingRequest || acceptingRequest || removingFriend;
  const createPostName = currentUser?.displayName?.trim() || 'Bạn';
  const createPostAvatar = currentUser?.avatar || '';
  const createPostInitial = createPostName.charAt(0).toUpperCase() || 'U';

  const handleFriendAction = async (): Promise<void> => {
    if (isSelf || actionLoading) return;

    if (friendStatus === 'friend') {
      await removeFriend({ friendId: userId }).unwrap();
      return;
    }
    if (friendStatus === 'pending_sent') {
      await cancelFriendRequest({ friendId: userId }).unwrap();
      return;
    }
    if (friendStatus === 'pending_received') {
      await acceptFriendRequest({ senderId: userId }).unwrap();
      return;
    }
    await sendFriendRequest({ friendId: userId }).unwrap();
  };

  const friendActionLabel =
    friendStatus === 'friend'
      ? 'Bạn bè'
      : friendStatus === 'pending_sent'
        ? 'Đã gửi lời mời'
        : friendStatus === 'pending_received'
          ? 'Chấp nhận'
          : 'Thêm bạn bè';

  if (isLoading) {
    return (
      <div className="min-h-[calc(100dvh-64px)] bg-slate-100">
        <div className="mx-auto max-w-[1180px] px-4 py-6">
          <Skeleton className="h-72 w-full rounded-b-lg rounded-t-none" />
          <div className="mt-6 flex items-end gap-4">
            <Skeleton className="size-36 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-slate-100 p-4">
        <div className="text-center">
          <X className="mx-auto mb-3 size-10 text-red-500" />
          <h1 className="text-xl font-bold text-slate-900">Không thể tải hồ sơ</h1>
          <p className="mt-1 text-sm text-slate-500">Người dùng không tồn tại hoặc đã bị ẩn.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'posts', label: 'Tất cả' },
    { key: 'about', label: 'Giới thiệu' },
    { key: 'reels', label: 'Reels' },
    { key: 'photos', label: 'Ảnh' },
    { key: 'friends', label: 'Bạn bè' },
  ];

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-slate-100 text-slate-950">
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-[1180px] px-4">
          <div className="h-56 overflow-hidden rounded-b-lg bg-gradient-to-r from-cyan-500 via-slate-950 to-blue-500 sm:h-72">
            <div className="h-full w-full bg-[radial-gradient(circle_at_15%_0%,rgba(45,212,191,0.55),transparent_26%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.55),transparent_28%)]" />
          </div>

          <div className="relative flex flex-col gap-4 border-b border-slate-200 pb-5 pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="-mt-20 size-36 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-sm sm:size-40">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-500">
                    {getInitials(profile.displayName)}
                  </div>
                )}
              </div>
              <div className="pb-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                  {profile.displayName}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  {profile.bio || 'Chưa có tiểu sử.'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-4" />
                    {isSelf ? `${friends.length} bạn bè` : 'Hồ sơ cá nhân'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-4" />
                    {posts.length} bài viết
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:pb-4">
              {isSelf ? (
                <Button onClick={() => navigate('/profile')} className="gap-2">
                  <Pencil className="size-4" />
                  Chỉnh sửa hồ sơ
                </Button>
              ) : (
                <>
                  <Button onClick={handleFriendAction} disabled={actionLoading} className="gap-2">
                    {actionLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : friendStatus === 'friend' ? (
                      <Check className="size-4" />
                    ) : friendStatus === 'pending_sent' ? (
                      <UserMinus className="size-4" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}
                    {friendActionLabel}
                  </Button>
                  <Button variant="secondary" className="gap-2" onClick={() => navigate('/chat')}>
                    <MessageCircle className="size-4" />
                    Nhắn tin
                  </Button>
                </>
              )}
              <Button size="icon" variant="secondary" aria-label="Thêm tùy chọn">
                <MoreHorizontal className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <nav className="flex min-w-0 gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-4 py-4 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? 'text-blue-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute inset-x-2 bottom-0 h-1 rounded-t-full bg-blue-600" />
                  )}
                </button>
              ))}
            </nav>
            <Button size="icon" variant="ghost" className="shrink-0" aria-label="Tùy chọn hồ sơ">
              <MoreHorizontal className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-[1180px] gap-4 px-4 py-4 lg:grid-cols-[440px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold">Thông tin cá nhân</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p className="flex items-center gap-3">
                <Briefcase className="size-5 text-slate-500" />
                Thành viên Zalogram
              </p>
              <p className="flex items-center gap-3">
                <MapPin className="size-5 text-slate-500" />
                Việt Nam
              </p>
              <p className="flex items-center gap-3">
                <CalendarDays className="size-5 text-slate-500" />
                Tham gia{' '}
                {formatJoinDate(currentUser?.userId === userId ? currentUser?.createdAt : null)}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Ảnh</h2>
              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Xem tất cả ảnh
              </button>
            </div>
            {mediaUrls.length ? (
              <div className="grid grid-cols-3 gap-2">
                {mediaUrls.slice(0, 9).map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="aspect-square rounded-md object-cover"
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500">
                Chưa có ảnh
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Bạn bè</h2>
                <p className="text-sm text-slate-500">
                  {isSelf ? `${friends.length} người bạn` : 'Chỉ hiển thị với chủ hồ sơ'}
                </p>
              </div>
              {isSelf && (
                <button
                  type="button"
                  onClick={() => setActiveTab('friends')}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Xem tất cả bạn bè
                </button>
              )}
            </div>
            {friendsLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : isSelf && friends.length ? (
              <div className="grid grid-cols-3 gap-2">
                {friends.slice(0, 9).map((friend) => (
                  <button
                    key={friend.userId}
                    type="button"
                    onClick={() => navigate(`/profile/${friend.userId}`)}
                    className="text-left"
                  >
                    <div className="aspect-square overflow-hidden rounded-md bg-slate-200">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-500">
                          {getInitials(friend.displayName)}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold">{friend.displayName}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500">
                Chưa có dữ liệu bạn bè
              </div>
            )}
          </section>
        </aside>

        <section className="space-y-4">
          {activeTab === 'posts' && (
            <>
              {isSelf && (
                <CreatePostPromptCard
                  createPostName={createPostName}
                  createPostAvatar={createPostAvatar}
                  createPostInitial={createPostInitial}
                  onCreatePost={() => {
                    setEditingPost(undefined);
                    setIsCreatePostOpen(true);
                  }}
                  onCreateReel={() => setIsCreateReelOpen(true)}
                />
              )}

              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between p-3">
                  <h2 className="text-lg font-bold">Bài viết</h2>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary">
                      Bộ lọc
                    </Button>
                    {isSelf && (
                      <Button size="sm" variant="secondary">
                        Quản lý bài viết
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 border-t border-slate-200 text-sm font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center justify-center gap-2 py-3 ${
                      viewMode === 'list' ? 'border-b-2 border-blue-600 text-blue-600' : ''
                    }`}
                  >
                    <List className="size-4" />
                    Chế độ xem danh sách
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center justify-center gap-2 py-3 ${
                      viewMode === 'grid' ? 'border-b-2 border-blue-600 text-blue-600' : ''
                    }`}
                  >
                    <Grid3X3 className="size-4" />
                    Chế độ xem lưới
                  </button>
                </div>
              </section>

              {postsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-64 rounded-lg" />
                  <Skeleton className="h-64 rounded-lg" />
                </div>
              ) : posts.length ? (
                viewMode === 'list' ? (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <PostCard
                        key={post.postId}
                        post={post}
                        onEditPost={(nextPost) => {
                          setEditingPost(nextPost);
                          setIsCreatePostOpen(true);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {posts.map((post) => (
                      <button
                        key={post.postId}
                        type="button"
                        className="aspect-square overflow-hidden rounded-lg bg-white text-left shadow-sm"
                      >
                        {post.mediaUrls?.[0] ? (
                          <img
                            src={post.mediaUrls[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-slate-600">
                            {post.content}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                  Chưa có bài viết nào để hiển thị.
                </div>
              )}
            </>
          )}

          {activeTab === 'about' && (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">Giới thiệu</h2>
              <p className="mt-4 text-slate-700">{profile.bio || 'Chưa có tiểu sử.'}</p>
            </section>
          )}

          {activeTab === 'reels' && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Reels</h2>
                {isSelf && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCreateReelOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="size-4" />
                    Tạo Reel
                  </Button>
                )}
              </div>
              {reelsLoading ? (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="aspect-[9/16] rounded-lg" />
                  ))}
                </div>
              ) : reels.length ? (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {reels.map((reel) => (
                    <div
                      key={reel.reelId}
                      className="aspect-[9/16] overflow-hidden rounded-lg bg-slate-900"
                    >
                      {reel.thumbnailUrl ? (
                        <img
                          src={reel.thumbnailUrl}
                          alt={reel.caption}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <video src={reel.videoUrl} className="h-full w-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-md bg-slate-100 p-6 text-center text-sm text-slate-500">
                  Chưa có reel nào.
                </p>
              )}
            </section>
          )}

          {activeTab === 'photos' && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-xl font-bold">Ảnh</h2>
              {mediaUrls.length ? (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {mediaUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="aspect-square rounded-lg object-cover"
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-md bg-slate-100 p-6 text-center text-sm text-slate-500">
                  Chưa có ảnh.
                </p>
              )}
            </section>
          )}

          {activeTab === 'friends' && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-xl font-bold">Bạn bè</h2>
              {isSelf && friends.length ? (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {friends.map((friend) => (
                    <button
                      key={friend.userId}
                      type="button"
                      onClick={() => navigate(`/profile/${friend.userId}`)}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"
                    >
                      <div className="size-14 overflow-hidden rounded-lg bg-slate-200">
                        {friend.avatar ? (
                          <img
                            src={friend.avatar}
                            alt={friend.displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-bold text-slate-500">
                            {getInitials(friend.displayName)}
                          </div>
                        )}
                      </div>
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {friend.displayName}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-md bg-slate-100 p-6 text-center text-sm text-slate-500">
                  Chưa có dữ liệu bạn bè.
                </p>
              )}
            </section>
          )}
        </section>
      </main>

      {isSelf && (
        <>
          <CreatePostModal
            isOpen={isCreatePostOpen}
            onClose={() => {
              setIsCreatePostOpen(false);
              setEditingPost(undefined);
            }}
            editingPost={editingPost}
          />
          <CreateReelModal isOpen={isCreateReelOpen} onClose={() => setIsCreateReelOpen(false)} />
        </>
      )}
    </div>
  );
};

export default PublicProfilePage;
