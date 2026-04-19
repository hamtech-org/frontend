import {
  Briefcase,
  Cloud,
  Contact,
  FolderOpen,
  Frame,
  Home,
  MessageCircle,
  Settings,
} from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';
import { cn } from '@/utils/cn';

type ChatNavRailProps = {
  navigate: NavigateFunction;
  onOpenProfile: () => void;
  showContactsManagement: boolean;
  onToggleContacts: () => void;
};

export function ChatNavRail({
  navigate,
  onOpenProfile,
  showContactsManagement,
  onToggleContacts,
}: ChatNavRailProps) {
  const toggleButtonClassName = (isActive: boolean) =>
    cn(
      'size-12 shrink-0 rounded-2xl flex items-center justify-center transition-colors',
      isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-primary-foreground/80 hover:bg-primary-foreground/10',
    );

  return (
    <div className="w-16 bg-primary text-primary-foreground flex flex-col items-center py-6 shrink-0 z-20">
      <div
        className="size-12 shrink-0 rounded-full overflow-hidden mb-6 border border-primary-foreground/20 shadow-sm hover:opacity-90 transition-opacity"
        onClick={onOpenProfile}
        onKeyDown={(e) => e.key === 'Enter' && onOpenProfile()}
        role="button"
        tabIndex={0}
        title="Thông tin tài khoản"
      >
        <img
          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
          className="w-full h-full object-cover"
          alt="My Profile"
        />
      </div>
      <div className="flex-1 w-full flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onToggleContacts}
          title="Trở lại chat"
          className={toggleButtonClassName(!showContactsManagement)}
        >
          <MessageCircle className="size-6 fill-primary-foreground" />
        </button>
        <button
          type="button"
          onClick={onToggleContacts}
          title="Quản lý bạn bè"
          className={toggleButtonClassName(showContactsManagement)}
        >
          <Contact className="size-6" />
        </button>

        <div className="w-8 h-px shrink-0 bg-primary-foreground/20 my-2" />

        <button
          type="button"
          onClick={() => navigate('/')}
          title="Về Bảng Tin"
          className="size-12 shrink-0 rounded-2xl flex items-center justify-center text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors mt-1"
        >
          <Home className="size-6" />
        </button>

        <button
          type="button"
          className="size-12 shrink-0 rounded-2xl flex items-center justify-center text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors"
        >
          <Cloud className="size-6" />
        </button>
        <button
          type="button"
          className="size-12 shrink-0 rounded-2xl flex items-center justify-center text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors"
        >
          <FolderOpen className="size-[22px] stroke-2" />
        </button>
        <button
          type="button"
          className="size-12 shrink-0 rounded-2xl flex items-center justify-center text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors"
        >
          <Frame className="size-[22px] border-dashed border-2 stroke-0 rounded border-current" />
        </button>
        <button
          type="button"
          className="size-12 shrink-0 rounded-2xl flex items-center justify-center text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors"
        >
          <Briefcase className="size-[22px]" />
        </button>
      </div>
      <div className="mt-auto w-full flex justify-center pb-2">
        <button
          type="button"
          className="size-12 shrink-0 rounded-2xl flex items-center justify-center text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors"
        >
          <Settings className="size-6" />
        </button>
      </div>
    </div>
  );
}
