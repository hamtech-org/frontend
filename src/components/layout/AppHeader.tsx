import React, { useState } from 'react';
import { Bell, PanelLeft, PanelLeftClose, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import GlobalSearchBox from '@/components/search/GlobalSearchBox';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import logoUrl from '@/assets/images/logo_vuong.png';
import type { IUser } from '@/types/user.types';

interface AppHeaderProps {
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  isMobile: boolean;
  isMobileSidebarOpen: boolean;
  currentUser?: IUser | null;
  onToggleSidebar: () => void;
  onNavigateHome: () => void;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  isDarkMode,
  isSidebarOpen,
  isMobile,
  isMobileSidebarOpen,
  currentUser,
  onToggleSidebar,
  onNavigateHome,
  onOpenProfile,
  onOpenSearch,
}) => {
  const isSidebarExpanded = isMobile ? isMobileSidebarOpen : isSidebarOpen;
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header
      className={cn(
        'h-14 sm:h-16 md:h-20 px-3 sm:px-4 md:px-6 lg:px-8 flex items-center justify-between border-b sticky top-0 z-30 backdrop-blur-md',
        isDarkMode
          ? 'bg-midnight-bg/80 border-midnight-border'
          : 'bg-ethereal-bg/80 border-ethereal-border',
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0 md:max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {isSidebarExpanded ? (
            <PanelLeftClose className="size-5" />
          ) : (
            <PanelLeft className="size-5" />
          )}
        </button>
        <button
          type="button"
          onClick={onNavigateHome}
          className="md:hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Về trang chủ"
        >
          <img src={logoUrl} alt="HamTech Logo" className="w-8 h-8 min-w-8 min-h-8 shrink-0" />
        </button>

        <div className="hidden sm:block w-full">
          <GlobalSearchBox isDarkMode={isDarkMode} currentUserId={currentUser?.userId} />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 lg:gap-6">
        <button
          onClick={onOpenSearch}
          className="sm:hidden relative p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Mở tìm kiếm"
        >
          <Search className="size-5" />
        </button>
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Thông báo"
              aria-expanded={notificationsOpen}
              aria-haspopup="dialog"
            >
              <Bell className="size-5" />
              <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-background" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            sideOffset={8}
            className={cn(
              'w-[min(100vw-1.5rem,22rem)] sm:w-96 p-0 overflow-hidden',
              isDarkMode ? 'border-midnight-border bg-midnight-bg text-foreground' : '',
            )}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <PopoverHeader className="px-4 py-3 border-b border-border shrink-0">
              <PopoverTitle className="text-base font-semibold">Thông báo</PopoverTitle>
            </PopoverHeader>
            <div className="max-h-[min(70vh,20rem)] overflow-y-auto px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có thông báo mới.
            </div>
          </PopoverContent>
        </Popover>
        <div
          className="flex items-center gap-2 md:gap-3 md:pl-6 md:border-l md:border-inherit cursor-pointer hover:opacity-75 transition-opacity"
          onClick={onOpenProfile}
        >
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold">{currentUser?.displayName || 'Người dùng'}</p>
            <p className="text-xs text-muted-foreground">
              {currentUser?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
            </p>
          </div>
          <div className="size-9 sm:size-10 rounded-full overflow-hidden shrink-0 bg-primary/90 flex items-center justify-center text-primary-foreground font-bold">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
