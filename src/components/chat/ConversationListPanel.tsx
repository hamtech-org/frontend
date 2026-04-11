import { motion } from 'motion/react';
import { ChevronDown, MoreHorizontal, Search, User, UserPlus, Users } from 'lucide-react';
import type { IConversation } from '@/types/chat.types';
import { formatConversationListLastPreview } from '@/utils/chatUtils';

type ConversationListPanelProps = {
  conversations: IConversation[];
  convsLoading: boolean;
  activeConversationId: string | null;
  currentUserId: string;
  onSelectConversation: (conversationId: string) => void;
  formatMessageTime: (createdAt: string) => string;
  onOpenCreateGroup: () => void;
  onOpenMarkRead: () => void;
};

export function ConversationListPanel({
  conversations,
  convsLoading,
  activeConversationId,
  currentUserId,
  onSelectConversation,
  formatMessageTime,
  onOpenCreateGroup,
  onOpenMarkRead,
}: ConversationListPanelProps) {
  return (
    <div className="w-[340px] border-r border-black/5 dark:border-white/5 flex flex-col shrink-0 min-h-0 bg-white dark:bg-[#1a1a1a]">
      <div className="pt-5 px-4 space-y-4 shrink-0 border-b border-black/5 dark:border-white/5 mb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm"
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border-none focus:ring-1 ring-blue-600/50 transition-all outline-none text-sm font-medium"
            />
          </div>
          <button
            type="button"
            title="Thêm bạn bè"
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-black dark:hover:text-white transition-colors"
          >
            <UserPlus className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={onOpenCreateGroup}
            title="Tạo nhóm mới"
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-black dark:hover:text-white transition-colors"
          >
            <Users className="w-[18px] h-[18px]" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              type="button"
              className="text-sm font-bold text-blue-600 border-b-[3px] border-blue-600 pb-2.5 transition-colors"
            >
              Ưu tiên
            </button>
            <button
              type="button"
              className="text-sm font-bold text-muted-foreground hover:text-black dark:hover:text-white border-b-[3px] border-transparent pb-2.5 transition-colors"
            >
              Khác
            </button>
          </div>
          <div className="flex items-center gap-3 pb-2.5">
            <button
              type="button"
              className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-black dark:hover:text-white transition-colors"
            >
              Phân loại <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenMarkRead}
              title="Đánh dấu đã đọc"
              className="text-muted-foreground hover:text-black dark:hover:text-white transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-2 min-h-0 custom-scrollbar pr-2 pb-4">
        {convsLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Đang tải...</div>
        )}
        {conversations.map((conv, index) => {
          const isActive = activeConversationId === conv.conversationId;
          const isGroup = conv.type === 'group';
          const displayName = conv.name ?? 'Hội thoại';
          const lastMsgText = formatConversationListLastPreview(conv, currentUserId);
          const lastMsgTime = conv.lastMessage?.createdAt ? formatMessageTime(conv.lastMessage.createdAt) : '';
          return (
            <motion.button
              key={conv.conversationId}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -20px 0px' }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: Math.min(index * 0.03, 0.3) }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onSelectConversation(conv.conversationId)}
              className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors group ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <div className="relative flex-shrink-0">
                {conv.avatar ? (
                  <img
                    src={conv.avatar}
                    alt={displayName}
                    className="w-11 h-11 rounded-full object-cover border-2 border-inherit"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center border-2 border-inherit">
                    {isGroup ? <Users className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-blue-600" />}
                  </div>
                )}
                {isGroup && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-inherit flex items-center justify-center">
                    <Users className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold truncate">{displayName}</p>
                  <p className={`text-[11px] font-medium ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {lastMsgTime}
                  </p>
                </div>
                <p className={`text-[13px] truncate mt-0.5 ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {lastMsgText}
                </p>
              </div>
              {(conv.unreadCount ?? 0) > 0 && !isActive && (
                <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {conv.unreadCount}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
