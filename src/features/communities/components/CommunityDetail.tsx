import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  Crown,
  ShieldCheck,
  Sparkles,
  Pencil,
  Trash2,
  UserMinus,
  UserPlus,
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
  Flag,
  Image as ImageIcon,
  History,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Pin,
  PinOff,
  Settings,
  MessageSquare,
  Loader2,
  X,
  BarChart2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

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
  useGetPendingPostsQuery,
  useResolvePendingPostMutation,
  useGetCommunityModerationLogsQuery,
  useJoinCommunityChatMutation,
  useUnlinkChatMutation,
  useGetCommunityReportsQuery,
  useResolveCommunityReportMutation,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useGetCommunityAutoModQuery,
  useUpdateCommunityAutoModMutation,
} from '@/store/api/communityApi';
import { usePostMultipleUsersMutation } from '@/store/api/userApi';
import { MediaGallery } from '@/features/newsfeed/components/MediaGallery';
import { extractTextFromTiptapJson } from '@/utils/tiptapText';
import CommunityAnalytics from './CommunityAnalytics';

import type {
  CommunityMemberRole,
  ICommunityModerationLog,
  ICommunityReport,
} from '@/types/community.types';
import type { IUser } from '@/types/user.types';

import defaultCoverGroup from '@/assets/images/cover-group-default.jpg';
import { CATEGORY_LABEL, ROLE_LABEL, EDITABLE_ROLES } from '../constants';
import { canManageCommunity, getInitials } from '../utils/helpers';
import { CommunityAvatar } from './CommunityAvatar';
import { CommunitySidebar } from './CommunitySidebar';
import { EmptyState } from './EmptyState';
import { CommunityFormDialog } from './CommunityFormDialog';
import { CommunityReportDialog } from './CommunityReportDialog';
import { InviteFriendsDialog } from './InviteFriendsDialog';

export function CommunityDetail({ groupId }: { groupId: string }) {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const location = useLocation();

  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'leave' | 'archive' | null>(null);
  const [memberToKick, setMemberToKick] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [reportOpen, setReportOpen] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);

  const [joinCommunityChat, { isLoading: joinChatLoading }] = useJoinCommunityChatMutation();
  const [unlinkChat, { isLoading: unlinkChatLoading }] = useUnlinkChatMutation();

  const [rejectPostId, setRejectPostId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [transferTarget, setTransferTarget] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);
  const [confirmGroupNameInput, setConfirmGroupNameInput] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data, isLoading, isError, error } = useGetCommunityQuery(groupId);
  const community = data?.data;
  const canManage = canManageCommunity(community?.viewerRole);

  const [acceptInvitation, { isLoading: acceptLoading }] = useAcceptInvitationMutation();
  const [declineInvitation, { isLoading: declineLoading }] = useDeclineInvitationMutation();

  const handleAcceptInvite = async () => {
    try {
      await acceptInvitation(groupId).unwrap();
      toast.success('Chào mừng bạn đến với cộng đồng!');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể chấp nhận lời mời');
    }
  };

  const handleDeclineInvite = async () => {
    try {
      await declineInvitation(groupId).unwrap();
      toast.success('Đã từ chối lời mời');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể từ chối lời mời');
    }
  };

  const { data: pendingPostsRes } = useGetPendingPostsQuery(groupId, { skip: !canManage });
  const pendingPosts = pendingPostsRes || [];
  const pendingPostsCount = pendingPosts.length;

  const [resolvePendingPost, { isLoading: resolvePendingLoading }] =
    useResolvePendingPostMutation();

  const { data: reportsRes } = useGetCommunityReportsQuery({ groupId }, { skip: !canManage });
  const reportsData = reportsRes?.data?.items || [];
  const pendingReportsCount = reportsData.filter((r) => r.status === 'pending').length;

  const [resolveReport, { isLoading: resolveReportLoading }] = useResolveCommunityReportMutation();
  const isOwner = community?.viewerRole === 'owner';
  const isMember = community?.viewerStatus === 'active';
  const canInvite =
    community?.type === 'public'
      ? isMember
      : ['owner', 'admin', 'moderator'].includes(community?.viewerRole || '');
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
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  const memberData = members?.data;
  const requestData = requests?.data;
  const pendingPostsData = pendingPostsRes;

  useEffect(() => {
    const ids: string[] = [];
    if (memberData) {
      memberData.forEach((m) => ids.push(m.userId));
    }
    if (requestData) {
      requestData.forEach((r) => ids.push(r.userId));
    }
    if (pendingPostsData) {
      pendingPostsData.forEach((p) => ids.push(p.authorId));
    }
    if (reportsData) {
      reportsData.forEach((r) => {
        if (r.reporterId) ids.push(r.reporterId);
        if (r.targetAuthorId) ids.push(r.targetAuthorId);
      });
    }
    const uniqueIds = Array.from(new Set(ids));
    const missingIds = uniqueIds.filter((id) => !fetchedIdsRef.current.has(id));

    if (missingIds.length > 0) {
      missingIds.forEach((id) => fetchedIdsRef.current.add(id));
      fetchUsers({ userIds: missingIds })
        .unwrap()
        .then((res) => {
          const map: Record<string, IUser> = {};
          res.data.forEach((u) => {
            map[u.userId] = u;
          });
          setUserProfiles((prev) => ({ ...prev, ...map }));
        })
        .catch((err) => {
          console.error('Error fetching user profiles:', err);
          missingIds.forEach((id) => fetchedIdsRef.current.delete(id));
        });
    }
  }, [memberData, requestData, pendingPostsData, fetchUsers]);

  // Auto-join community chat if joinChat=true query param is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('joinChat') === 'true' && community?.chatEnabled && isMember) {
      const performAutoJoin = async () => {
        try {
          const res = await joinCommunityChat({ groupId }).unwrap();
          const conversationId = res?.data?.conversationId || community?.conversationId;
          if (conversationId) {
            navigate(`/chat/${encodeURIComponent(conversationId)}`, { replace: true });
          }
        } catch (err: any) {
          toast.error(err?.data?.message || 'Không thể tự động tham gia phòng chat');
        }
      };
      void performAutoJoin();
    }
  }, [
    location.search,
    community?.chatEnabled,
    community?.conversationId,
    isMember,
    groupId,
    joinCommunityChat,
    navigate,
  ]);

  const handleJoinChat = async () => {
    if (!community || !community.chatEnabled) return;
    try {
      const res = await joinCommunityChat({ groupId }).unwrap();
      const conversationId = res?.data?.conversationId || community?.conversationId;
      if (conversationId) {
        navigate(`/chat/${encodeURIComponent(conversationId)}`);
      } else {
        toast.error('Không tìm thấy phòng trò chuyện');
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể tham gia phòng chat');
    }
  };

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

  const handleShortcutClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setStagedFiles(Array.from(e.target.files));
      setPostModalOpen(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setStagedFiles(Array.from(e.dataTransfer.files));
      setPostModalOpen(true);
    }
  };

  const scrollToRules = () => {
    const element = document.getElementById('community-rules-card');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      setActiveTab('about');
      setTimeout(() => {
        const el = document.getElementById('community-rules-card');
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  const handleApprovePost = async (postId: string) => {
    try {
      await resolvePendingPost({ groupId, postId, action: 'approve' }).unwrap();
      toast.success('Đã duyệt bài viết thành công');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể duyệt bài viết');
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      {community?.viewerInviteStatus === 'pending' && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 backdrop-blur-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-blue-500/5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400">
              <Sparkles className="size-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Bạn nhận được lời mời tham gia!
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                Bạn đã được mời tham gia cộng đồng này. Hãy tham gia ngay để bắt đầu chia sẻ ý tưởng
                và thảo luận cùng mọi người.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="ghost"
              onClick={handleDeclineInvite}
              disabled={declineLoading || acceptLoading}
              className="h-10 px-5 rounded-xl font-bold hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
              {declineLoading ? <Loader2 className="size-4 animate-spin" /> : 'Từ chối'}
            </Button>
            <Button
              onClick={handleAcceptInvite}
              disabled={declineLoading || acceptLoading}
              className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 font-bold transition-all duration-200 cursor-pointer"
            >
              {acceptLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Đang đồng ý...
                </>
              ) : (
                'Đồng ý tham gia'
              )}
            </Button>
          </div>
        </div>
      )}

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
              {isMember && community.chatEnabled && (
                <Button
                  onClick={() => void handleJoinChat()}
                  disabled={joinChatLoading}
                  className="h-10 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/10 font-bold transition-all duration-200 cursor-pointer gap-2"
                >
                  <MessageSquare className="size-4.5" />
                  Trò chuyện
                </Button>
              )}
              {canInvite && (
                <Button
                  onClick={() => setInviteOpen(true)}
                  className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/10 font-bold transition-all duration-200 cursor-pointer gap-2"
                >
                  <UserPlus className="size-4.5" />
                  Mời bạn bè
                </Button>
              )}
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
                    {isMember &&
                      (community.viewerRole === 'owner' || community.viewerRole === 'admin') && (
                        <Button
                          variant="ghost"
                          onClick={() => setEditOpen(true)}
                          className="h-9 w-full justify-start px-3 rounded-lg text-xs font-bold gap-2 text-foreground cursor-pointer"
                        >
                          <Pencil className="size-4 text-slate-500" />
                          Chỉnh sửa nhóm
                        </Button>
                      )}
                    {isOwner && community.conversationId && (
                      <Button
                        variant="ghost"
                        onClick={() => setUnlinkConfirmOpen(true)}
                        className="h-9 w-full justify-start px-3 rounded-lg text-xs font-bold gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <MessageSquare className="size-4 text-destructive" />
                        Giải tán phòng chat
                      </Button>
                    )}
                    {isMember && isOwner && (
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmAction('archive')}
                        className="h-9 w-full justify-start px-3 rounded-lg text-xs font-bold gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                        Lưu trữ nhóm
                      </Button>
                    )}
                    {isMember && (
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmAction('leave')}
                        disabled={isOwner}
                        className="h-9 w-full justify-start px-3 rounded-lg text-xs font-bold gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <UserMinus className="size-4" />
                        Rời cộng đồng
                      </Button>
                    )}
                    {!isOwner && (
                      <Button
                        variant="ghost"
                        onClick={() => setReportOpen(true)}
                        className="h-9 w-full justify-start px-3 rounded-lg text-xs font-bold gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Flag className="size-4 text-red-500" />
                        Báo cáo cộng đồng
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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
          {canManage && (
            <button
              type="button"
              onClick={() => setActiveTab('moderation')}
              className={`relative rounded-none border-b-[3px] px-1 pb-3 pt-2 text-sm font-bold transition-all cursor-pointer flex items-center gap-2 bg-transparent hover:bg-transparent ${
                activeTab === 'moderation'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Duyệt bài viết
              {pendingPostsCount > 0 && (
                <span className="flex size-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-extrabold text-destructive-foreground animate-pulse">
                  {pendingPostsCount}
                </span>
              )}
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setActiveTab('moderation-logs')}
              className={`relative rounded-none border-b-[3px] px-1 pb-3 pt-2 text-sm font-bold transition-all cursor-pointer flex items-center gap-2 bg-transparent hover:bg-transparent ${
                activeTab === 'moderation-logs'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <History className="size-4" />
              Nhật ký kiểm duyệt
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`relative rounded-none border-b-[3px] px-1 pb-3 pt-2 text-sm font-bold transition-all cursor-pointer flex items-center gap-2 bg-transparent hover:bg-transparent ${
                activeTab === 'reports'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Flag className="size-4" />
              Báo cáo vi phạm
              {pendingReportsCount > 0 && (
                <span className="flex size-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-extrabold text-destructive-foreground animate-pulse">
                  {pendingReportsCount}
                </span>
              )}
            </button>
          )}
          {canManage &&
            (community?.viewerRole === 'owner' || community?.viewerRole === 'admin') && (
              <button
                type="button"
                onClick={() => setActiveTab('automod')}
                className={`relative rounded-none border-b-[3px] px-1 pb-3 pt-2 text-sm font-bold transition-all cursor-pointer flex items-center gap-2 bg-transparent hover:bg-transparent ${
                  activeTab === 'automod'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="size-4" />
                Bộ lọc từ khóa
              </button>
            )}
          {canManage && (
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`relative rounded-none border-b-[3px] px-1 pb-3 pt-2 text-sm font-bold transition-all cursor-pointer flex items-center gap-2 bg-transparent hover:bg-transparent ${
                activeTab === 'analytics'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BarChart2 className="size-4" />
              Thống kê
            </button>
          )}
        </div>

        {activeTab === 'posts' && (
          <div className="m-0 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-4 min-w-0">
              {isMember && (
                <Card
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative rounded-2xl border bg-card/65 backdrop-blur-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 flex flex-col gap-3.5 ${
                    isDragging
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border/40 hover:border-primary/20'
                  }`}
                >
                  {isDragging && (
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl flex items-center justify-center border-2 border-dashed border-primary z-20 pointer-events-none animate-pulse">
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="size-10 text-primary animate-bounce" />
                        <span className="text-xs font-bold text-primary">
                          Thả ảnh/video tại đây để đăng bài...
                        </span>
                      </div>
                    </div>
                  )}
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
                      onClick={() => {
                        setStagedFiles([]);
                        setPostModalOpen(true);
                      }}
                      className="flex-1 rounded-full bg-muted/50 hover:bg-muted/80 text-muted-foreground px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer border border-border/10 flex items-center"
                    >
                      Bạn đang nghĩ gì? Hãy chia sẻ điều gì đó với cộng đồng...
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/25 pt-2.5 px-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleShortcutClick}
                        className="h-8.5 rounded-lg text-xs font-bold gap-2 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                      >
                        <ImageIcon className="size-4 text-emerald-500" />
                        Ảnh/Video
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setStagedFiles([]);
                          setPostModalOpen(true);
                        }}
                        className="h-8.5 rounded-lg text-xs font-bold gap-2 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                      >
                        <Tag className="size-4 text-sky-500" />
                        Gắn thẻ
                      </Button>
                    </div>

                    {community.rules && community.rules.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={scrollToRules}
                        className="h-8.5 rounded-lg text-xs font-bold gap-2 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                      >
                        <ShieldCheck className="size-4 text-amber-500" />
                        Nội quy nhóm
                      </Button>
                    )}
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
                  <PostCard
                    key={post.postId}
                    post={post}
                    className="w-full max-w-full"
                    communityRole={community?.viewerRole}
                  />
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
                              onValueChange={(role: string) =>
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
                                setTransferTarget({
                                  userId: member.userId,
                                  displayName: displayName,
                                })
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
              <Card
                id="community-rules-card"
                className="rounded-2xl border border-border/40 bg-card/65 backdrop-blur-xl shadow-lg hover:border-primary/10 transition-all duration-300"
              >
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
      <CommunityReportDialog
        groupId={groupId}
        entityId={groupId}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
      <CreatePostModal
        isOpen={postModalOpen}
        onClose={() => {
          setPostModalOpen(false);
          setStagedFiles([]);
        }}
        communityGroupId={groupId}
        initialFiles={stagedFiles}
      />

      {canManage && activeTab === 'moderation' && (
        <div className="m-0 max-w-4xl mx-auto flex flex-col gap-6">
          <Card className="rounded-2xl border border-border/40 bg-card/65 backdrop-blur-xl shadow-lg">
            <CardHeader className="px-4 py-3 border-b border-border/40 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                Hàng đợi kiểm duyệt bài viết ({pendingPostsCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4.5 p-4">
              {pendingPosts.length > 0 ? (
                pendingPosts.map((post) => {
                  const profile = userProfiles[post.authorId];
                  const displayName = profile?.displayName ?? post.authorId;
                  const avatarUrl = profile?.avatar ?? undefined;
                  const postText = extractTextFromTiptapJson(post.content);

                  return (
                    <Card
                      key={post.postId}
                      className="rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 hover:border-border/80 p-5 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 border border-border/20 shadow-sm">
                            <AvatarImage src={avatarUrl} alt={displayName} />
                            <AvatarFallback className="font-bold text-xs bg-muted text-foreground flex items-center justify-center rounded-full">
                              {getInitials(displayName) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-bold text-foreground text-sm leading-snug">
                              {displayName}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">
                              Gửi lúc: {new Date(post.createdAt).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resolvePendingLoading}
                            onClick={() => setRejectPostId(post.postId)}
                            className="h-8.5 px-3.5 text-xs font-bold rounded-lg text-destructive hover:bg-destructive/10 border-border/60 cursor-pointer transition-all duration-200"
                          >
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            disabled={resolvePendingLoading}
                            onClick={() => void handleApprovePost(post.postId)}
                            className="h-8.5 px-4.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm shadow-emerald-500/10 cursor-pointer transition-all duration-200"
                          >
                            Phê duyệt
                          </Button>
                        </div>
                      </div>

                      {postText && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-pre-wrap leading-relaxed px-1">
                          {postText}
                        </p>
                      )}

                      {post.mediaUrls && post.mediaUrls.length > 0 && (
                        <div className="rounded-xl overflow-hidden max-h-[350px] border border-border/10 bg-black/5 dark:bg-white/5">
                          <MediaGallery mediaUrls={post.mediaUrls} />
                        </div>
                      )}
                    </Card>
                  );
                })
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Không có bài viết chờ duyệt"
                  description="Tất cả bài viết trong cộng đồng đã được xử lý sạch sẽ."
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {canManage && activeTab === 'moderation-logs' && (
        <CommunityModerationLogsView groupId={groupId} />
      )}

      {canManage && activeTab === 'reports' && (
        <CommunityReportsView
          groupId={groupId}
          userProfiles={userProfiles}
          resolveReport={resolveReport}
          resolveReportLoading={resolveReportLoading}
        />
      )}

      {canManage &&
        (community?.viewerRole === 'owner' || community?.viewerRole === 'admin') &&
        activeTab === 'automod' && <CommunityAutoModView groupId={groupId} />}

      {canManage && activeTab === 'analytics' && <CommunityAnalytics groupId={groupId} />}

      {/* Dialog nhập lý do từ chối bài viết */}
      <AlertDialog
        open={rejectPostId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectPostId(null);
            setRejectReason('');
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-foreground">
              Từ chối bài viết
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vui lòng nhập lý do từ chối bài viết. Tác giả bài viết sẽ nhận được thông báo giải
              thích lý do này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Nội dung vi phạm quy định cộng đồng về ngôn từ hoặc mang tính chất quảng cáo không được phép..."
              className="w-full min-h-[100px] text-sm p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-medium text-foreground"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold cursor-pointer">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (rejectPostId) {
                  try {
                    await resolvePendingPost({
                      groupId,
                      postId: rejectPostId,
                      action: 'reject',
                      rejectReason: rejectReason.trim() || undefined,
                    }).unwrap();
                    toast.success('Đã từ chối bài viết');
                  } catch (err: any) {
                    toast.error(err?.data?.message || 'Không thể từ chối bài viết');
                  } finally {
                    setRejectPostId(null);
                    setRejectReason('');
                  }
                }
              }}
              disabled={resolvePendingLoading}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl font-bold border-none cursor-pointer"
            >
              Từ chối bài
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Dialog xác nhận chuyển quyền sở hữu */}
      <AlertDialog
        open={transferTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTransferTarget(null);
            setConfirmGroupNameInput('');
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-md border border-destructive/20 shadow-lg">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="font-extrabold text-foreground text-center">
              Cảnh báo: Chuyển quyền sở hữu
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium leading-relaxed">
              Bạn sắp chuyển giao quyền Chủ sở hữu cộng đồng{' '}
              <strong className="text-foreground font-extrabold">{community?.name}</strong> cho{' '}
              <strong className="text-foreground font-extrabold">
                {transferTarget?.displayName}
              </strong>
              . Hành động này{' '}
              <strong className="text-destructive font-extrabold">không thể hoàn tác</strong>. Bạn
              sẽ bị hạ cấp xuống Admin và không còn quyền quản trị tối cao của nhóm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 flex flex-col gap-2.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Nhập chính xác tên cộng đồng để xác nhận
            </label>
            <Input
              type="text"
              value={confirmGroupNameInput}
              onChange={(e) => setConfirmGroupNameInput(e.target.value)}
              placeholder={community?.name}
              className="w-full text-sm font-semibold"
            />
          </div>
          <AlertDialogFooter className="sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl font-bold cursor-pointer flex-1 sm:order-first">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                confirmGroupNameInput.trim() !== community?.name?.trim() || transferState.isLoading
              }
              onClick={async () => {
                if (transferTarget) {
                  try {
                    await transferOwner({
                      groupId,
                      targetUserId: transferTarget.userId,
                    }).unwrap();
                    toast.success('Đã chuyển quyền chủ sở hữu thành công');
                  } catch (err: any) {
                    toast.error(err?.data?.message || 'Không thể chuyển quyền chủ sở hữu');
                  } finally {
                    setTransferTarget(null);
                    setConfirmGroupNameInput('');
                  }
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl font-bold border-none cursor-pointer flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Xác nhận chuyển
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Giải tán cuộc trò chuyện */}
      <AlertDialog open={unlinkConfirmOpen} onOpenChange={setUnlinkConfirmOpen}>
        <AlertDialogContent className="rounded-2xl max-w-md border border-destructive/20 shadow-lg">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="font-extrabold text-foreground text-center">
              Giải tán phòng chat cộng đồng?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium leading-relaxed">
              Bạn có chắc chắn muốn giải tán phòng chat của cộng đồng này? Toàn bộ tin nhắn và danh
              sách thành viên sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl font-bold cursor-pointer flex-1">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={unlinkChatLoading}
              onClick={async () => {
                try {
                  await unlinkChat(groupId).unwrap();
                  toast.success('Giải tán phòng chat thành công!');
                  setUnlinkConfirmOpen(false);
                } catch (err: any) {
                  toast.error(err?.data?.message || 'Không thể giải tán phòng chat');
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl font-bold border-none cursor-pointer flex-1"
            >
              Xác nhận giải tán
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InviteFriendsDialog
        groupId={groupId}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </main>
  );
}

interface LogActorTargetProps {
  displayName: string;
  avatar: string | null;
}

function LogActorAvatar({ actor }: { actor?: LogActorTargetProps }) {
  return (
    <Avatar className="size-8 border border-border/20 shadow-sm rounded-full shrink-0">
      <AvatarImage src={actor?.avatar || undefined} alt={actor?.displayName} />
      <AvatarFallback className="text-[10px] font-extrabold bg-muted text-foreground flex items-center justify-center rounded-full">
        {actor?.displayName ? getInitials(actor.displayName) : 'QTV'}
      </AvatarFallback>
    </Avatar>
  );
}

function getTruncatedPostText(content: string | undefined | null, maxLen: number = 60): string {
  if (!content) return '';
  const plainText = extractTextFromTiptapJson(content);
  if (plainText.length > maxLen) {
    return plainText.substring(0, maxLen) + '...';
  }
  return plainText;
}

function CommunityModerationLogsView({ groupId }: { groupId: string }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [accumulatedLogs, setAccumulatedLogs] = useState<ICommunityModerationLog[]>([]);

  const {
    data: logsRes,
    isLoading,
    isFetching,
  } = useGetCommunityModerationLogsQuery({
    groupId,
    limit: 20,
    cursor: cursor || undefined,
  });

  useEffect(() => {
    setAccumulatedLogs([]);
    setCursor(null);
  }, [groupId]);

  useEffect(() => {
    if (logsRes?.data?.items) {
      setAccumulatedLogs((prev) => {
        const existingIds = new Set(prev.map((item) => item.logId));
        const newItems = logsRes.data.items.filter((item) => !existingIds.has(item.logId));
        return [...prev, ...newItems];
      });
    }
  }, [logsRes]);

  if (isLoading && accumulatedLogs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  if (accumulatedLogs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={History}
          title="Chưa có hoạt động nào"
          description="Lịch sử kiểm duyệt của các thành viên Ban quản trị cộng đồng sẽ hiển thị ở đây."
        />
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    owner: 'Chủ sở hữu',
    admin: 'Quản trị viên',
    moderator: 'Kiểm duyệt viên',
    member: 'Thành viên',
  };

  const fieldLabels: Record<string, string> = {
    name: 'Tên nhóm',
    slug: 'Đường dẫn nhóm (Slug)',
    type: 'Quyền riêng tư',
    joinPolicy: 'Chế độ tham gia',
    isPostApprovalRequired: 'Yêu cầu duyệt bài viết',
    description: 'Mô tả nhóm',
    avatar: 'Ảnh đại diện',
    coverUrl: 'Ảnh bìa',
    category: 'Danh mục nhóm',
    rules: 'Quy định nhóm',
  };

  const formatVal = (field: string, v: any) => {
    if (v === null || v === undefined) return 'Trống';
    if (typeof v === 'boolean') return v ? 'Bật' : 'Tắt';
    if (field === 'type') return v === 'public' ? 'Công khai' : 'Riêng tư';
    if (field === 'joinPolicy') return v === 'open' ? 'Tự do' : 'Phê duyệt';
    if (field === 'category') {
      const labels: Record<string, string> = {
        general: 'Chung',
        tech: 'Công nghệ',
        study: 'Học tập',
        entertainment: 'Giải trí',
        sports: 'Thể thao',
        beauty: 'Làm đẹp',
        gaming: 'Trò chơi',
      };
      return labels[v] || String(v);
    }
    if (field === 'rules' && Array.isArray(v)) {
      return v.map((r: any) => `"${r.title}"`).join(', ') || 'Trống';
    }
    return String(v);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <Card className="rounded-2xl border border-border/40 bg-card/65 backdrop-blur-xl shadow-lg">
        <CardHeader className="px-4 py-3 border-b border-border/40">
          <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
            <History className="size-5 text-primary" />
            Nhật ký kiểm duyệt cộng đồng
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative border-l border-border/60 ml-4 pl-6 sm:pl-8 space-y-8 py-2">
            {accumulatedLogs.map((log) => {
              let Icon = Settings;
              let colorClass = 'bg-slate-500/10 text-slate-500 border-slate-500';
              let logText = '';

              const actorName = log.actorInfo?.displayName || 'Thành viên BQT';
              const targetName = log.targetUserInfo?.displayName || log.targetName || 'Thành viên';

              switch (log.action) {
                case 'approve_join':
                  Icon = CheckCircle2;
                  colorClass =
                    'bg-emerald-500/10 text-emerald-500 border-emerald-500 dark:bg-emerald-500/20';
                  logText = `đã duyệt yêu cầu gia nhập của`;
                  break;
                case 'reject_join':
                  Icon = XCircle;
                  colorClass = 'bg-rose-500/10 text-rose-500 border-rose-500 dark:bg-rose-500/20';
                  logText = `đã từ chối yêu cầu gia nhập của`;
                  break;
                case 'ban_member':
                  Icon = UserMinus;
                  colorClass = 'bg-rose-500/10 text-rose-500 border-rose-500 dark:bg-rose-500/20';
                  logText = `đã chặn thành viên`;
                  break;
                case 'unban_member':
                  Icon = Users;
                  colorClass = 'bg-blue-500/10 text-blue-500 border-blue-500 dark:bg-blue-500/20';
                  logText = `đã gỡ chặn thành viên`;
                  break;
                case 'change_role': {
                  Icon = ShieldAlert;
                  colorClass =
                    'bg-amber-500/10 text-amber-500 border-amber-500 dark:bg-amber-500/20';
                  const oldRole = roleLabels[log.metadata?.oldRole] || log.metadata?.oldRole;
                  const newRole = roleLabels[log.metadata?.newRole] || log.metadata?.newRole;
                  logText = `đã thay đổi vai trò của <strong>${targetName}</strong> từ <strong>${oldRole}</strong> thành <strong>${newRole}</strong>`;
                  break;
                }
                case 'transfer_ownership':
                  Icon = Crown;
                  colorClass =
                    'bg-amber-500/10 text-amber-500 border-amber-500 dark:bg-amber-500/20';
                  logText = `đã chuyển quyền sở hữu cộng đồng cho`;
                  break;
                case 'approve_post': {
                  Icon = CheckCircle2;
                  colorClass =
                    'bg-emerald-500/10 text-emerald-500 border-emerald-500 dark:bg-emerald-500/20';
                  const approvedText = getTruncatedPostText(log.targetName, 60) || 'Bài viết';
                  logText = `đã phê duyệt bài viết "${approvedText}"`;
                  break;
                }
                case 'reject_post': {
                  Icon = XCircle;
                  colorClass = 'bg-rose-500/10 text-rose-500 border-rose-500 dark:bg-rose-500/20';
                  const rejectedText = getTruncatedPostText(log.targetName, 60) || 'Bài viết';
                  logText = `đã từ chối bài viết "${rejectedText}"`;
                  break;
                }
                case 'delete_post': {
                  Icon = Trash2;
                  colorClass = 'bg-rose-500/10 text-rose-500 border-rose-500 dark:bg-rose-500/20';
                  const deletedText = getTruncatedPostText(log.targetName, 60) || 'Bài viết';
                  logText = `đã xóa bài viết "${deletedText}"`;
                  break;
                }
                case 'pin_post':
                  Icon = Pin;
                  colorClass = 'bg-blue-500/10 text-blue-500 border-blue-500 dark:bg-blue-500/20';
                  logText = `đã ghim một bài viết`;
                  break;
                case 'unpin_post':
                  Icon = PinOff;
                  colorClass =
                    'bg-slate-500/10 text-slate-500 border-slate-500 dark:bg-slate-500/20';
                  logText = `đã bỏ ghim một bài viết`;
                  break;
                case 'update_settings':
                  Icon = Settings;
                  colorClass =
                    'bg-slate-500/10 text-slate-500 border-slate-500 dark:bg-slate-500/20';
                  logText = `đã cập nhật cài đặt nhóm`;
                  break;
              }

              return (
                <div key={log.logId} className="relative group">
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] top-1.5 rounded-full border-2 border-card p-1 shadow-sm shrink-0 transition-transform duration-200 group-hover:scale-110 ${colorClass}`}
                  >
                    <Icon className="size-3.5" />
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 hover:border-border/80 p-4 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                    <LogActorAvatar actor={log.actorInfo} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground leading-relaxed font-medium">
                        <strong className="font-extrabold text-foreground">{actorName}</strong>{' '}
                        {log.action === 'change_role' ? (
                          <span dangerouslySetInnerHTML={{ __html: logText }} />
                        ) : (
                          <>
                            {logText}{' '}
                            {[
                              'approve_join',
                              'reject_join',
                              'ban_member',
                              'unban_member',
                              'transfer_ownership',
                            ].includes(log.action) && (
                              <strong className="font-extrabold text-foreground">
                                {targetName}
                              </strong>
                            )}
                          </>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                        {new Date(log.createdAt).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>

                      {log.reason && (
                        <p className="mt-2.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 rounded-xl p-3 border border-rose-500/10 leading-relaxed font-medium italic">
                          Lý do: "{log.reason}"
                        </p>
                      )}

                      {log.action === 'update_settings' &&
                        log.metadata?.changedFields &&
                        (() => {
                          const changedEntries = Object.entries(log.metadata.changedFields).filter(
                            ([_, diff]: [string, any]) => {
                              if (!diff) return false;
                              return JSON.stringify(diff.old) !== JSON.stringify(diff.new);
                            },
                          );
                          if (changedEntries.length === 0) return null;
                          return (
                            <div className="mt-2.5 text-xs border border-border/40 rounded-xl p-3 bg-muted/40 max-w-md animate-in fade-in duration-200">
                              <div className="font-extrabold text-slate-500 mb-1.5">
                                Chi tiết thay đổi:
                              </div>
                              <ul className="space-y-1.5">
                                {changedEntries.map(([field, diff]: [string, any]) => {
                                  const label = fieldLabels[field] || field;
                                  return (
                                    <li
                                      key={field}
                                      className="text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-1.5"
                                    >
                                      <span className="font-bold text-foreground">{label}:</span>
                                      <span className="line-through text-slate-400 font-semibold">
                                        {formatVal(field, diff.old)}
                                      </span>
                                      <span className="text-primary font-bold">→</span>
                                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                        {formatVal(field, diff.new)}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          );
                        })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {logsRes?.data?.hasMore && (
            <div className="flex justify-center pt-4 border-t border-border/40 mt-6">
              <Button
                variant="outline"
                onClick={() => setCursor(logsRes.data.nextCursor)}
                disabled={isFetching}
                className="h-9 px-6 rounded-xl text-xs font-bold border-border/60 hover:bg-muted transition-all cursor-pointer gap-2"
              >
                {isFetching && <RefreshCw className="size-3.5 animate-spin" />}
                Tải thêm hoạt động
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CommunityReportsView({
  groupId,
  userProfiles,
  resolveReport,
  resolveReportLoading,
}: {
  groupId: string;
  userProfiles: Record<string, IUser>;
  resolveReport: any;
  resolveReportLoading: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved'>('pending');
  const { data: reportsRes, refetch } = useGetCommunityReportsQuery({
    groupId,
    status: statusFilter,
  });
  const reports = reportsRes?.data?.items || [];

  const [warningReport, setWarningReport] = useState<ICommunityReport | null>(null);
  const [warningNotes, setWarningNotes] = useState('');

  const REASON_LABEL: Record<string, string> = {
    spam: 'Spam hoặc lừa đảo',
    harassment: 'Quấy rối hoặc quấy nhiễu',
    hate_speech: 'Ngôn từ thù hận',
    inappropriate: 'Nội dung không thích hợp',
    rules_violation: 'Vi phạm quy tắc',
    other: 'Lý do khác',
  };

  const handleResolve = async (
    report: ICommunityReport,
    action: 'dismiss' | 'delete_content' | 'warn_user' | 'ban_user',
    notes?: string,
  ) => {
    try {
      await resolveReport({
        groupId,
        entityType: report.entityType,
        entityId: report.entityId,
        createdAt: report.createdAt,
        reporterId: report.reporterId,
        action,
        notes,
      }).unwrap();
      toast.success('Đã xử lý báo cáo thành công');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể xử lý báo cáo');
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`pb-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500'
            }`}
          >
            Chờ xử lý ({reports.filter((r) => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`pb-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              statusFilter === 'resolved'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500'
            }`}
          >
            Đã giải quyết
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {reports.length > 0 ? (
          reports.map((report) => {
            const reporter = userProfiles[report.reporterId];
            const targetAuthor = userProfiles[report.targetAuthorId];
            const reporterName = reporter?.displayName ?? report.reporterId;
            const targetAuthorName = targetAuthor?.displayName ?? report.targetAuthorId;

            return (
              <Card
                key={report.reportId}
                className="rounded-2xl border border-border/40 bg-card p-5 shadow-md flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                      {report.entityType === 'POST'
                        ? 'Bài viết'
                        : report.entityType === 'CMT'
                          ? 'Bình luận'
                          : 'Cộng đồng'}
                    </span>
                    <span className="text-xs font-bold px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {REASON_LABEL[report.reason] || report.reason}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Gửi lúc: {new Date(report.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm font-semibold">
                  <div>
                    <span className="text-xs text-slate-400 block mb-0.5">Người báo cáo:</span>
                    <span>{reporterName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-0.5">Tác giả bị báo cáo:</span>
                    <span>{targetAuthorName}</span>
                  </div>
                </div>

                {report.details && (
                  <div className="bg-muted/30 border border-border/40 rounded-xl p-3 text-xs italic text-slate-600 dark:text-slate-400">
                    <span className="font-extrabold text-foreground not-italic block mb-0.5">
                      Chi tiết lý do:
                    </span>
                    "{report.details}"
                  </div>
                )}

                {/* Content Preview */}
                {report.contentPreview && (
                  <div className="bg-muted/10 border border-dashed border-border/60 rounded-xl p-4 flex flex-col gap-2">
                    <span className="text-xs font-bold text-slate-400 tracking-wide uppercase">
                      Nội dung bị báo cáo:
                    </span>
                    {report.contentPreview.text && (
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {report.entityType === 'POST'
                          ? getTruncatedPostText(report.contentPreview.text, 300)
                          : report.contentPreview.text}
                      </p>
                    )}
                    {report.contentPreview.mediaUrls &&
                      report.contentPreview.mediaUrls.length > 0 && (
                        <div className="rounded-xl overflow-hidden max-h-[200px] border border-border/10">
                          <MediaGallery mediaUrls={report.contentPreview.mediaUrls} />
                        </div>
                      )}
                  </div>
                )}

                {report.status === 'pending' ? (
                  <div className="flex flex-wrap gap-2 justify-end mt-2 pt-3 border-t border-border/20">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={resolveReportLoading}
                      onClick={() => handleResolve(report, 'dismiss')}
                      className="text-xs font-bold rounded-lg cursor-pointer transition-colors text-slate-600 hover:bg-slate-100"
                    >
                      Bỏ qua
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolveReportLoading}
                      onClick={() => handleResolve(report, 'delete_content')}
                      className="text-xs font-bold rounded-lg border-red-500/20 text-red-500 hover:bg-red-500/10 cursor-pointer"
                    >
                      Xóa nội dung
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolveReportLoading}
                      onClick={() => setWarningReport(report)}
                      className="text-xs font-bold rounded-lg border-amber-500/20 text-amber-600 hover:bg-amber-500/10 cursor-pointer"
                    >
                      Cảnh cáo tác giả
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={resolveReportLoading}
                      onClick={() => handleResolve(report, 'ban_user')}
                      className="text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    >
                      Trục xuất & Chặn
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 pt-3 border-t border-border/20 flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-500">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      <span>
                        Đã xử lý:{' '}
                        {report.status === 'resolved_dismissed'
                          ? 'Bỏ qua'
                          : report.status === 'resolved_deleted'
                            ? 'Đã xóa nội dung / chặn'
                            : 'Đã cảnh cáo tác giả'}
                      </span>
                    </div>
                    {report.resolutionNotes && (
                      <span className="text-slate-400 italic block pl-5">
                        Ghi chú: "{report.resolutionNotes}"
                      </span>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={Flag}
            title={
              statusFilter === 'pending' ? 'Không có báo cáo chờ xử lý' : 'Chưa xử lý báo cáo nào'
            }
            description={
              statusFilter === 'pending'
                ? 'Cộng đồng của bạn đang hoạt động cực kỳ lành mạnh.'
                : 'Lịch sử giải quyết các báo cáo vi phạm sẽ hiển thị ở đây.'
            }
          />
        )}
      </div>

      {/* Dialog Cảnh cáo tác giả */}
      <AlertDialog
        open={warningReport !== null}
        onOpenChange={(open) => {
          if (!open) {
            setWarningReport(null);
            setWarningNotes('');
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-foreground">
              Cảnh cáo tác giả vi phạm
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vui lòng nhập ghi chú cảnh cáo. Hệ thống sẽ gửi thông báo cảnh cáo trực tiếp đến tác
              giả của nội dung vi phạm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <textarea
              value={warningNotes}
              onChange={(e) => setWarningNotes(e.target.value)}
              placeholder="Ví dụ: Nội dung của bạn mang tính chất quấy rối thành viên khác, vui lòng đọc kỹ nội quy cộng đồng..."
              className="w-full min-h-[100px] text-sm p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-medium text-foreground"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold cursor-pointer">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (warningReport) {
                  await handleResolve(warningReport, 'warn_user', warningNotes.trim() || undefined);
                  setWarningReport(null);
                  setWarningNotes('');
                }
              }}
              disabled={resolveReportLoading}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold border-none cursor-pointer"
            >
              Gửi cảnh cáo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CommunityAutoModViewProps {
  groupId: string;
}

function CommunityAutoModView({ groupId }: CommunityAutoModViewProps) {
  const { data: autoModRes, isLoading, isError, refetch } = useGetCommunityAutoModQuery(groupId);
  const [updateAutoMod, { isLoading: isUpdating }] = useUpdateCommunityAutoModMutation();

  const [enabled, setEnabled] = useState(false);
  const [action, setAction] = useState<'censor' | 'block'>('censor');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state from fetched data
  useEffect(() => {
    if (autoModRes?.data) {
      setEnabled(autoModRes.data.autoModerateEnabled);
      setAction(autoModRes.data.autoModerateAction);
      setKeywords(autoModRes.data.blacklistedKeywords || []);
    }
  }, [autoModRes]);

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const kw = newKeyword.trim().toLowerCase();

    if (!kw) return;

    if (keywords.includes(kw)) {
      setErrorMsg('Từ khóa này đã tồn tại trong danh sách.');
      return;
    }

    if (keywords.length >= 100) {
      setErrorMsg('Chỉ cho phép tối đa 100 từ khóa cấm.');
      return;
    }

    if (kw.length > 50) {
      setErrorMsg('Từ khóa không được vượt quá 50 ký tự.');
      return;
    }

    if (/[\r\n\t]/.test(kw)) {
      setErrorMsg('Từ khóa chứa ký tự không hợp lệ.');
      return;
    }

    setKeywords([...keywords, kw]);
    setNewKeyword('');
    setErrorMsg('');
  };

  const handleRemoveKeyword = (indexToRemove: number) => {
    setKeywords(keywords.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = async () => {
    try {
      await updateAutoMod({
        groupId,
        body: {
          autoModerateEnabled: enabled,
          autoModerateAction: action,
          blacklistedKeywords: keywords,
        },
      }).unwrap();
      toast.success('Đã cập nhật cấu hình Tự động kiểm duyệt thành công!');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể cập nhật cấu hình Auto-Mod');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={ShieldAlert}
          title="Không thể tải cấu hình"
          description="Đã xảy ra lỗi khi tải cấu hình kiểm duyệt của cộng đồng này."
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <Card className="rounded-2xl border border-border/40 bg-card/65 backdrop-blur-xl shadow-lg">
        <CardHeader className="px-4 py-3 border-b border-border/40 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Tự động kiểm duyệt tin nhắn (Auto-Mod)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-6">
          {/* Switch Enable AutoMod */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/20 bg-background/30">
            <div className="flex flex-col gap-1 pr-4">
              <span className="text-sm font-bold text-foreground">Kích hoạt Auto-Mod</span>
              <span className="text-xs text-muted-foreground">
                Tự động rà quét và lọc bỏ tin nhắn vi phạm tiêu chuẩn cộng đồng trong nhóm chat.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {enabled && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Select Action Mode */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Chế độ kiểm duyệt
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setAction('censor')}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-1.5 ${
                      action === 'censor'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border/40 bg-background/30 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        Censor (Che dấu từ cấm)
                      </span>
                      {action === 'censor' && (
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold text-[10px]">
                          Khuyên dùng
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Tin nhắn vi phạm sẽ tự động được che các từ cấm thành dạng *** và vẫn được gửi
                      đi bình thường.
                    </span>
                  </div>

                  <div
                    onClick={() => setAction('block')}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-1.5 ${
                      action === 'block'
                        ? 'border-destructive bg-destructive/5 ring-1 ring-destructive/20'
                        : 'border-border/40 bg-background/30 hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        Block (Chặn hoàn toàn)
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Tin nhắn chứa từ cấm sẽ bị chặn lại ngay từ server, trả về thông báo lỗi cho
                      người gửi.
                    </span>
                  </div>
                </div>

                {action === 'block' && (
                  <div className="flex items-center gap-2 p-3.5 rounded-xl bg-destructive/5 dark:bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold animate-in zoom-in-95 duration-150">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>
                      Lưu ý: Tin nhắn của thành viên chứa từ khóa cấm sẽ bị chặn hoàn toàn và không
                      thể gửi đi.
                    </span>
                  </div>
                )}
              </div>

              {/* Keywords Tag Input */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Danh sách từ khóa cấm ({keywords.length} / 100)
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Nhấn Enter để thêm
                  </span>
                </div>

                {/* Input form */}
                <form onSubmit={handleAddKeyword} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => {
                        setNewKeyword(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="Thêm từ khóa cấm mới..."
                      className="w-full text-sm font-semibold rounded-xl bg-background/40"
                    />
                    {errorMsg && (
                      <span className="text-[10px] text-destructive font-bold mt-1 block absolute left-1">
                        {errorMsg}
                      </span>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="h-10 px-5 rounded-xl font-bold bg-primary hover:bg-primary/95 text-white flex items-center justify-center cursor-pointer shadow-md shadow-primary/10 shrink-0"
                  >
                    Thêm
                  </Button>
                </form>

                {/* Tag Container */}
                <div className="mt-2 min-h-[120px] p-4 rounded-xl border border-border/40 bg-background/30 flex flex-wrap gap-2 items-start content-start">
                  {keywords.length > 0 ? (
                    keywords.map((kw, idx) => (
                      <Badge
                        key={`${kw}-${idx}`}
                        className="bg-muted hover:bg-muted/80 text-foreground border border-border/60 font-bold text-xs pl-3.5 pr-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(idx)}
                          className="text-muted-foreground hover:text-foreground shrink-0 focus:outline-none transition-colors cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center py-8 text-center gap-2">
                      <ShieldCheck className="size-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        Chưa thiết lập từ khóa cấm. Cộng đồng đang mở tự do.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end pt-4 border-t border-border/25 gap-3">
            <Button
              variant="outline"
              disabled={isUpdating}
              onClick={() => {
                if (autoModRes?.data) {
                  setEnabled(autoModRes.data.autoModerateEnabled);
                  setAction(autoModRes.data.autoModerateAction);
                  setKeywords(autoModRes.data.blacklistedKeywords || []);
                }
              }}
              className="h-10 px-5 rounded-xl text-xs font-bold border-border/60 hover:bg-muted transition-all cursor-pointer"
            >
              Hủy thay đổi
            </Button>
            <Button
              disabled={isUpdating}
              onClick={handleSave}
              className="h-10 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/10 font-bold transition-all duration-200 cursor-pointer flex items-center gap-2"
            >
              {isUpdating && <RefreshCw className="size-3.5 animate-spin" />}
              Lưu cấu hình
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CommunityDetail;
