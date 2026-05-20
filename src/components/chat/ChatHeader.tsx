import {
  ArrowLeft,
  Edit3,
  PanelLeft,
  PanelRight,
  PanelRightClose,
  Phone,
  Search,
  User,
  UserPlus,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import defaultAvatarGroup from '@/assets/images/avatar-group-default..jpg';
import { cn } from '@/utils/cn';
import type { IConversation } from '@/types/chat.types';
import type { TypingUserEntry } from '@/types/chat.types';
import { typingLabel } from '@/utils/chatUtils';
import { useBreakpoint } from '@/hooks/useBreakpoint';

type ChatHeaderProps = {
  activeConversation: IConversation | undefined;
  typingUsers: TypingUserEntry[];
  showInfo: boolean;
  onToggleShowInfo: () => void;
  onAddMember?: () => void;
  onEditGroup?: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  /** Khi có cuộc gọi nhóm đang diễn ra và user chưa tham gia — hiện nút Join nổi bật. */
  showJoinGroupCall?: boolean;
  joinGroupCallLabel?: string;
  onJoinGroupCall?: () => void;
  currentUserRole?: 'owner' | 'admin' | 'member';
  /** Số thành viên từ API `/members` (ưu tiên hơn `memberCount` trên META). */
  resolvedMemberCount?: number;
  /** Mở tìm kiếm trong đoạn hội thoại hiện tại. */
  onSearchMessages?: () => void;
  /** Quay lại danh sách hội thoại — chỉ hiển thị trên mobile (< md). */
  onBack?: () => void;
  /** Mở drawer danh sách hội thoại — chỉ dùng trên mobile (< md). */
  onOpenConversationList?: () => void;
};

/** Nút icon trong header — bọc sẵn Tooltip theo chuẩn Hamtech. */
function HeaderIconButton({
  title,
  onClick,
  disabled,
  active,
  children,
  className,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const isTabletOrDesktop = useBreakpoint('md');

  // Mobile/touch: avoid Radix TooltipTrigger to prevent click being swallowed.
  if (!isTabletOrDesktop) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={title}
        className={cn(
          'p-2 sm:p-2.5 rounded-full transition-all text-muted-foreground',
          active
            ? 'bg-blue-600/10 text-blue-600'
            : 'hover:bg-muted hover:text-blue-600 disabled:opacity-40 disabled:pointer-events-none',
          className,
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'p-2 sm:p-2.5 rounded-full transition-all text-muted-foreground',
            active
              ? 'bg-blue-600/10 text-blue-600'
              : 'hover:bg-muted hover:text-blue-600 disabled:opacity-40 disabled:pointer-events-none',
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{title}</TooltipContent>
    </Tooltip>
  );
}

export function ChatHeader({
  activeConversation,
  typingUsers,
  showInfo,
  onToggleShowInfo,
  onAddMember,
  onEditGroup,
  onAudioCall,
  onVideoCall,
  showJoinGroupCall,
  joinGroupCallLabel = 'Tham gia',
  onJoinGroupCall,
  currentUserRole,
  resolvedMemberCount,
  onSearchMessages,
  onBack,
  onOpenConversationList,
}: ChatHeaderProps) {
  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';
  // `currentUserRole` có thể chưa có ngay (đợi fetch members) nên không disable click theo role ở header.
  // Quyền thêm thành viên vẫn được backend kiểm tra; FE chỉ mở modal chọn bạn bè.
  const canOpenAddMembers = activeConversation?.type === 'group' && !!onAddMember;
  const canSearchMessages = !!activeConversation && !!onSearchMessages;
  const groupMemberDisplayCount =
    activeConversation?.type === 'group'
      ? resolvedMemberCount != null && resolvedMemberCount > 0
        ? resolvedMemberCount
        : (activeConversation.memberCount ?? 0)
      : 0;

  return (
    <TooltipProvider delayDuration={300}>
      {/* h-16 (64px) thay h-20 — chuẩn Zalo/Telegram; border dùng semantic token */}
      <div className="h-16 px-3 md:px-6 flex items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        {/* Thông tin hội thoại */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Open conversation list (drawer) — mobile only */}
          {onOpenConversationList && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenConversationList}
              className="md:hidden shrink-0 -ml-1 rounded-full"
              aria-label="Mở danh sách hội thoại"
            >
              <PanelLeft className="size-5" />
            </Button>
          )}
          {/* Back button — chỉ hiện trên mobile (< md) */}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="md:hidden shrink-0 -ml-1 rounded-full"
              aria-label="Quay lại danh sách"
            >
              <ArrowLeft className="size-5" />
            </Button>
          )}
          {/* Avatar — size-10 thay w-10 h-10 (Rule 8) */}
          <div className="size-10 rounded-full overflow-hidden border-2 border-blue-600/20 bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            {activeConversation?.avatar ? (
              <img
                src={activeConversation.avatar}
                alt={activeConversation.name ?? 'Chat'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : activeConversation?.type === 'group' ? (
              <img
                src={defaultAvatarGroup}
                alt={activeConversation.name ?? 'Chat'}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="size-5 text-blue-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold leading-tight text-sm">
                {activeConversation?.name ?? 'Chọn hội thoại'}
              </h2>
              {activeConversation?.type === 'group' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onEditGroup}
                      className="p-1 rounded-full hover:bg-muted transition-all text-muted-foreground hover:text-blue-600"
                    >
                      {/* size-3.5 thay w-3.5 h-3.5 (Rule 8) */}
                      <Edit3 className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Sửa tên nhóm</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {activeConversation?.type === 'group' ? (
                `${groupMemberDisplayCount} thành viên`
              ) : typingUsers.length > 0 ? (
                <span className="text-blue-500 font-bold">
                  {typingUsers.length === 1
                    ? `${typingLabel(typingUsers[0])} đang nhập...`
                    : `${typingUsers.length} người đang nhập...`}
                </span>
              ) : (
                'Nhắn tin'
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {activeConversation?.type === 'group' ? (
            <>
              <HeaderIconButton
                title={
                  isAdminOrOwner
                    ? 'Thêm thành viên'
                    : 'Mở danh sách để chọn (backend sẽ kiểm tra quyền thêm)'
                }
                onClick={canOpenAddMembers ? onAddMember : undefined}
                disabled={!canOpenAddMembers}
              >
                <UserPlus className="size-5" />
              </HeaderIconButton>
              <HeaderIconButton
                title="Tìm kiếm tin nhắn trong hội thoại"
                onClick={canSearchMessages ? onSearchMessages : undefined}
                disabled={!canSearchMessages}
              >
                <Search className="size-5" />
              </HeaderIconButton>
              {showJoinGroupCall ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={onJoinGroupCall}
                      className="h-9 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 px-3 sm:px-4 shadow-sm gap-2"
                    >
                      <Video className="size-4" />
                      <span className="hidden sm:inline">{joinGroupCallLabel}</span>
                      <span className="sm:hidden">Tham gia</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Tham gia cuộc gọi nhóm đang diễn ra</TooltipContent>
                </Tooltip>
              ) : (
                <HeaderIconButton
                  title="Cuộc gọi video nhóm"
                  onClick={onVideoCall ?? undefined}
                  disabled={!onVideoCall}
                >
                  <Video className="size-5" />
                </HeaderIconButton>
              )}
            </>
          ) : (
            <>
              <HeaderIconButton title="Gọi thoại" onClick={onAudioCall}>
                <Phone className="size-5" />
              </HeaderIconButton>
              <HeaderIconButton title="Gọi video" onClick={onVideoCall}>
                <Video className="size-5" />
              </HeaderIconButton>
              <HeaderIconButton
                title="Tìm kiếm tin nhắn trong hội thoại"
                onClick={canSearchMessages ? onSearchMessages : undefined}
                disabled={!canSearchMessages}
              >
                <Search className="size-5" />
              </HeaderIconButton>
            </>
          )}

          {/* Separator dùng shadcn thay bg-inherit vô hình (Rule 1 — dùng Separator) */}
          <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />

          <HeaderIconButton
            title={showInfo ? 'Đóng thông tin hội thoại' : 'Mở thông tin hội thoại'}
            onClick={onToggleShowInfo}
            active={showInfo}
          >
            {showInfo ? <PanelRightClose className="size-5" /> : <PanelRight className="size-5" />}
          </HeaderIconButton>
        </div>
      </div>
    </TooltipProvider>
  );
}
