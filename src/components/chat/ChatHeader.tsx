import {
  PanelRight,
  PanelRightClose,
  Phone,
  Search,
  User,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';
import type { IConversation } from '@/types/chat.types';
import type { TypingUserEntry } from '@/store/slices/chatSlice';
import { typingLabel } from '@/utils/chatUtils';

type ChatHeaderProps = {
  activeConversation: IConversation | undefined;
  typingUsers: TypingUserEntry[];
  showInfo: boolean;
  onToggleShowInfo: () => void;
};

export function ChatHeader({
  activeConversation,
  typingUsers,
  showInfo,
  onToggleShowInfo,
}: ChatHeaderProps) {
  return (
    <div className="h-20 px-8 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-inherit/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-600/20 bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          {activeConversation?.avatar ? (
            <img
              src={activeConversation.avatar}
              alt={activeConversation.name ?? 'Chat'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : activeConversation?.type === 'group' ? (
            <Users className="w-5 h-5 text-blue-600" />
          ) : (
            <User className="w-5 h-5 text-blue-600" />
          )}
        </div>
        <div>
          <h2 className="font-bold leading-tight">{activeConversation?.name ?? 'Chọn hội thoại'}</h2>
          <p className="text-xs text-muted-foreground font-medium">
            {activeConversation?.type === 'group' ? (
              `${activeConversation.memberCount} thành viên`
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
      <div className="flex items-center gap-1 sm:gap-2">
        {activeConversation?.type === 'group' ? (
          <>
            <button
              type="button"
              title="Thêm thành viên"
              className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              type="button"
              title="Tìm kiếm tin nhắn"
              className="hidden sm:block p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              type="button"
              title="Cuộc gọi Video Nhóm"
              className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600"
            >
              <Video className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              title="Tạo nhóm trò chuyện mới"
              className="hidden sm:block p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              type="button"
              title="Gọi thoại"
              className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              type="button"
              title="Gọi video"
              className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600"
            >
              <Video className="w-5 h-5" />
            </button>
          </>
        )}
        <div className="hidden sm:block w-px h-6 bg-inherit mx-1" />
        <button
          type="button"
          onClick={onToggleShowInfo}
          title={showInfo ? 'Đóng thông tin hội thoại' : 'Mở thông tin hội thoại'}
          className={`p-2 sm:p-2.5 rounded-full transition-all text-muted-foreground hover:text-blue-600 ${showInfo ? 'bg-blue-600/10 text-blue-600' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
        >
          {showInfo ? <PanelRightClose className="w-5 h-5" /> : <PanelRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
