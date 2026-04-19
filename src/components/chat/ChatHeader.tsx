import {
  Edit3,
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
import type { TypingUserEntry } from '@/types/chat.types';
import { typingLabel } from '@/utils/chatUtils';

type ChatHeaderProps = {
  activeConversation: IConversation | undefined;
  typingUsers: TypingUserEntry[];
  showInfo: boolean;
  onToggleShowInfo: () => void;
  onAddMember?: () => void;
  onEditGroup?: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  currentUserRole?: 'owner' | 'admin' | 'member';
  /** Số thành viên từ API `/members` (ưu tiên hơn `memberCount` trên META). */
  resolvedMemberCount?: number;
  /** Mở tìm kiếm trong đoạn hội thoại hiện tại. */
  onSearchMessages?: () => void;
};

export function ChatHeader({
  activeConversation,
  typingUsers,
  showInfo,
  onToggleShowInfo,
  onAddMember,
  onEditGroup,
  onAudioCall,
  onVideoCall,
  currentUserRole,
  resolvedMemberCount,
  onSearchMessages,
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
          <div className="flex items-center gap-2">
            <h2 className="font-bold leading-tight">{activeConversation?.name ?? 'Chọn hội thoại'}</h2>
            {activeConversation?.type === 'group' && (
              <button
                type="button"
                title="Sửa tên nhóm"
                onClick={onEditGroup}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
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
      <div className="flex items-center gap-1 sm:gap-2">
        {activeConversation?.type === 'group' ? (
          <>
            <button
              type="button"
              title={
                isAdminOrOwner
                  ? 'Thêm thành viên'
                  : 'Mở danh sách để chọn (backend sẽ kiểm tra quyền thêm)'
              }
              onClick={canOpenAddMembers ? onAddMember : undefined}
              disabled={!canOpenAddMembers}
              className={`p-2 sm:p-2.5 rounded-full transition-all text-muted-foreground ${
                canOpenAddMembers
                  ? 'hover:bg-black/5 dark:hover:bg-white/5 hover:text-blue-600'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              type="button"
              title="Tìm kiếm tin nhắn trong hội thoại"
              onClick={canSearchMessages ? onSearchMessages : undefined}
              disabled={!canSearchMessages}
              className={`p-2 sm:p-2.5 rounded-full transition-all ${
                canSearchMessages
                  ? 'text-muted-foreground hover:bg-black/5 hover:text-blue-600 dark:hover:bg-white/5'
                  : 'cursor-not-allowed text-muted-foreground/40'
              }`}
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              type="button"
              title="Gọi thoại nhóm"
              onClick={onAudioCall}
              disabled={!onAudioCall}
              className={`p-2 sm:p-2.5 rounded-full transition-all text-muted-foreground ${
                onAudioCall
                  ? 'hover:bg-black/5 dark:hover:bg-white/5 hover:text-blue-600'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              type="button"
              title="Cuộc gọi video nhóm"
              onClick={onVideoCall}
              disabled={!onVideoCall}
              className={`p-2 sm:p-2.5 rounded-full transition-all text-muted-foreground ${
                onVideoCall
                  ? 'hover:bg-black/5 dark:hover:bg-white/5 hover:text-blue-600'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <Video className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              title="Gọi thoại"
              onClick={onAudioCall}
              className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              type="button"
              title="Gọi video"
              onClick={onVideoCall}
              className="p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600"
            >
              <Video className="w-5 h-5" />
            </button>
            <button
              type="button"
              title="Tìm kiếm tin nhắn trong hội thoại"
              onClick={canSearchMessages ? onSearchMessages : undefined}
              disabled={!canSearchMessages}
              className={`p-2 sm:p-2.5 rounded-full transition-all ${
                canSearchMessages
                  ? 'text-muted-foreground hover:bg-black/5 hover:text-blue-600 dark:hover:bg-white/5'
                  : 'cursor-not-allowed text-muted-foreground/40'
              }`}
            >
              <Search className="w-5 h-5" />
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
