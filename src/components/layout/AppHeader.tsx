import React from 'react';
import { Bell, PanelLeft, PanelLeftClose, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import GlobalSearchBox from '@/components/search/GlobalSearchBox';
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
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all"
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
          className="md:hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
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
          className="sm:hidden relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          aria-label="Mở tìm kiếm"
        >
          <Search className="size-5" />
        </button>
        <button className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all">
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-inherit" />
        </button>
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
          <div className="size-9 sm:size-10 rounded-full overflow-hidden shrink-0 bg-linear-to-tr from-blue-600 to-[#f4c25f] flex items-center justify-center text-white font-bold">
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
