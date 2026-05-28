import { useMemo, useState, useEffect } from 'react';
import { Search, UserPlus, X, Loader2, Link, Copy, RefreshCw, Check } from 'lucide-react';
import { useGetFriendsQuery } from '@/store/api/contactApi';
import {
  useGetCommunityMembersQuery,
  useInviteFriendsMutation,
  useGetCommunityQuery,
  useGetInviteLinkMutation,
  useDisableInviteLinkMutation,
} from '@/store/api/communityApi';
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type InviteFriendsDialogProps = {
  groupId: string;
  open: boolean;
  onClose: () => void;
};

type Friend = {
  userId: string;
  displayName?: string;
  avatar?: string | null;
  email?: string;
  phone?: string;
};

export function InviteFriendsDialog({ groupId, open, onClose }: InviteFriendsDialogProps) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: friendsRes, isLoading: isFriendsLoading } = useGetFriendsQuery();
  const { data: membersRes, isLoading: isMembersLoading } = useGetCommunityMembersQuery(groupId);
  const [inviteFriends, { isLoading: isSubmitting }] = useInviteFriendsMutation();

  const { data: communityRes } = useGetCommunityQuery(groupId, { skip: !open });
  const community = communityRes?.data;
  const isManager =
    community?.viewerRole === 'owner' ||
    community?.viewerRole === 'admin' ||
    community?.viewerRole === 'moderator';

  const [getInviteLink, { isLoading: isLinkLoading }] = useGetInviteLinkMutation();
  const [disableInviteLink, { isLoading: isDisabling }] = useDisableInviteLinkMutation();

  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteEnabled, setInviteEnabled] = useState(false);

  useEffect(() => {
    if (open && isManager) {
      getInviteLink(groupId)
        .unwrap()
        .then((res) => {
          setInviteCode(res.data.inviteCode);
          setInviteEnabled(res.data.inviteCodeEnabled);
        })
        .catch(() => {});
    }
  }, [open, isManager, groupId, getInviteLink]);

  const handleDisableLink = async () => {
    try {
      await disableInviteLink(groupId).unwrap();
      setInviteCode(null);
      setInviteEnabled(false);
      toast.success('Đã vô hiệu hóa đường liên kết mời!');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể vô hiệu hóa đường liên kết');
    }
  };

  const handleResetLink = async () => {
    try {
      await disableInviteLink(groupId).unwrap();
      const res = await getInviteLink(groupId).unwrap();
      setInviteCode(res.data.inviteCode);
      setInviteEnabled(res.data.inviteCodeEnabled);
      toast.success('Đã tạo lại đường liên kết mời mới!');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể cấp lại đường liên kết');
    }
  };

  const inviteUrl = inviteCode ? `${window.location.origin}/c/join/${inviteCode}` : '';

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Đã sao chép liên kết mời!');
    setTimeout(() => setCopied(false), 2000);
  };

  const friends = useMemo((): Friend[] => {
    const data: unknown = friendsRes?.data;
    if (!data) return [];
    if (Array.isArray(data)) return data as Friend[];
    if (typeof data === 'object') {
      const asObj = data as { friends?: unknown };
      if (Array.isArray(asObj.friends)) return asObj.friends as Friend[];
      return [data as Friend];
    }
    return [];
  }, [friendsRes?.data]);

  const existingMemberIds = useMemo(() => {
    const members = membersRes?.data ?? [];
    return new Set(members.map((m) => m.userId));
  }, [membersRes?.data]);

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    return friends.filter((friend) => {
      // filter out existing members
      if (existingMemberIds.has(friend.userId)) return false;

      if (!q) return true;
      return [friend.displayName, friend.email, friend.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [friends, existingMemberIds, query]);

  const handleToggleSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, userId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    try {
      await inviteFriends({ groupId, userIds: selectedIds }).unwrap();
      toast.success('Đã gửi lời mời tham gia cộng đồng thành công!');
      setSelectedIds([]);
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể gửi lời mời tham gia cộng đồng');
    }
  };

  const isLoading = isFriendsLoading || isMembersLoading;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="size-5 text-blue-600" />
              Mời bạn bè vào cộng đồng
            </DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              Chọn bạn bè từ danh bạ để gửi lời mời tham gia
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8 rounded-full">
            <X className="size-4" />
          </Button>
        </DialogHeader>

        {isManager && (
          <div className="px-5 py-4 border-b border-border bg-blue-50/30 dark:bg-blue-950/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Link className="size-3.5 text-blue-500" />
                Đường liên kết mời cộng đồng
              </h4>
              {inviteEnabled && inviteCode && (
                <button
                  onClick={handleDisableLink}
                  disabled={isDisabling}
                  className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                >
                  Vô hiệu hóa
                </button>
              )}
            </div>

            {isLinkLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-blue-500" />
                <span>Đang tạo liên kết mời...</span>
              </div>
            ) : !inviteEnabled || !inviteCode ? (
              <div className="flex items-center justify-between gap-3 py-1">
                <span className="text-xs text-muted-foreground">
                  Chưa bật liên kết mời cho cộng đồng này.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold"
                  onClick={handleResetLink}
                  disabled={isLinkLoading}
                >
                  Kích hoạt liên kết
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 bg-muted/65 rounded-xl border border-border overflow-hidden">
                    <input
                      type="text"
                      readOnly
                      value={inviteUrl}
                      className="w-full pl-3 pr-10 py-2.5 text-xs text-foreground bg-transparent outline-none select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-blue-500 transition-colors"
                      title="Sao chép"
                    >
                      {copied ? (
                        <Check className="size-4 text-green-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl"
                    onClick={handleResetLink}
                    disabled={isLinkLoading || isDisabling}
                    title="Làm mới mã mời"
                  >
                    <RefreshCw
                      className={`size-4 text-muted-foreground ${isLinkLoading ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Bất kỳ ai có liên kết này đều có thể trực tiếp gia nhập cộng đồng này mà không cần
                  phê duyệt.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="px-5 py-3 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm bạn bè..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-muted/50 border border-transparent focus:border-blue-500/30 outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[350px] space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Đang tải danh sách bạn bè...</span>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {friends.length === 0
                ? 'Bạn chưa có người bạn nào để mời'
                : 'Không tìm thấy người dùng phù hợp hoặc họ đã là thành viên'}
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const selected = selectedIds.includes(friend.userId);
              return (
                <label
                  key={friend.userId}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => handleToggleSelect(friend.userId, e.target.checked)}
                    className="w-4.5 h-4.5 rounded-full accent-blue-600 shrink-0 cursor-pointer"
                  />
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0">
                    {friend.avatar ? (
                      <img
                        src={friend.avatar}
                        alt={friend.displayName ?? ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-600 font-bold text-xs">
                        {(friend.displayName?.slice(0, 1) ?? 'U').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">
                      {friend.displayName ?? friend.userId}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {friend.email ?? friend.phone ?? 'Zalogram User'}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between bg-muted/20">
          <span className="text-xs text-muted-foreground font-medium">
            Đã chọn {selectedIds.length} người bạn
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              disabled={selectedIds.length === 0 || isSubmitting}
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Gửi lời mời'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
