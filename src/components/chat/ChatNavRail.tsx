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
  return (
    <div className="w-[64px] bg-[#0068ff] flex flex-col items-center py-6 shrink-0 z-20">
      <div
        className="w-12 h-12 shrink-0 rounded-full overflow-hidden mb-6 border border-white/20 cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
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
          className={`w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
            !showContactsManagement ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
          }`}
        >
          <MessageCircle className="w-6 h-6 fill-white" />
        </button>
        <button
          type="button"
          onClick={onToggleContacts}
          title="Quản lý bạn bè"
          className={`w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
            showContactsManagement ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
          }`}
        >
          <Contact className="w-[26px] h-[26px]" />
        </button>

        <div className="w-8 h-px shrink-0 bg-white/20 my-2" />

        <button
          type="button"
          onClick={() => navigate('/')}
          title="Về Bảng Tin"
          className="w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors mt-1"
        >
          <Home className="w-6 h-6" />
        </button>

        <button
          type="button"
          className="w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors"
        >
          <Cloud className="w-6 h-6" />
        </button>
        <button
          type="button"
          className="w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors"
        >
          <FolderOpen className="w-[22px] h-[22px] stroke-[2]" />
        </button>
        <button
          type="button"
          className="w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors"
        >
          <Frame className="w-[22px] h-[22px] border-dashed border-2 stroke-0 rounded border-current" />
        </button>
        <button
          type="button"
          className="w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors"
        >
          <Briefcase className="w-[22px] h-[22px]" />
        </button>
      </div>
      <div className="mt-auto w-full flex justify-center pb-2">
        <button
          type="button"
          className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer transition-colors"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
