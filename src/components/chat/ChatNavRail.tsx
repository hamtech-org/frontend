import { Contact, MessageCircle, Sparkles } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils/cn';
import type { RootState } from '@/store/store';
import { useBreakpoint } from '@/hooks/useBreakpoint';

type ChatNavRailProps = {
  onOpenProfile: () => void;
  showContactsManagement: boolean;
  showAIAssistant: boolean;
  onOpenMessages: () => void;
  onToggleContacts: () => void;
  onOpenAIAssistant: () => void;
};

/** Nút icon trong nav rail — bọc sẵn Tooltip. */
function NavRailButton({
  title,
  onClick,
  isActive,
  children,
  className,
}: {
  title: string;
  onClick?: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'size-10 md:size-12 shrink-0 rounded-2xl flex items-center justify-center transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );
}

export function ChatNavRail({
  onOpenProfile,
  showContactsManagement,
  showAIAssistant,
  onOpenMessages,
  onToggleContacts,
  onOpenAIAssistant,
}: ChatNavRailProps) {
  const isTabletOrDesktop = useBreakpoint('md');
  // Lấy avatar user từ Redux store thay vì hardcode Unsplash
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const avatarUrl = currentUser?.avatar ?? null;
  const displayName = currentUser?.displayName ?? 'U';
  // Ký tự đầu tên dùng làm AvatarFallback
  const initials = displayName.trim().charAt(0).toUpperCase();
  const activeRailItem: 'messages' | 'contacts' | 'ai' = showAIAssistant
    ? 'ai'
    : showContactsManagement
      ? 'contacts'
      : 'messages';

  return (
    <TooltipProvider delayDuration={300}>
      {/* ── Left vertical rail (always visible) ───────────────── */}
      <div
        className={cn(
          'flex bg-background border-r border-border text-foreground flex-col items-center shrink-0 z-20',
          isTabletOrDesktop ? 'w-16 py-6' : 'w-12 py-4',
        )}
      >
        {/* Avatar người dùng — dùng shadcn Avatar + AvatarFallback (Rule 1) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'shrink-0 rounded-full overflow-hidden border border-border shadow-sm hover:opacity-90 transition-opacity cursor-pointer',
                isTabletOrDesktop ? 'size-12 mb-6' : 'size-10 mb-4',
              )}
              onClick={onOpenProfile}
              onKeyDown={(e) => e.key === 'Enter' && onOpenProfile()}
              role="button"
              tabIndex={0}
            >
              <Avatar className={isTabletOrDesktop ? 'size-12' : 'size-10'}>
                <AvatarImage
                  src={avatarUrl ?? undefined}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback
                  className={cn(
                    'bg-primary/10 text-primary font-bold',
                    isTabletOrDesktop ? 'text-lg' : 'text-sm',
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">Thông tin tài khoản</TooltipContent>
        </Tooltip>

        {/* Navigation buttons */}
        <div className="flex-1 w-full flex flex-col items-center gap-2">
          {/* Chat — active khi đang ở màn hình chat (không quản lý bạn bè) */}
          <NavRailButton
            title="Tin nhắn"
            onClick={onOpenMessages}
            isActive={activeRailItem === 'messages'}
          >
            <MessageCircle
              className={cn('fill-current', isTabletOrDesktop ? 'size-6' : 'size-5')}
            />
          </NavRailButton>

          {/* Danh bạ */}
          <NavRailButton
            title="Quản lý bạn bè"
            onClick={onToggleContacts}
            isActive={activeRailItem === 'contacts'}
          >
            <Contact className={isTabletOrDesktop ? 'size-6' : 'size-5'} />
          </NavRailButton>

          {/* Separator */}
          <div className={cn('h-px shrink-0 bg-border my-1', isTabletOrDesktop ? 'w-8' : 'w-7')} />

          <NavRailButton
            title="Trợ lý AI"
            onClick={onOpenAIAssistant}
            isActive={activeRailItem === 'ai'}
          >
            <Sparkles className={isTabletOrDesktop ? 'size-6' : 'size-5'} />
          </NavRailButton>
        </div>
      </div>
    </TooltipProvider>
  );
}
