import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  Crown,
  ShieldCheck,
  Sparkles,
  Pencil,
  Trash2,
  UserMinus,
  Globe2,
  Lock,
  Users,
  FileText,
  MoreHorizontal,
  Calendar,
  Tag,
  Link2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import type { RootState } from '@/store/store';
import { CreatePostModal } from '@/features/newsfeed/components/CreatePostModal';
import { PostCard } from '@/features/newsfeed/components/PostCard';
import {
  useGetCommunityQuery,
  useGetCommunityMembersQuery,
  useGetCommunityRequestsQuery,
  useGetCommunityPostsQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
  useArchiveCommunityMutation,
  useResolveCommunityRequestMutation,
  useRemoveCommunityMemberMutation,
  useUpdateCommunityMemberRoleMutation,
  useTransferCommunityOwnerMutation,
} from '@/store/api/communityApi';
import { usePostMultipleUsersMutation } from '@/store/api/userApi';

import type { CommunityMemberRole } from '@/types/community.types';
import type { IUser } from '@/types/user.types';

import defaultCoverGroup from '@/assets/images/cover-group-default.jpg';
import { CATEGORY_LABEL, ROLE_LABEL, EDITABLE_ROLES } from '../constants';
import { canManageCommunity, getInitials } from '../utils/helpers';
import { CommunityAvatar } from './CommunityAvatar';
import { CommunitySidebar } from './CommunitySidebar';
import { EmptyState } from './EmptyState';
import { CommunityFormDialog } from './CommunityFormDialog';

export function CommunityDetail({ groupId }: { groupId: string }) {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'leave' | 'archive' | null>(null);
  const [memberToKick, setMemberToKick] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const { data, isLoading, isError, error } = useGetCommunityQuery(groupId);
  const community = data?.data;
  const canManage = canManageCommunity(community?.viewerRole);
  const isOwner = community?.viewerRole === 'owner';
  const isMember = community?.viewerStatus === 'active';
  const { data: members } = useGetCommunityMembersQuery(groupId, { skip: !community });
  const { data: requests } = useGetCommunityRequestsQuery(groupId, { skip: !canManage });
  const { data: posts, isLoading: postsLoading } = useGetCommunityPostsQuery(
    { groupId, limit: 20 },
    { skip: !community },
  );
  const [joinCommunity, joinState] = useJoinCommunityMutation();
  const [leaveCommunity, leaveState] = useLeaveCommunityMutation();
  const [archiveCommunity, archiveState] = useArchiveCommunityMutation();
  const [resolveRequest, resolveState] = useResolveCommunityRequestMutation();
  const [removeMember, removeState] = useRemoveCommunityMemberMutation();
  const [updateRole, updateRoleState] = useUpdateCommunityMemberRoleMutation();
  const [transferOwner, transferState] = useTransferCommunityOwnerMutation();

  const handleResolveRequest = async (
    userId: string,
    action: 'approve' | 'reject',
  ): Promise<void> => {
    try {
      await resolveRequest({ groupId, userId, action }).unwrap();
      toast.success(
        action === 'approve' ? 'Đã duyệt yêu cầu gia nhập' : 'Đã từ chối yêu cầu gia nhập',
      );
    } catch {
      toast.error('Không thể xử lý yêu cầu gia nhập');
    }
  };

  const [fetchUsers] = usePostMultipleUsersMutation();
  const [userProfiles, setUserProfiles] = useState<Record<string, IUser>>({});

  useEffect(() => {
    const ids: string[] = [];
    if (members?.data) {
      members.data.forEach((m) => ids.push(m.userId));
    }
    if (requests?.data) {
      requests.data.forEach((r) => ids.push(r.userId));
    }
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length > 0) {
      fetchUsers({ userIds: uniqueIds })
        .unwrap()
        .then((res) => {
          const map: Record<string, IUser> = {};
          res.data.forEach((u) => {
            map[u.userId] = u;
          });
          setUserProfiles((prev) => ({ ...prev, ...map }));
        })
        .catch((err) => console.error('Error fetching user profiles:', err));
    }
  }, [members, requests, fetchUsers]);

  if (isLoading) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </main>
    );
  }

  if (isError || !community) {
    const status = (error as any)?.status;
    const message = (error as any)?.data?.message || '';

    let title = 'Không thể truy cập cộng đồng';
    let description = 'Đã xảy ra lỗi không xác định khi tải dữ liệu cộng đồng.';

    if (status === 404) {
      title = 'Cộng đồng không tồn tại';
      description = 'Cộng đồng này không tồn tại, đã bị xóa hoặc lưu trữ bởi ban quản trị.';
    } else if (status === 403) {
      title = 'Truy cập bị từ chối';
      description = message.includes('chặn')
        ? 'Bạn đã bị chặn khỏi cộng đồng này bởi ban quản trị.'
        : 'Cộng đồng này là riêng tư. Bạn cần là thành viên để xem nội dung.';
    }

    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 dark:bg-destructive/20 shadow-inner">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button variant="outline" className="gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
          <Button variant="default" className="gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" /> Tải lại trang
          </Button>
        </div>
      </main>
    );
  }

  const handleJoin = async (): Promise<void> => {
    try {
      const res = await joinCommunity({ groupId }).unwrap();
      toast.success(
        res.data.status === 'requested' ? 'Đã gửi yêu cầu tham gia' : 'Đã tham gia cộng đồng',
      );
    } catch {
      toast.error('Không thể tham gia cộng đồng');
    }
  };

  const handleConfirm = async (): Promise<void> => {
    try {
      if (confirmAction === 'leave') {
        await leaveCommunity(groupId).unwrap();
        toast.success('Đã rời cộng đồng');
      }
      if (confirmAction === 'archive') {
        await archiveCommunity(groupId).unwrap();
        toast.success('Đã lưu trữ cộng đồng');
      }
    } catch {
      toast.error(
        confirmAction === 'archive' ? 'Không thể lưu trữ cộng đồng' : 'Không thể rời cộng đồng',
      );
    } finally {
      setConfirmAction(null);
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <section className="overflow-hidden rounded-3xl border border-border/40 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] relative">
        <div className="relative h-60 w-full overflow-hidden bg-muted">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${community.coverUrl ?? defaultCoverGroup})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
        <div className="px-6 pb-6 pt-4 relative z-10 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              <div className="-mt-16 sm:-mt-20 z-20 shrink-0">
                <CommunityAvatar
                  community={community}
                  className="size-24 sm:size-28 rounded-full border-4 border-card bg-card shadow-2xl ring-4 ring-primary/5 transition-all duration-300 hover:ring-primary/20"
                />
              </div>
              <div className="min-w-0 text-center sm:text-left pb-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {community.name}
                  </h1>
                  <Badge className="bg-primary/10 hover:bg-primary/20 text-primary border-none font-bold">
                    {CATEGORY_LABEL[community.category]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-border/60 text-muted-foreground gap-1.5 bg-background/50 backdrop-blur-sm font-semibold"
                  >
                    {community.type === 'public' ? (
                      <Globe2 className="size-3.5 text-emerald-500" />
                    ) : (
                      <Lock className="size-3.5 text-amber-500" />
                    )}
                    {community.type === 'public' ? 'Công khai' : 'Riêng tư'}
                  </Badge>
                  {canManage && (
                    <Badge className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-none font-bold gap-1.5">
                      <ShieldCheck className="size-3.5" />
                      {ROLE_LABEL[community.viewerRole!]}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 shrink-0">
              {isMember ? (
                <Button
                  variant="secondary"
                  disabled
                  className="h-10 px-6 rounded-xl font-bold bg-muted text-muted-foreground transition-all duration-200 border border-border/40"
                >
                  Đã tham gia
                </Button>
              ) : (
                <Button
                  disabled={joinState.isLoading || community.joinRequestStatus === 'pending'}
                  onClick={() => void handleJoin()}
                  className="h-10 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/10 font-bold transition-all duration-200 cursor-pointer"
                >
                  {community.joinRequestStatus === 'pending' ? 'Đã gửi yêu cầu' : 'Tham gia'}
                </Button>
              )}

              {isMember && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl border-border/60 hover:bg-muted cursor-pointer flex items-center justify-center"
                    >
                      <MoreHorizontal className="size-5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-48 p-1.5 rounded-xl border border-border/60 bg-popover shadow-xl"
                    align="end"
                  >
                    <div className="flex flex-col gap-1">
                      {(community.viewerRole === 'owner' || community.viewerRole === 'admin') && (
                        <Button
                          variant="ghost"
                          onClick={() => setEditOpen(true)}
                          className="h-9 w-full justify-start px-3 rounded-lg text-xs font-bold gap-2 text-foreground cursor-pointer"
                        >
                          <Pencil className="size-4 text-slate-500" />
                          Chỉnh sửa nhóm
                        </Button>
                      )}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          onClick={() => setConfirmAction('archive')}
                          className="h-9 w-full justify-start px-3 rounded-lg text-xs font-bold gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                          Lưu trữ nhóm
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmAction('leave')}
                        disabled={isOwner}
                        className="h-9 w-full justify-start px-3 rounded-lg text-xs font-bold gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <UserMinus className="size-4" />
                        Rời cộng đồng
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border/20 pt-4 text-center sm:text-left">
            <p className="max-w-4xl text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {community.description || 'Cộng đồng chưa có mô tả.'}
            </p>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 font-semibold">
                  {community.type === 'public' ? (
                    <Globe2 className="size-4 text-slate-400" />
                  ) : (
                    <Lock className="size-4 text-slate-400" />
                  )}
                  <span>Nhóm {community.type === 'public' ? 'Công khai' : 'Riêng tư'}</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <Users className="size-4 text-slate-400" />
                  <span className="font-extrabold text-foreground">
                    {community.memberCount.toLocaleString('vi-VN')}
                  </span>{' '}
                  thành viên
                </div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <FileText className="size-4 text-slate-400" />
                  <span className="font-extrabold text-foreground">
                    {community.postCount.toLocaleString('vi-VN')}
                  </span>{' '}
                  bài viết
                </div>
              </div>

              {/* Member Avatar Pile */}
              {members?.data && members.data.length > 0 && (
                <div className="flex items-center justify-center sm:justify-start -space-x-2 overflow-hidden py-1">
                  {members.data.slice(0, 12).map((m) => {
                    const profile = userProfiles[m.userId];
                    const displayName = profile?.displayName ?? m.userId;
                    return (
                      <Avatar
                        key={m.userId}
                        className="size-8 border-2 border-card shadow-sm rounded-full overflow-hidden shrink-0 animate-in fade-in zoom-in duration-200"
                      >
                        <AvatarImage
                          src={profile?.avatar ?? undefined}
                          alt={displayName}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-[9px] font-extrabold bg-muted text-foreground flex items-center justify-center rounded-full">
                          {getInitials(displayName) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                  {members.data.length > 12 && (
                    <div className="size-8 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-extrabold text-slate-500 shadow-sm shrink-0">
                      +{members.data.length - 12}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <div className="w-full flex justify-start items-center border-b border-border/60 bg-transparent p-0 rounded-none h-auto gap-6 sm:gap-8 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`relative rounded-none border-b-[3px] px-1 pb-3 pt-2 text-sm font-bold transition-all cursor-pointer bg-transparent hover:bg-transparent ${
              activeTab === 'about'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Giới thiệu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`relative rounded-none border-b-[3px] px-1 pb-3 pt-2 text-sm font-bold transition-all cursor-pointer bg-transparent hover:bg-transparent ${
              activeTab === 'posts'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Thảo luận
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`relative rounded-none border-b-[3px] px-1 pb-3 pt-2 text-sm font-bold transition-all cursor-pointer bg-transparent hover:bg-transparent ${
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Mọi người
          </button>
          {canManage && community.joinPolicy === 'approval' && (
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`relative rounded-none border-b-[3px] px-1 pb-3 pt-2 text-sm font-bold transition-all cursor-pointer flex items-center gap-2 bg-transparent hover:bg-transparent ${
                activeTab === 'requests'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Yêu cầu duyệt
              {(requests?.data ?? []).length > 0 && (
                <span className="flex size-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-extrabold text-destructive-foreground">
                  {(requests?.data ?? []).length}
                </span>
              )}
            </button>
          )}
        </div>

        {activeTab === 'posts' && (
          <div className="m-0 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-4 min-w-0">
              {isMember && (
                <Card className="rounded-2xl border border-border/40 bg-card/65 backdrop-blur-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:border-primary/20 transition-all duration-300 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 border border-border/20 shadow-sm rounded-full overflow-hidden">
                      <AvatarImage
                        src={currentUser?.avatar || undefined}
                        alt={currentUser?.displayName || 'User avatar'}
                        className="rounded-full object-cover"
                      />
                      <AvatarFallback className="font-extrabold text-xs bg-primary/10 text-primary rounded-full">
                        {currentUser?.displayName ? getInitials(currentUser.displayName) : 'CĐ'}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      onClick={() => setPostModalOpen(true)}
                      className="flex-1 rounded-full bg-muted/50 hover:bg-muted/80 text-muted-foreground px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer border border-border/10 flex items-center"
                    >
                      Bạn đang nghĩ gì? Hãy chia sẻ điều gì đó với cộng đồng...
                    </div>
                  </div>
                </Card>
              )}

              {!isMember && community.type === 'private' ? (
                <EmptyState
                  icon={Lock}
                  title="Cộng đồng riêng tư"
                  description="Bạn cần là thành viên để xem bài viết."
                />
              ) : postsLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-40 rounded-2xl" />
                  <Skeleton className="h-40 rounded-2xl" />
                </div>
              ) : (posts?.data.items ?? []).length ? (
                posts!.data.items.map((post) => (
                  <PostCard key={post.postId} post={post} className="w-full max-w-full" />
                ))
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Chưa có bài viết"
                  description="Hãy mở đầu cuộc trò chuyện trong cộng đồng này."
                />
              )}
            </div>
            <div className="hidden lg:block">
              <CommunitySidebar
                community={community}
                members={members?.data}
                requests={requests?.data}
                userProfiles={userProfiles}
                isMember={isMember}
                canManage={canManage}
                onResolveRequest={handleResolveRequest}
                resolveLoading={resolveState.isLoading}
                onViewAllMembers={() => setActiveTab('members')}
              />
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="m-0">
            <Card className="rounded-2xl border border-border/40 bg-card/65 backdrop-blur-xl shadow-lg">
              <CardHeader className="px-4 py-3 border-b border-border/40">
                <CardTitle className="text-base font-extrabold text-foreground">
                  Thành viên ({members?.data?.length ?? community.memberCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-4">
                {(members?.data ?? []).map((member) => {
                  const profile = userProfiles[member.userId];
                  const displayName = profile?.displayName ?? member.userId;
                  const avatarUrl = profile?.avatar ?? undefined;
                  return (
                    <div
                      key={member.userId}
                      className="flex flex-col gap-4 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 hover:border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-10 border border-border/20 shadow-sm">
                          <AvatarImage src={avatarUrl} alt={displayName} />
                          <AvatarFallback className="font-bold text-xs">
                            {getInitials(displayName) || 'M'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-foreground text-sm">
                            {displayName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                            <span>Đã gia nhập:</span>
                            <strong className="text-foreground">
                              {new Date(member.joinedAt).toLocaleDateString('vi-VN')}
                            </strong>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Badge
                          variant={member.role === 'owner' ? 'default' : 'secondary'}
                          className="h-6 text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold shrink-0 shadow-sm"
                        >
                          {member.role === 'owner' && <Crown className="size-3 text-yellow-500" />}
                          {ROLE_LABEL[member.role]}
                        </Badge>
                        {isOwner && member.role !== 'owner' && (
                          <>
                            <Select
                              value={member.role}
                              onValueChange={(role) =>
                                updateRole({
                                  groupId,
                                  userId: member.userId,
                                  role: role as CommunityMemberRole,
                                })
                              }
                            >
                              <SelectTrigger className="h-8.5 w-32 rounded-lg border-border/60 bg-background/50 hover:bg-background transition-colors cursor-pointer text-xs font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {EDITABLE_ROLES.map((role) => (
                                  <SelectItem
                                    key={role}
                                    value={role}
                                    className="text-xs font-semibold cursor-pointer"
                                  >
                                    {ROLE_LABEL[role]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={transferState.isLoading}
                              onClick={() =>
                                transferOwner({ groupId, targetUserId: member.userId })
                              }
                              className="h-8.5 text-xs font-bold px-3 rounded-lg border-border/60 hover:bg-muted transition-colors duration-200 cursor-pointer"
                            >
                              Chuyển owner
                            </Button>
                          </>
                        )}
                        {canManage && member.role !== 'owner' && (
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            disabled={removeState.isLoading || updateRoleState.isLoading}
                            onClick={() => setMemberToKick(member.userId)}
                            aria-label="Xóa thành viên"
                            className="size-8.5 rounded-lg flex items-center justify-center hover:bg-destructive/90 transition-colors cursor-pointer shadow-sm shadow-destructive/10"
                          >
                            <UserMinus className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {canManage && community.joinPolicy === 'approval' && activeTab === 'requests' && (
          <div className="m-0">
            <Card className="rounded-2xl border border-border/40 bg-card/65 backdrop-blur-xl shadow-lg">
              <CardHeader className="px-4 py-3 border-b border-border/40">
                <CardTitle className="text-base font-extrabold text-foreground">
                  Yêu cầu gia nhập ({requests?.data?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3.5 p-4">
                {(requests?.data ?? []).length ? (
                  requests!.data.map((request) => {
                    const profile = userProfiles[request.userId];
                    const displayName = profile?.displayName ?? request.userId;
                    const avatarUrl = profile?.avatar ?? undefined;
                    return (
                      <div
                        key={request.userId}
                        className="flex flex-col gap-3 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 hover:border-border/80 p-4 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 border border-border/20 shadow-sm">
                            <AvatarImage src={avatarUrl} alt={displayName} />
                            <AvatarFallback className="font-bold text-xs">
                              {getInitials(displayName) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-bold text-foreground text-sm">
                              {displayName}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                              Muốn tham gia nhóm
                            </div>
                          </div>
                        </div>
                        {request.message && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 bg-muted/60 dark:bg-muted/30 rounded-xl p-3.5 leading-relaxed italic font-medium">
                            "{request.message}"
                          </p>
                        )}
                        <div className="mt-2 flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resolveState.isLoading}
                            onClick={() =>
                              resolveRequest({ groupId, userId: request.userId, action: 'reject' })
                            }
                            className="h-8.5 px-4 text-xs font-bold rounded-lg border-border/60 hover:bg-muted transition-colors duration-200 cursor-pointer"
                          >
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            disabled={resolveState.isLoading}
                            onClick={() =>
                              resolveRequest({ groupId, userId: request.userId, action: 'approve' })
                            }
                            className="h-8.5 px-4.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors duration-200 cursor-pointer border-none shadow-sm shadow-emerald-500/10"
                          >
                            Duyệt
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-12 font-medium">
                    Không có yêu cầu đang chờ duyệt.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="m-0 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-6 min-w-0">
              {/* Tổng quan nhóm Card */}
              <Card className="rounded-2xl border border-border/40 bg-card/65 backdrop-blur-xl shadow-lg hover:border-primary/10 transition-all duration-300">
                <CardHeader className="px-4 py-3 border-b border-border/40">
                  <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <Globe2 className="size-5 text-primary" />
                    Tổng quan cộng đồng
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Mô tả nhóm
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium whitespace-pre-wrap">
                      {community.description || 'Cộng đồng chưa có mô tả.'}
                    </p>
                  </div>

                  <div className="h-px bg-border/25" />

                  {/* Grid thông tin chi tiết */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/50 border border-border/20 hover:border-border/40 hover:bg-background/80 transition-all duration-200">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <Tag className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Danh mục
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {CATEGORY_LABEL[community.category]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/50 border border-border/20 hover:border-border/40 hover:bg-background/80 transition-all duration-200">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        {community.type === 'public' ? (
                          <Globe2 className="size-4" />
                        ) : (
                          <Lock className="size-4" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Quyền riêng tư
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {community.type === 'public' ? 'Công khai' : 'Riêng tư'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/50 border border-border/20 hover:border-border/40 hover:bg-background/80 transition-all duration-200">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <Calendar className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Ngày thành lập
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {new Date(community.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/50 border border-border/20 hover:border-border/40 hover:bg-background/80 transition-all duration-200">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <Link2 className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Slug nhóm
                        </span>
                        <span className="text-sm font-bold text-foreground truncate max-w-[180px]">
                          {community.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/50 border border-border/20 hover:border-border/40 hover:bg-background/80 transition-all duration-200">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <Users className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Chế độ tham gia
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {community.joinPolicy === 'open'
                            ? 'Tham gia trực tiếp'
                            : 'Cần quản trị viên duyệt'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/50 border border-border/20 hover:border-border/40 hover:bg-background/80 transition-all duration-200">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Tìm kiếm nhóm
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {community.type === 'public'
                            ? 'Hiển thị công khai'
                            : 'Chỉ thành viên qua link'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Thống kê hoạt động */}
              <Card className="rounded-2xl border border-border/40 bg-card/65 backdrop-blur-xl shadow-lg hover:border-primary/10 transition-all duration-300">
                <CardHeader className="px-4 py-3 border-b border-border/40">
                  <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <Users className="size-5 text-primary" />
                    Thống kê hoạt động
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center p-3.5 bg-background/50 rounded-xl border border-border/10">
                    <span className="text-2xl font-extrabold text-foreground">
                      {community.memberCount.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
                      Thành viên
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3.5 bg-background/50 rounded-xl border border-border/10">
                    <span className="text-2xl font-extrabold text-foreground">
                      {community.postCount.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
                      Bài viết
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Nội quy cộng đồng Card */}
              <Card className="rounded-2xl border border-border/40 bg-card/65 backdrop-blur-xl shadow-lg hover:border-primary/10 transition-all duration-300">
                <CardHeader className="px-4 py-3 border-b border-border/40">
                  <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    Nội quy cộng đồng
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3.5 p-4">
                  {community.rules?.length ? (
                    community.rules.map((rule, index) => (
                      <div
                        key={rule.id}
                        className="rounded-xl border border-border/40 p-4 bg-background/40 hover:bg-background/80 hover:border-primary/20 transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">
                            #{String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="font-bold text-foreground text-sm">{rule.title}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap font-medium">
                          {rule.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center font-medium">
                      Cộng đồng chưa có nội quy riêng.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="hidden lg:block">
              <CommunitySidebar
                community={community}
                members={members?.data}
                requests={requests?.data}
                userProfiles={userProfiles}
                isMember={isMember}
                canManage={canManage}
                onResolveRequest={handleResolveRequest}
                resolveLoading={resolveState.isLoading}
                onViewAllMembers={() => setActiveTab('members')}
              />
            </div>
          </div>
        )}
      </div>

      <CommunityFormDialog
        community={community}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
      <CreatePostModal
        isOpen={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        communityGroupId={groupId}
      />
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'archive' ? 'Lưu trữ cộng đồng?' : 'Rời cộng đồng?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'archive'
                ? 'Cộng đồng sẽ không xuất hiện trong discovery và slug không được tái sử dụng.'
                : 'Bạn sẽ mất quyền đăng bài trong cộng đồng này. Owner cần chuyển quyền trước khi rời.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmAction === 'archive' ? 'destructive' : 'default'}
              disabled={leaveState.isLoading || archiveState.isLoading}
              onClick={() => void handleConfirm()}
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={memberToKick !== null}
        onOpenChange={(open) => !open && setMemberToKick(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thành viên khỏi nhóm?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa thành viên{' '}
              {userProfiles[memberToKick ?? '']?.displayName ?? memberToKick} khỏi cộng đồng này
              không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeState.isLoading}
              onClick={async () => {
                if (memberToKick) {
                  try {
                    await removeMember({ groupId, userId: memberToKick }).unwrap();
                    toast.success('Đã xóa thành viên khỏi nhóm');
                  } catch {
                    toast.error('Không thể xóa thành viên');
                  } finally {
                    setMemberToKick(null);
                  }
                }
              }}
            >
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
export default CommunityDetail;
