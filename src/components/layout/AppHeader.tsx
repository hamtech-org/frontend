import React from 'react';
import { Bell, PanelLeft, PanelLeftClose } from 'lucide-react';
import { cn } from '@/utils/cn';
import GlobalSearchBox from '@/components/search/GlobalSearchBox';
import type { IUser } from '@/types/user.types';

interface AppHeaderProps {
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  currentUser?: IUser | null;
  onToggleSidebar: () => void;
  onOpenProfile: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  isDarkMode,
  isSidebarOpen,
  currentUser,
  onToggleSidebar,
  onOpenProfile,
}) => (
  <header
    className={cn(
      'h-20 px-8 flex items-center justify-between border-b sticky top-0 z-40 backdrop-blur-md',
      isDarkMode ? 'bg-midnight-bg/80 border-midnight-border' : 'bg-ethereal-bg/80 border-ethereal-border',
    )}
  >
    <div className="flex items-center gap-4 flex-1 max-w-xl">
      <button onClick={onToggleSidebar} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all">
        {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
      </button>

      <GlobalSearchBox isDarkMode={isDarkMode} currentUserId={currentUser?.userId} />
    </div>

    <div className="flex items-center gap-6">
      <button className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all">
        <Bell className="w-5 h-5" />
        <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-inherit" />
      </button>
      <div
        className="flex items-center gap-3 pl-6 border-l border-inherit cursor-pointer hover:opacity-75 transition-opacity"
        onClick={onOpenProfile}
      >
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold">{currentUser?.displayName || 'Người dùng'}</p>
          <p className="text-xs text-muted-foreground">{currentUser?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</p>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-linear-to-tr from-blue-600 to-[#f4c25f] flex items-center justify-center text-white font-bold">
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

export default AppHeader;
