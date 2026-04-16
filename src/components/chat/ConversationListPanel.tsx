import { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, MessageCircle, MoreHorizontal, Search, User, UserPlus, Users } from 'lucide-react';
import type { IConversation, IMessage } from '@/types/chat.types';
import { formatConversationListLastPreview } from '@/utils/chatUtils';
import { ContactsManagementPanel, type ContactsTabId } from '@/components/chat/ContactsManagementPanel';
import { useChatPageContext } from '@/pages/user/chat-page/ChatPageContext';

export type { ContactsTabId };

type ConversationListPanelProps = {
  conversations: IConversation[];
  convsLoading: boolean;
  /** Tin trong hội thoại đang mở — dùng cho mục “Tin nhắn” trong tìm kiếm sidebar. */
  activeMessages?: IMessage[];
  showContactsManagement: boolean;
  contactsTab: ContactsTabId;
  onContactsTabChange: (tab: ContactsTabId) => void;
  onSelectConversation: (conversationId: string) => void;
  onPickSearchMessage?: (messageId: string) => void;
  formatMessageTime: (createdAt: string) => string;
  onOpenCreateGroup: () => void;
  onOpenMarkRead: () => void;
  onOpenAddFriend?: () => void;
};

// Sort conversations by lastMessage.createdAt desc
function sortConversationsByLastMessage(convs: IConversation[]) {
  return [...convs].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function ConversationListPanel({
  conversations,
  convsLoading,
  activeMessages = [],
  showContactsManagement,
  contactsTab,
  onContactsTabChange,
  onSelectConversation,
  onPickSearchMessage,
  formatMessageTime,
  onOpenCreateGroup,
  onOpenMarkRead,
  onOpenAddFriend,
}: ConversationListPanelProps) {
  const { core: { currentUserId, activeConversationId } } = useChatPageContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const blurCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurCloseTimerRef.current) clearTimeout(blurCloseTimerRef.current);
    };
  }, []);

  const q = searchQuery.trim().toLowerCase();

  const filteredConversations = useMemo(() => {
    if (!q) return [];
    return conversations.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const preview = formatConversationListLastPreview(c, currentUserId).toLowerCase();
      return (
        name.includes(q) ||
        preview.includes(q) ||
        c.conversationId.toLowerCase().includes(q)
      );
    });
  }, [conversations, q, currentUserId]);

  const filteredMessages = useMemo(() => {
    if (!q || !activeConversationId || !activeMessages.length) return [];
    return activeMessages
      .filter((m) => {
        const content = (m.content ?? '').toLowerCase();
        const sender = (m.senderDisplayName ?? m.senderId ?? '').toLowerCase();
        return content.includes(q) || sender.includes(q);
      })
      .slice(0, 8);
  }, [activeMessages, activeConversationId, q]);

  const openSearchDropdown = searchQuery.trim().length > 0;

  const clearBlurTimer = () => {
    if (blurCloseTimerRef.current) {
      clearTimeout(blurCloseTimerRef.current);
      blurCloseTimerRef.current = null;
    }
  };

  const handleSearchFocus = () => {
    clearBlurTimer();
    if (searchQuery.trim().length > 0) setShowSearchResults(true);
  };

  const handleSearchBlur = () => {
    clearBlurTimer();
    blurCloseTimerRef.current = setTimeout(() => setShowSearchResults(false), 120);
  };

  const pickConversation = (conversationId: string) => {
    setSearchQuery('');
    setShowSearchResults(false);
    onSelectConversation(conversationId);
  };

  const pickMessage = (messageId: string) => {
    setSearchQuery('');
    setShowSearchResults(false);
    onPickSearchMessage?.(messageId);
  };

  return (
    <div className="w-[340px] border-r border-border flex flex-col shrink-0 min-h-0 bg-card text-card-foreground">
      <div className="pt-5 px-4 flex flex-col gap-4 shrink-0 border-b border-border mb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm"
              value={searchQuery}
              onChange={(e) => {
                const v = e.target.value;
                setSearchQuery(v);
                setShowSearchResults(v.trim().length > 0);
              }}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-muted border border-transparent focus:ring-1 ring-ring transition-colors outline-none text-sm font-medium"
            />
            <AnimatePresence>
              {showSearchResults && openSearchDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-xl max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-border"
                >
                  {filteredConversations.length > 0 && (
                    <div>
                      <div className="px-3 py-2 bg-muted">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Hội thoại ({filteredConversations.length})
                        </p>
                      </div>
                      {filteredConversations.slice(0, 8).map((contact) => {
                        const displayName = contact.name ?? 'Hội thoại';
                        const preview = formatConversationListLastPreview(contact, currentUserId);
                        return (
                          <button
                            key={contact.conversationId}
                            type="button"
                            onClick={() => pickConversation(contact.conversationId)}
                            className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-muted transition-colors text-left"
                          >
                            {contact.avatar ? (
                              <img
                                src={contact.avatar}
                                alt=""
                                className="size-9 rounded-full object-cover shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                {contact.type === 'group' ? (
                                  <Users className="size-4 text-primary" />
                                ) : (
                                  <User className="size-4 text-primary" />
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-foreground truncate">
                                {displayName}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">{preview}</p>
                            </div>
                            {contact.type === 'group' && (
                              <Users className="size-3.5 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredMessages.length > 0 && (
                    <div>
                      <div className="px-3 py-2 bg-muted">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Tin nhắn (trong hội thoại hiện tại)
                        </p>
                      </div>
                      {filteredMessages.map((msg) => (
                        <button
                          key={msg.messageId}
                          type="button"
                          onClick={() => pickMessage(msg.messageId)}
                          className="w-full px-3 py-2.5 flex items-start gap-2.5 hover:bg-muted transition-colors text-left"
                        >
                          <MessageCircle className="size-4 text-primary shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-muted-foreground">
                              {msg.senderDisplayName ?? msg.senderId}
                            </p>
                            <p className="text-[13px] text-foreground truncate">{msg.content}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredConversations.length === 0 && filteredMessages.length === 0 && (
                    <div className="px-4 py-8 flex flex-col items-center justify-center">
                      <Search className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">Không tìm thấy kết quả</p>
                      <p className="text-[12px] text-muted-foreground/70 text-center mt-1">
                        Thử tên hội thoại, nội dung tin (trong chat đang mở)
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            title="Thêm bạn bè"
            onClick={() => onOpenAddFriend?.()}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <UserPlus className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={onOpenCreateGroup}
            title="Tạo nhóm mới"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Users className="w-[18px] h-[18px]" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              type="button"
              className="text-sm font-bold text-primary border-b-[3px] border-primary pb-2.5 transition-colors"
            >
              Ưu tiên
            </button>
            <button
              type="button"
              className="text-sm font-bold text-muted-foreground hover:text-foreground border-b-[3px] border-transparent pb-2.5 transition-colors"
            >
              Khác
            </button>
          </div>
          <div className="flex items-center gap-3 pb-2.5">
            <button
              type="button"
              className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Phân loại <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenMarkRead}
              title="Đánh dấu đã đọc"
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showContactsManagement ? (
        <ContactsManagementPanel contactsTab={contactsTab} onContactsTabChange={onContactsTabChange} />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 min-h-0 custom-scrollbar pr-2 pb-4 flex flex-col gap-2">
          {convsLoading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Đang tải...
            </div>
          )}
          {!convsLoading &&
            sortConversationsByLastMessage(conversations).map((conv, index) => {
              const isActive = activeConversationId === conv.conversationId;
              const hasUnread = (conv.unreadCount ?? 0) > 0;
              const isGroup = conv.type === 'group';
              const displayName = conv.name ?? 'Hội thoại';
              const lastMsgText = formatConversationListLastPreview(conv, currentUserId);
              const lastMsgTime = conv.lastMessage?.createdAt
                ? formatMessageTime(conv.lastMessage.createdAt)
                : '';
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
                  className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-colors group ${isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-muted'}`}
                >
                  <div className="relative shrink-0">
                    {conv.avatar ? (
                      <img
                        src={conv.avatar}
                        alt={displayName}
                        className="size-11 rounded-full object-cover border-2 border-inherit"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center border-2 border-inherit">
                        {isGroup ? (
                          <Users className="size-5 text-primary" />
                        ) : (
                          <User className="size-5 text-primary" />
                        )}
                      </div>
                    )}
                    {isGroup && (
                      <div className="absolute bottom-0 right-0 size-3.5 bg-primary rounded-full border-2 border-inherit flex items-center justify-center">
                        <Users className="size-2 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="text-[15px] font-bold truncate">{displayName}</p>
                      <p
                        className={`text-[11px] font-medium ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}
                      >
                        {lastMsgTime}
                      </p>
                    </div>
                    <p
                      className={`text-[13px] truncate mt-0.5 ${
                        isActive
                          ? 'text-white/80'
                          : hasUnread
                            ? 'font-semibold text-foreground'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {lastMsgText}
                    </p>
                  </div>
                  {(conv.unreadCount ?? 0) > 0 && !isActive && (
                    <div className="size-4 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                      {conv.unreadCount}
                    </div>
                  )}
                </motion.button>
              );
            })}
        </div>
      )}
    </div>
  );
}
