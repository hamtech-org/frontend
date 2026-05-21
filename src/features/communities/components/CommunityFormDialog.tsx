import { useEffect, useMemo, useState, useRef } from 'react';
import { Pencil, Plus, Camera, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
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
import { Button } from '@/components/ui/button';
import { useCreateCommunityMutation, useUpdateCommunityMutation } from '@/store/api/communityApi';
import { useUploadMediaMutation } from '@/store/api/mediaApi';
import {
  COMMUNITY_CATEGORIES,
  type CommunityCategory,
  type CommunityJoinPolicy,
  type CommunityType,
  type ICommunity,
  type ICommunityRule,
} from '@/types/community.types';
import { CATEGORY_LABEL } from '../constants';

export function CommunityFormDialog({
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
              <Select value={type} onValueChange={(value) => setType(value as any)}>
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
              <Select value={joinPolicy} onValueChange={(value) => setJoinPolicy(value as any)}>
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
