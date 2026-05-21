import { useEffect, useMemo, useState, useRef } from 'react';
import defaultAvatarGroup from '@/assets/images/avatar-group-default..jpg';
import defaultCoverGroup from '@/assets/images/cover-group-default..jpg';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Compass,
  Crown,
  FileText,
  Globe2,
  Lock,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
  X,
  Camera,
  Loader2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePostModal } from '@/features/newsfeed/components/CreatePostModal';
import { PostCard } from '@/features/newsfeed/components/PostCard';
import { searchService } from '@/services/search.service';
import {
  useArchiveCommunityMutation,
  useCreateCommunityMutation,
  useGetCommunityMembersQuery,
  useGetCommunityPostsQuery,
  useGetCommunityQuery,
  useGetCommunityRequestsQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
  useListCommunitiesQuery,
  useRemoveCommunityMemberMutation,
  useResolveCommunityRequestMutation,
  useTransferCommunityOwnerMutation,
  useUpdateCommunityMemberRoleMutation,
  useUpdateCommunityMutation,
} from '@/store/api/communityApi';
import { usePostMultipleUsersMutation } from '@/store/api/userApi';
import { useUploadMediaMutation } from '@/store/api/mediaApi';
import {
  COMMUNITY_CATEGORIES,
  type CommunityCategory,
  type CommunityJoinPolicy,
  type CommunityMemberRole,
  type CommunityType,
  type ICommunity,
  type ICommunityRule,
} from '@/types/community.types';
import type { ISearchGroupResult } from '@/types/search.types';
import type { IUser } from '@/types/user.types';

const CATEGORY_LABEL: Record<CommunityCategory, string> = {
  general: 'Chung',
  technology: 'Công nghệ',
  sports: 'Thể thao',
  music: 'Nhạc',
  education: 'Giáo dục',
  gaming: 'Gaming',
  lifestyle: 'Đời sống',
};

const ROLE_LABEL: Record<CommunityMemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Mod',
  member: 'Member',
};

const EDITABLE_ROLES: CommunityMemberRole[] = ['admin', 'moderator', 'member'];
type CommunityBrowseMode = 'feed' | 'discover' | 'joined';

const NAV_ITEMS: Array<{
  key: CommunityBrowseMode;
  label: string;
  icon: typeof Users;
}> = [
  { key: 'feed', label: 'Bảng feed của bạn', icon: Newspaper },
  { key: 'discover', label: 'Khám phá', icon: Compass },
  { key: 'joined', label: 'Nhóm của bạn', icon: Users },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function canManageCommunity(role?: CommunityMemberRole | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'moderator';
}

function CommunityAvatar({
  community,
  className = 'size-12',
}: {
  community: ICommunity;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarImage src={community.avatar ?? defaultAvatarGroup} alt={community.name} />
      <AvatarFallback>{getInitials(community.name) || 'CĐ'}</AvatarFallback>
    </Avatar>
  );
}

function CategoryPill({
  active,
  category,
  onClick,
}: {
  active: boolean;
  category: CommunityCategory;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="rounded-full"
    >
      {CATEGORY_LABEL[category]}
    </Button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="size-5 text-primary" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="font-semibold text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

function MiniCommunityRow({ community }: { community: ICommunity }) {
  return (
    <Link
      to={`/communities/${community.groupId}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-muted"
    >
      <CommunityAvatar community={community} className="size-12 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{community.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {community.viewerRole
            ? ROLE_LABEL[community.viewerRole]
            : `${community.memberCount} thành viên`}
        </div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function SearchGroupRow({ group }: { group: ISearchGroupResult }) {
  return (
    <Link
      to={`/communities/${group.groupId}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
        {group.name[0]?.toUpperCase() ?? 'N'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{group.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {group.memberCount.toLocaleString('vi-VN')} thành viên
        </div>
      </div>
    </Link>
  );
}

function CommunityDiscoveryCard({
  community,
  onDismiss,
  onJoin,
  joining,
}: {
  community: ICommunity;
  onDismiss: () => void;
  onJoin: () => void;
  joining: boolean;
}) {
  const joined = community.viewerStatus === 'active';
  const requested = community.joinRequestStatus === 'pending';
  const cta = joined ? 'Đã tham gia' : requested ? 'Đã gửi yêu cầu' : 'Tham gia nhóm';

  return (
    <Card className="overflow-hidden rounded-xl py-0 shadow-sm">
      <div className="relative aspect-[16/9] bg-muted">
        <img
          src={community.coverUrl ?? defaultCoverGroup}
          alt={community.name}
          className="size-full object-cover"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          className="absolute right-3 top-3 rounded-full"
          onClick={onDismiss}
          aria-label="Ẩn gợi ý"
        >
          <X className="size-4" />
        </Button>
      </div>
      <CardContent className="flex flex-col gap-3 p-4">
        <Link to={`/communities/${community.groupId}`} className="flex flex-col gap-1">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground">
            {community.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {community.memberCount.toLocaleString('vi-VN')} thành viên ·{' '}
            {community.postCount || '10+'} bài viết/ngày
          </p>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{CATEGORY_LABEL[community.category]}</Badge>
          <span>{community.type === 'public' ? 'Công khai' : 'Riêng tư'}</span>
          <span>{community.joinPolicy === 'approval' ? 'Cần duyệt' : 'Mở'}</span>
        </div>
        <Button
          variant={joined || requested ? 'secondary' : 'outline'}
          disabled={joining || joined || requested}
          onClick={onJoin}
          className="mt-auto w-full"
        >
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}

function CommunityGridSection({
  title,
  description,
  communities,
  dismissed,
  expanded,
  loading,
  joining,
  onToggleExpanded,
  onDismiss,
  onJoin,
}: {
  title: string;
  description?: string;
  communities: ICommunity[];
  dismissed: Set<string>;
  expanded: boolean;
  loading: boolean;
  joining: boolean;
  onToggleExpanded: () => void;
  onDismiss: (groupId: string) => void;
  onJoin: (groupId: string) => void;
}) {
  const visible = expanded ? communities : communities.slice(0, 4);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {communities.length > 4 && (
          <Button variant="link" onClick={onToggleExpanded}>
            {expanded ? 'Thu gọn' : 'Xem tất cả'}
          </Button>
        )}
      </div>
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {visible.map((community) => (
            <CommunityDiscoveryCard
              key={community.groupId}
              community={community}
              joining={joining}
              onDismiss={() => onDismiss(community.groupId)}
              onJoin={() => onJoin(community.groupId)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={dismissed.size ? 'Bạn đã ẩn hết gợi ý trong phần này' : 'Chưa có gợi ý phù hợp'}
          description="Hãy thử chủ đề khác hoặc tạo nhóm đầu tiên cho chủ đề này."
        />
      )}
    </section>
  );
}

function CommunityFormDialog({
  community,
  open,
  onClose,
}: {
  community?: ICommunity;
  open: boolean;
  onClose: () => void;
}) {
  const isEdit = Boolean(community);
  const [createCommunity, createState] = useCreateCommunityMutation();
  const [updateCommunity, updateState] = useUpdateCommunityMutation();
  const [uploadMedia] = useUploadMediaMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('general');
  const [type, setType] = useState<CommunityType>('public');
  const [joinPolicy, setJoinPolicy] = useState<CommunityJoinPolicy>('open');
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isLoading = createState.isLoading || updateState.isLoading;

  useEffect(() => {
    if (!open) return;
    setName(community?.name ?? '');
    setDescription(community?.description ?? '');
    setAvatar(community?.avatar ?? '');
    setCoverUrl(community?.coverUrl ?? '');
    setCategory(community?.category ?? 'general');
    setType(community?.type ?? 'public');
    setJoinPolicy(community?.joinPolicy ?? 'open');
    setRuleTitle(community?.rules?.[0]?.title ?? '');
    setRuleDescription(community?.rules?.[0]?.description ?? '');
  }, [community, open]);

  const rules: ICommunityRule[] = useMemo(() => {
    if (!ruleTitle.trim() || !ruleDescription.trim()) return [];
    return [
      {
        id: community?.rules?.[0]?.id ?? 'rule-1',
        title: ruleTitle.trim(),
        description: ruleDescription.trim(),
      },
    ];
  }, [community?.rules, ruleDescription, ruleTitle]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'avatar' | 'cover',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      const res = await uploadMedia({
        file,
        mediaType: 'image',
        deliveryScope: 'general',
      }).unwrap();
      const url = res.data?.url?.trim();
      if (url) {
        if (type === 'avatar') {
          setAvatar(url);
          toast.success('Đã tải ảnh đại diện lên');
        } else {
          setCoverUrl(url);
          toast.success('Đã tải ảnh bìa lên');
        }
      }
    } catch {
      toast.error('Không tải được ảnh lên. Vui lòng thử lại.');
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  const submit = async (): Promise<void> => {
    if (!name.trim()) return;
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      avatar: avatar.trim() || null,
      coverUrl: coverUrl.trim() || null,
      category,
      type,
      joinPolicy,
      rules: rules.length ? rules : undefined,
    };

    try {
      if (community) {
        await updateCommunity({ groupId: community.groupId, body }).unwrap();
        toast.success('Đã cập nhật cộng đồng');
      } else {
        await createCommunity(body).unwrap();
        toast.success('Đã tạo cộng đồng');
      }
      onClose();
    } catch {
      toast.error(isEdit ? 'Không cập nhật được cộng đồng' : 'Không tạo được cộng đồng');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl p-0" showCloseButton={false}>
        <DialogHeader className="px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              {isEdit ? (
                <Pencil className="size-4 text-primary" />
              ) : (
                <Plus className="size-4 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle>{isEdit ? 'Chỉnh sửa cộng đồng' : 'Tạo cộng đồng'}</DialogTitle>
              <DialogDescription>
                Thiết lập chủ đề, quyền tham gia và nội quy cơ bản.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex max-h-[65dvh] flex-col gap-4 overflow-y-auto px-5 py-4 scrollbar-hide">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Tên cộng đồng
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên cộng đồng..."
                className="rounded-xl h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Chủ đề
              </label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as CommunityCategory)}
              >
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Chọn chủ đề" />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNITY_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {CATEGORY_LABEL[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Mô tả cộng đồng
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về mục tiêu và nội dung của cộng đồng..."
              className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Hình ảnh đại diện & Ảnh bìa
            </label>

            <div className="relative w-full" style={{ height: 160 }}>
              {/* Cover Image Wrapper */}
              <div
                onClick={() => coverInputRef.current?.click()}
                className="w-full h-full cursor-pointer overflow-hidden rounded-2xl border border-dashed border-border bg-muted/30 transition hover:bg-muted/50 flex flex-col items-center justify-center gap-2 group relative"
              >
                {coverUrl ? (
                  <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <Camera className="size-5" />
                    <span className="text-xs font-medium">Tải lên ảnh bìa (16:9)</span>
                  </div>
                )}

                {coverUrl && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                    <Camera className="size-4" />
                    <span className="text-xs font-semibold">Thay đổi ảnh bìa</span>
                  </div>
                )}

                {uploadingCover && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 text-white">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-xs">Đang tải lên...</span>
                  </div>
                )}
              </div>

              {/* Avatar Image Wrapper */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  avatarInputRef.current?.click();
                }}
                className="absolute left-6 -bottom-8 size-20 rounded-full border-4 border-background bg-card overflow-hidden shadow-lg cursor-pointer group/avatar flex items-center justify-center"
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="size-full bg-primary/10 flex items-center justify-center text-primary transition hover:bg-primary/20">
                    <Camera className="size-5" />
                  </div>
                )}

                {avatar && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="size-4" />
                  </div>
                )}

                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="h-8" />

            <input
              type="file"
              ref={avatarInputRef}
              onChange={(e) => handleFileChange(e, 'avatar')}
              className="hidden"
              accept="image/*"
            />
            <input
              type="file"
              ref={coverInputRef}
              onChange={(e) => handleFileChange(e, 'cover')}
              className="hidden"
              accept="image/*"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Chế độ hiển thị
              </label>
              <Select value={type} onValueChange={(value) => setType(value as CommunityType)}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Chọn hiển thị" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Công khai (Ai cũng tìm thấy)</SelectItem>
                  <SelectItem value="private">Riêng tư (Chỉ thành viên thấy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Chính sách tham gia
              </label>
              <Select
                value={joinPolicy}
                onValueChange={(value) => setJoinPolicy(value as CommunityJoinPolicy)}
              >
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Chọn cách tham gia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Tự do tham gia (Mở)</SelectItem>
                  <SelectItem value="approval">Cần phê duyệt từ Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/10 p-4 flex flex-col gap-3">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-primary" />
              Nội quy đầu tiên của nhóm
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Tiêu đề nội quy
                </label>
                <Input
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  placeholder="Ví dụ: Tôn trọng lẫn nhau"
                  className="rounded-lg h-9"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Mô tả nội quy
                </label>
                <Input
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="Ví dụ: Không dùng từ ngữ xúc phạm..."
                  className="rounded-lg h-9"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-4">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={isLoading || !name.trim()}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo cộng đồng'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommunitiesList() {
  const [category, setCategory] = useState<CommunityCategory>('general');
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
              <div className="flex flex-wrap gap-2 px-2 lg:flex-col lg:px-0">
                {COMMUNITY_CATEGORIES.map((item) => (
                  <CategoryPill
                    key={item}
                    category={item}
                    active={category === item}
                    onClick={() => {
                      setCategory(item);
                      setMode('discover');
                    }}
                  />
                ))}
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
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {COMMUNITY_CATEGORIES.map((item) => (
                    <CategoryPill
                      key={item}
                      category={item}
                      active={category === item}
                      onClick={() => {
                        setCategory(item);
                        setMode('discover');
                      }}
                    />
                  ))}
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
              <section className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Bảng feed của bạn</h2>
                  <p className="text-sm text-muted-foreground">
                    Chưa có endpoint tổng hợp feed nhóm, tạm thời hiển thị các nhóm bạn đã tham gia.
                  </p>
                </div>
                {joinedCommunities.length ? (
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
                    icon={Newspaper}
                    title="Chưa có nhóm trong feed"
                    description="Tham gia một nhóm để xem hoạt động của nhóm tại đây."
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

function CommunityStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 px-4 py-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <div className="font-semibold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function CommunityDetail({ groupId }: { groupId: string }) {
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'leave' | 'archive' | null>(null);
  const [memberToKick, setMemberToKick] = useState<string | null>(null);
  const { data, isLoading } = useGetCommunityQuery(groupId);
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

  if (isLoading || !community) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-36 rounded-2xl" />
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
      <Button variant="ghost" asChild className="w-fit">
        <Link to="/communities">
          <ArrowLeft className="size-4" />
          Quay lại
        </Link>
      </Button>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div
          className="h-56 bg-muted"
          style={{
            backgroundImage: `url(${community.coverUrl ?? defaultCoverGroup})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-end gap-4">
              <CommunityAvatar community={community} className="-mt-16 size-24 ring-4 ring-card" />
              <div className="min-w-0 pb-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-normal text-foreground">
                    {community.name}
                  </h1>
                  <Badge variant="secondary">{CATEGORY_LABEL[community.category]}</Badge>
                  <Badge variant={community.type === 'public' ? 'outline' : 'secondary'}>
                    {community.type === 'public' ? (
                      <Globe2 className="size-3" />
                    ) : (
                      <Lock className="size-3" />
                    )}
                    {community.type === 'public' ? 'Công khai' : 'Riêng tư'}
                  </Badge>
                  {canManage && (
                    <Badge>
                      <ShieldCheck className="size-3" />
                      {ROLE_LABEL[community.viewerRole!]}
                    </Badge>
                  )}
                </div>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  {community.description || 'Cộng đồng chưa có mô tả.'}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <CommunityStat icon={Users} label="Thành viên" value={community.memberCount} />
              <CommunityStat icon={FileText} label="Bài viết" value={community.postCount} />
              <CommunityStat
                icon={community.joinPolicy === 'approval' ? ShieldCheck : Check}
                label="Cơ chế tham gia"
                value={community.joinPolicy === 'approval' ? 'Cần duyệt' : 'Mở'}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isMember ? (
              <>
                <Button onClick={() => setPostModalOpen(true)}>
                  <Plus className="size-4" />
                  Đăng bài
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction('leave')}
                  disabled={isOwner}
                >
                  Rời cộng đồng
                </Button>
              </>
            ) : (
              <Button
                disabled={joinState.isLoading || community.joinRequestStatus === 'pending'}
                onClick={() => void handleJoin()}
              >
                {community.joinRequestStatus === 'pending' ? 'Đã gửi yêu cầu' : 'Tham gia'}
              </Button>
            )}
            {(community.viewerRole === 'owner' || community.viewerRole === 'admin') && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Chỉnh sửa
              </Button>
            )}
            {isOwner && (
              <Button variant="destructive" onClick={() => setConfirmAction('archive')}>
                <Trash2 className="size-4" />
                Lưu trữ
              </Button>
            )}
          </div>
        </div>
      </section>

      <Tabs defaultValue="posts" className="flex flex-col gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="posts">Bài viết</TabsTrigger>
          <TabsTrigger value="members">Thành viên</TabsTrigger>
          {canManage && community.joinPolicy === 'approval' && (
            <TabsTrigger value="requests">
              Yêu cầu duyệt
              {(requests?.data ?? []).length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1.5 px-1 py-0 h-4 min-w-4 flex items-center justify-center text-[10px] rounded-full shrink-0"
                >
                  {(requests?.data ?? []).length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="about">Giới thiệu</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="m-0 flex flex-col gap-4">
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
            posts!.data.items.map((post) => <PostCard key={post.postId} post={post} />)
          ) : (
            <EmptyState
              icon={FileText}
              title="Chưa có bài viết"
              description="Hãy mở đầu cuộc trò chuyện trong cộng đồng này."
            />
          )}
        </TabsContent>

        <TabsContent value="members" className="m-0">
          <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardHeader className="px-5 py-4 border-b border-border/50">
              <CardTitle className="text-base font-bold">
                Thành viên ({members?.data?.length ?? community.memberCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-5">
              {(members?.data ?? []).map((member) => {
                const profile = userProfiles[member.userId];
                const displayName = profile?.displayName ?? member.userId;
                const avatarUrl = profile?.avatar ?? undefined;
                return (
                  <div
                    key={member.userId}
                    className="flex flex-col gap-3 rounded-2xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar>
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback>{getInitials(displayName) || 'M'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(member.joinedAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                        {member.role === 'owner' && <Crown className="size-3" />}
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
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EDITABLE_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {ROLE_LABEL[role]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={transferState.isLoading}
                            onClick={() => transferOwner({ groupId, targetUserId: member.userId })}
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
        </TabsContent>

        {canManage && community.joinPolicy === 'approval' && (
          <TabsContent value="requests" className="m-0">
            <Card className="rounded-2xl border border-border bg-card shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border/50">
                <CardTitle className="text-base font-bold">
                  Yêu cầu gia nhập ({requests?.data?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-5">
                {(requests?.data ?? []).length ? (
                  requests!.data.map((request) => {
                    const profile = userProfiles[request.userId];
                    const displayName = profile?.displayName ?? request.userId;
                    const avatarUrl = profile?.avatar ?? undefined;
                    return (
                      <div
                        key={request.userId}
                        className="flex flex-col gap-3 rounded-2xl border border-border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={avatarUrl} alt={displayName} />
                            <AvatarFallback>{getInitials(displayName) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-foreground">
                              {displayName}
                            </div>
                            <div className="text-xs text-muted-foreground">Muốn tham gia nhóm</div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.message || 'Không có lời nhắn'}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            disabled={resolveState.isLoading}
                            onClick={() =>
                              resolveRequest({ groupId, userId: request.userId, action: 'approve' })
                            }
                          >
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resolveState.isLoading}
                            onClick={() =>
                              resolveRequest({ groupId, userId: request.userId, action: 'reject' })
                            }
                          >
                            Từ chối
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Không có yêu cầu đang chờ duyệt.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="about" className="m-0 grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Nội quy</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {community.rules?.length ? (
                community.rules.map((rule, index) => (
                  <div key={rule.id} className="rounded-2xl border border-border p-4">
                    <div className="text-sm font-semibold text-primary">#{index + 1}</div>
                    <div className="mt-1 font-semibold">{rule.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Cộng đồng chưa có nội quy riêng.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Thông tin</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-medium">{community.slug}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Ngày tạo</span>
                <span className="font-medium">
                  {new Date(community.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Trạng thái</span>
                <span className="font-medium">
                  {community.status === 'active' ? 'Đang hoạt động' : 'Đã lưu trữ'}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

export default function CommunitiesPage() {
  const { groupId } = useParams<{ groupId?: string }>();
  return groupId ? <CommunityDetail groupId={groupId} /> : <CommunitiesList />;
}
