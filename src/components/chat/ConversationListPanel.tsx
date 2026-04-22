import { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AutoSizer, List, type ListRowRenderer } from 'react-virtualized';
import {
  BellOff,
  ChevronDown,
  Image,
  MessageCircle,
  Paperclip,
  Pin,
  Search,
  User,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { IConversation, IMessage } from '@/types/chat.types';
import {
  formatConversationListLastPreview,
  parseConversationListMediaPreview,
  sortConversationsForSidebar,
} from '@/utils/chatUtils';
import { formatZaloConversationTime } from '@/utils/formatDate';
import {
  ContactsManagementPanel,
  type ContactsTabId,
} from '@/components/chat/ContactsManagementPanel';
import { useChatPageContext } from '@/pages/user/chat-page/ChatPageContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  onOpenCreateGroup: () => void;
  onOpenAddFriend?: () => void;
  onToggleConversationMute?: (conversationId: string) => void;
  /** Tuỳ chọn: ghi đè formatter (mặc định Zalo + tick mỗi phút). */
  formatMessageTime?: (createdAt: string) => string;
};

function formatUnreadBadge(n: number): string {
  if (n > 99) return '99+';
  if (n > 9) return '9+';
  return String(n);
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
  onOpenCreateGroup,
  onOpenAddFriend,
  onToggleConversationMute,
  formatMessageTime: formatMessageTimeProp,
}: ConversationListPanelProps) {
  const {
    core: { currentUserId, activeConversationId },
  } = useChatPageContext();

  const [listTimeNow, setListTimeNow] = useState(() => new Date());
  const [mutedExpanded, setMutedExpanded] = useState(false);
  useEffect(() => {
    const tick = () => setListTimeNow(new Date());
    const id = window.setInterval(tick, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const blurCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurCloseTimerRef.current) clearTimeout(blurCloseTimerRef.current);
    };
  }, []);

  const q = searchQuery.trim().toLowerCase();

  /** Nhóm đã giải tán không còn trong sidebar (đồng bộ với API đã lọc `isDeleted`). */
  const listableConversations = useMemo(
    () => conversations.filter((c) => !(c.type === 'group' && c.isDeleted)),
    [conversations],
  );

  /** Thứ tự hiển thị sidebar: ghim hội thoại → nhiều tin ghim → hoạt động mới nhất. */
  const sortedSidebarConversations = useMemo(
    () => sortConversationsForSidebar(listableConversations),
    [listableConversations],
  );

  const sidebarBaseConversations = useMemo(() => {
    if (!q) return sortedSidebarConversations;
    const hit = listableConversations.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const preview = formatConversationListLastPreview(c, currentUserId).toLowerCase();
      return name.includes(q) || preview.includes(q) || c.conversationId.toLowerCase().includes(q);
    });
    return sortConversationsForSidebar(hit);
  }, [currentUserId, listableConversations, q, sortedSidebarConversations]);

  const { pinnedConversations, normalConversations, mutedConversations } = useMemo(() => {
    // Rule chuẩn:
    // pinnedChats = pinned (không phụ thuộc muted)
    // normalChats = !pinned && !muted
    // mutedChats = !pinned && muted
    const pinned = sidebarBaseConversations.filter((c) => c.isPinnedToTop).slice(0, 5);
    const normal = sidebarBaseConversations.filter((c) => !c.isPinnedToTop && !c.isMuted);
    const muted = sidebarBaseConversations.filter((c) => !c.isPinnedToTop && c.isMuted);
    return { pinnedConversations: pinned, normalConversations: normal, mutedConversations: muted };
  }, [sidebarBaseConversations]);

  const prevMutedCountRef = useRef<number>(mutedConversations.length);
  useEffect(() => {
    const prev = prevMutedCountRef.current;
    const next = mutedConversations.length;
    prevMutedCountRef.current = next;

    if (next <= 0) {
      // Không có muted chats → collapse/ẩn panel
      setMutedExpanded(false);
      return;
    }
    // Muted section mặc định collapsed; không auto-expand khi vừa xuất hiện.
    if (prev <= 0 && next > 0) setMutedExpanded(false);
  }, [mutedConversations.length]);

  const totalMutedUnread = useMemo(() => {
    return mutedConversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
  }, [mutedConversations]);

  type MainRow =
    | { kind: 'header'; key: string; title: string; count?: number }
    | { kind: 'conversation'; key: string; conv: IConversation };

  const mainRows = useMemo<MainRow[]>(() => {
    const rows: MainRow[] = [];
    if (pinnedConversations.length > 0) {
      rows.push({ kind: 'header', key: 'h:pinned', title: 'Ghim', count: pinnedConversations.length });
      for (const c of pinnedConversations) rows.push({ kind: 'conversation', key: `c:${c.conversationId}`, conv: c });
    }
    rows.push({ kind: 'header', key: 'h:chats', title: 'Tin nhắn', count: normalConversations.length });
    for (const c of normalConversations) rows.push({ kind: 'conversation', key: `c:${c.conversationId}`, conv: c });
    return rows;
  }, [normalConversations, pinnedConversations]);

  const filteredConversations = useMemo(() => {
    if (!q) return [];
    const hit = listableConversations.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const preview = formatConversationListLastPreview(c, currentUserId).toLowerCase();
      return name.includes(q) || preview.includes(q) || c.conversationId.toLowerCase().includes(q);
    });
    return sortConversationsForSidebar(hit);
  }, [listableConversations, q, currentUserId]);

  const filteredMessages = useMemo(() => {
    if (!q || !activeConversationId || !activeMessages.length) return [];
    const hit = activeMessages.filter((m) => {
      const content = (m.content ?? '').toLowerCase();
      const sender = (m.senderDisplayName ?? m.senderId ?? '').toLowerCase();
      return content.includes(q) || sender.includes(q);
    });
    hit.sort((a, b) => {
      const ap = a.isPinned ? 1 : 0;
      const bp = b.isPinned ? 1 : 0;
      if (bp !== ap) return bp - ap;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return hit.slice(0, 8);
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
    <TooltipProvider delayDuration={300}>
      <div className="w-full md:w-[340px] md:border-r border-border flex flex-col shrink-0 min-h-0 h-full bg-card text-card-foreground">
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
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {preview}
                                </p>
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
                        <p className="text-sm font-medium text-muted-foreground">
                          Không tìm thấy kết quả
                        </p>
                        <p className="text-[12px] text-muted-foreground/70 text-center mt-1">
                          Thử tên hội thoại, nội dung tin (trong chat đang mở)
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
        
      </div>

      {showContactsManagement ? (
        <ContactsManagementPanel contactsTab={contactsTab} onContactsTabChange={onContactsTabChange} />
      ) : (
        <div className="flex-1 min-h-0 pl-0 pr-2 pb-4 flex flex-col gap-2">
          {/* pl-0: bỏ padding trái (trước đây px-4 làm list lệch quá sang phải) */}
          {convsLoading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Đang tải...
            </div>
          )}
          {!convsLoading && (
            <TooltipProvider delayDuration={150}>
              {(() => {
                type ConversationRowContext = 'main' | 'mutedSection';

                const renderConversationCard = (
                  conv: IConversation,
                  key: string,
                  style: React.CSSProperties,
                  rowContext: ConversationRowContext = 'main',
                ) => {
                  const inMutedSection = rowContext === 'mutedSection';
                  const isActive = activeConversationId === conv.conversationId;
                  const hasUnread = (conv.unreadCount ?? 0) > 0;
                  const isGroup = conv.type === 'group';
                  const isMuted = !!conv.isMuted;
                  const hasPinnedMessages = (conv.pinnedMessageCount ?? 0) > 0;
                  const isConvPinnedToTop = !!conv.isPinnedToTop;
                  /** Chỉ icon ghim hội thoại lên đầu; tin ghim trong chat không dùng icon này (tránh nhầm giới hạn 5). */
                  const showConvPinIcon = isConvPinnedToTop;
                  const displayName = conv.name ?? 'Hội thoại';
                  const lastMsgText = formatConversationListLastPreview(conv, currentUserId);
                  const lastMsgType = conv.lastMessage?.type;
                  const lastPreviewParts =
                    lastMsgType === 'image' || lastMsgType === 'video' || lastMsgType === 'file'
                      ? parseConversationListMediaPreview(lastMsgText, lastMsgType)
                      : { prefix: '', suffix: '' };
                  const lastMsgTime = conv.lastMessage?.createdAt
                    ? (formatMessageTimeProp?.(conv.lastMessage.createdAt) ??
                        formatZaloConversationTime(conv.lastMessage.createdAt, listTimeNow))
                    : '';

                  const baseIdle = 'hover:bg-black/5 dark:hover:bg-white/5';
                  const mutedIdle = 'bg-muted/40 opacity-60 hover:bg-muted/60';
                  /** Nút bật lại thông báo (chuông gạch) — hiện mọi hàng đang mute, kể cả trong panel muted. */
                  const showMuteToggle = isMuted && !!onToggleConversationMute;

                  return (
                    <div key={key} style={style} className="pb-2">
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-3 rounded-2xl flex items-center gap-2 transition-colors group ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : isMuted
                              ? mutedIdle
                              : baseIdle
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectConversation(conv.conversationId)}
                          className="flex flex-1 min-w-0 items-center gap-3 text-left rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        >
                          <div className="relative shrink-0">
                            {conv.avatar ? (
                              <img
                                src={conv.avatar}
                                alt={displayName}
                                className="w-11 h-11 rounded-full object-cover border-2 border-inherit"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center border-2 border-inherit">
                                {isGroup ? (
                                  <Users className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <User className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                            )}
                            {isGroup && (
                              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-inherit flex items-center justify-center">
                                <Users className="w-2 h-2 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left overflow-hidden min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-[15px] font-bold truncate">{displayName}</p>
                            </div>
                            <p
                              className={`text-[13px] mt-0.5 flex items-center gap-1 min-w-0 ${
                                isActive
                                  ? 'text-white/80'
                                  : hasUnread
                                    ? 'font-semibold text-foreground'
                                    : 'text-black/50 dark:text-white/50'
                              }`}
                            >
                              {lastMsgType === 'image' || lastMsgType === 'video' || lastMsgType === 'file' ? (
                                <>
                                  {lastPreviewParts.prefix ? (
                                    <span className="shrink-0">{lastPreviewParts.prefix}</span>
                                  ) : null}
                                  {lastMsgType === 'image' && (
                                    <Image
                                      className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white/90' : 'text-blue-500'}`}
                                      aria-hidden
                                    />
                                  )}
                                  {lastMsgType === 'video' && (
                                    <Video
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        isActive ? 'text-white/90' : 'text-violet-500'
                                      }`}
                                      aria-hidden
                                    />
                                  )}
                                  {lastMsgType === 'file' && (
                                    <Paperclip
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        isActive ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'
                                      }`}
                                      aria-hidden
                                    />
                                  )}
                                  {lastPreviewParts.suffix ? (
                                    <span className="truncate min-w-0">{lastPreviewParts.suffix}</span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="truncate min-w-0">{lastMsgText}</span>
                              )}
                            </p>
                          </div>
                        </button>

                        <div className="shrink-0 flex flex-col items-end gap-1 self-stretch justify-between py-0.5 pl-1 min-w-[52px]">
                          <div className="flex items-center gap-1 justify-end w-full flex-wrap">
                            {showMuteToggle ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onToggleConversationMute(conv.conversationId);
                                    }}
                                    className={`shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-full ${
                                      isActive ? 'hover:bg-white/15' : 'hover:bg-black/10 dark:hover:bg-white/10'
                                    }`}
                                    aria-label="Bật thông báo"
                                  >
                                    <BellOff
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        isActive ? 'text-white/90' : 'text-red-500 dark:text-red-400'
                                      }`}
                                      aria-hidden
                                    />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={6}>Đang tắt thông báo. Nhấn để bật.</TooltipContent>
                              </Tooltip>
                            ) : null}
                            <p
                              className={`text-[11px] font-medium tabular-nums shrink-0 ${
                                isActive ? 'text-white/70' : 'text-muted-foreground'
                              }`}
                            >
                              {lastMsgTime}
                            </p>
                          </div>
                          {showConvPinIcon && (
                            <div
                              className="flex items-center justify-end w-full gap-0.5"
                              title={
                                hasPinnedMessages
                                  ? 'Ghim hội thoại (có tin ghim trong chat)'
                                  : 'Ghim hội thoại lên đầu danh sách'
                              }
                            >
                              <span className="p-0.5 rounded-md shrink-0 pointer-events-none" aria-hidden>
                                <Pin
                                  className={`w-3.5 h-3.5 ${
                                    isActive ? 'text-white/85' : 'text-zinc-600 dark:text-zinc-400'
                                  }`}
                                  strokeWidth={1.75}
                                />
                              </span>
                            </div>
                          )}
                          {(conv.unreadCount ?? 0) > 0 && !isActive && (
                            <div className="min-h-[18px] min-w-[18px] px-1 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white leading-none">
                              {formatUnreadBadge(conv.unreadCount ?? 0)}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                };

                const renderMainRow: ListRowRenderer = ({ index, key, style }) => {
                  const row = mainRows[index];
                  if (!row) return null;

                  if (row.kind === 'header') {
                    const isPinnedHeader = row.key === 'h:pinned';
                    const isChatsHeader = row.key === 'h:chats';
                    return (
                      <div key={key} style={style} className="pt-2 pb-1">
                        <div className="px-3 flex items-center justify-between">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            {isPinnedHeader ? <Pin className="size-3.5" aria-hidden /> : null}
                            {isChatsHeader ? <MessageCircle className="size-3.5" aria-hidden /> : null}
                            <span>{row.title}</span>
                          </p>
                          {typeof row.count === 'number' ? (
                            <span className="tabular-nums text-muted-foreground/80">
                              {isPinnedHeader ? `${row.count}/5` : row.count}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  }

                  return renderConversationCard(row.conv, key, style);
                };

                const renderMutedRow =
                  (list: IConversation[]): ListRowRenderer =>
                  ({ index, key, style }) => {
                    const conv = list[index];
                    if (!conv) return null;
                    return renderConversationCard(conv, key, style, 'mutedSection');
                  };

                return (
                  <>
                    <div className="flex-1 min-h-0">
                      <AutoSizer>
                        {({ width, height }) => (
                          <List
                            width={width}
                            height={height}
                            rowCount={mainRows.length}
                            rowRenderer={renderMainRow}
                            rowHeight={({ index }) => (mainRows[index]?.kind === 'header' ? 34 : 96)}
                            overscanRowCount={10}
                            className="custom-scrollbar"
                          />
                        )}
                      </AutoSizer>
                    </div>

                    {mainRows.length <= 1 && mutedConversations.length === 0 && (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        Chưa có hội thoại.
                      </div>
                    )}

                    {mutedConversations.length > 0 && (
                      <div className="shrink-0 mt-3 rounded-xl border border-border/60 bg-card/50 backdrop-blur-[1px]">
                        <div className="pt-3 pb-1">
                          <div className="h-px bg-border/60 mb-3" />
                          <button
                            type="button"
                            onClick={() => setMutedExpanded((v) => !v)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate flex items-center gap-1.5">
                                <BellOff className="size-3.5 text-red-500" aria-hidden />
                                <span>Đã tắt thông báo</span>
                              </p>
                              <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                                {mutedConversations.length}
                              </span>
                              {totalMutedUnread > 0 && (
                                <span className="min-h-[16px] min-w-[16px] px-1 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white leading-none">
                                  {formatUnreadBadge(totalMutedUnread)}
                                </span>
                              )}
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 text-muted-foreground transition-transform ${
                                mutedExpanded ? 'rotate-0' : '-rotate-90'
                              }`}
                              aria-hidden
                            />
                          </button>
                        </div>

                        {mutedExpanded && (
                          <div className="h-[clamp(140px,25vh,240px)] min-h-0 pl-0 pr-2 pb-3 pt-2 border-t border-border/40">
                            <AutoSizer>
                              {({ width, height }) => (
                                <List
                                  width={width}
                                  height={height}
                                  rowCount={mutedConversations.length}
                                  rowRenderer={renderMutedRow(mutedConversations)}
                                  rowHeight={96}
                                  overscanRowCount={6}
                                  className="custom-scrollbar"
                                />
                              )}
                            </AutoSizer>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </TooltipProvider>
          )}
        </div>

        {showContactsManagement ? (
          <ContactsManagementPanel
            contactsTab={contactsTab}
            onContactsTabChange={onContactsTabChange}
          />
        ) : (
          <div className="flex-1 overflow-y-auto px-4 min-h-0 custom-scrollbar pr-2 pb-4 flex flex-col gap-2">
            {/* Skeleton list — thay text "Đang tải..." (Rule 1 — dùng Skeleton) */}
            {convsLoading && (
              <div className="flex flex-col gap-1 pt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-2xl">
                    <Skeleton className="size-11 rounded-full shrink-0" />
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <Skeleton className="h-3.5 w-3/4 rounded-full" />
                      <Skeleton className="h-3 w-1/2 rounded-full" />
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Skeleton className="h-3 w-8 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!convsLoading &&
              sortedSidebarConversations.map((conv, index) => {
                const isActive = activeConversationId === conv.conversationId;
                const hasUnread = (conv.unreadCount ?? 0) > 0;
                const isGroup = conv.type === 'group';
                const isMuted = !!conv.isMuted;
                const hasPinnedMessages = (conv.pinnedMessageCount ?? 0) > 0;
                const isConvPinnedToTop = !!conv.isPinnedToTop;
                /** Chỉ icon ghim hội thoại lên đầu; tin ghim trong chat không dùng icon này (tránh nhầm giới hạn 5). */
                const showConvPinIcon = isConvPinnedToTop;
                const displayName = conv.name ?? 'Hội thoại';
                const lastMsgText = formatConversationListLastPreview(conv, currentUserId);
                const lastMsgType = conv.lastMessage?.type;
                const lastPreviewParts =
                  lastMsgType === 'image' || lastMsgType === 'video' || lastMsgType === 'file'
                    ? parseConversationListMediaPreview(lastMsgText, lastMsgType)
                    : { prefix: '', suffix: '' };
                const lastMsgTime = conv.lastMessage?.createdAt
                  ? (formatMessageTimeProp?.(conv.lastMessage.createdAt) ??
                    formatZaloConversationTime(conv.lastMessage.createdAt, listTimeNow))
                  : '';
                return (
                  <motion.div
                    key={conv.conversationId}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -20px 0px' }}
                    transition={{
                      duration: 0.4,
                      ease: 'easeOut',
                      delay: Math.min(index * 0.03, 0.3),
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-3 rounded-2xl flex items-center gap-2 transition-colors group ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conv.conversationId)}
                      className="flex flex-1 min-w-0 items-center gap-3 text-left rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                      <div className="relative shrink-0">
                        {conv.avatar ? (
                          <img
                            src={conv.avatar}
                            alt={displayName}
                            className="w-11 h-11 rounded-full object-cover border-2 border-inherit"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center border-2 border-inherit">
                            {isGroup ? (
                              <Users className="w-5 h-5 text-blue-600" />
                            ) : (
                              <User className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        )}
                        {isGroup && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-inherit flex items-center justify-center">
                            <Users className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left overflow-hidden min-w-0">
                        <p className="text-[15px] font-bold truncate">{displayName}</p>
                        <p
                          className={`text-[13px] mt-0.5 flex items-center gap-1 min-w-0 ${
                            isActive
                              ? 'font-medium text-blue-700/80 dark:text-blue-300/80'
                              : hasUnread
                                ? 'font-semibold text-foreground'
                                : 'text-black/50 dark:text-white/50'
                          }`}
                        >
                          {lastMsgType === 'image' ||
                          lastMsgType === 'video' ||
                          lastMsgType === 'file' ? (
                            <>
                              {lastPreviewParts.prefix ? (
                                <span className="shrink-0">{lastPreviewParts.prefix}</span>
                              ) : null}
                              {lastMsgType === 'image' && (
                                <Image
                                  className={`w-3.5 h-3.5 shrink-0 text-blue-500`}
                                  aria-hidden
                                />
                              )}
                              {lastMsgType === 'video' && (
                                <Video
                                  className={`w-3.5 h-3.5 shrink-0 text-violet-500`}
                                  aria-hidden
                                />
                              )}
                              {lastMsgType === 'file' && (
                                <Paperclip
                                  className={`w-3.5 h-3.5 shrink-0 text-slate-600 dark:text-slate-400`}
                                  aria-hidden
                                />
                              )}
                              {lastPreviewParts.suffix ? (
                                <span className="truncate min-w-0">{lastPreviewParts.suffix}</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="truncate min-w-0">{lastMsgText}</span>
                          )}
                        </p>
                      </div>
                    </button>
                    <div className="shrink-0 flex flex-col items-end gap-1 self-stretch justify-between py-0.5 pl-1 min-w-[52px]">
                      <div className="flex items-center gap-1 justify-end w-full">
                        {isMuted && onToggleConversationMute && (
                          <button
                            type="button"
                            title="Bật thông báo"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleConversationMute(conv.conversationId);
                            }}
                            className={`p-0.5 rounded-md shrink-0 transition-colors ${isActive ? 'hover:bg-white/15' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
                          >
                            <BellOff
                              className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600/70 dark:text-blue-400/70' : 'text-zinc-500 dark:text-zinc-400'}`}
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          </button>
                        )}
                        <p
                          className={`text-[11px] font-medium tabular-nums shrink-0 ${isActive ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-muted-foreground'}`}
                        >
                          {lastMsgTime}
                        </p>
                      </div>
                      {showConvPinIcon && (
                        <div
                          className="flex items-center justify-end w-full gap-0.5"
                          title={
                            hasPinnedMessages
                              ? 'Ghim hội thoại (có tin ghim trong chat)'
                              : 'Ghim hội thoại lên đầu danh sách'
                          }
                        >
                          <span
                            className="p-0.5 rounded-md shrink-0 pointer-events-none"
                            aria-hidden
                          >
                            <Pin
                              className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400'}`}
                              strokeWidth={1.75}
                            />
                          </span>
                        </div>
                      )}
                      {(conv.unreadCount ?? 0) > 0 && !isActive && (
                        <div className="min-h-[18px] min-w-[18px] px-1 rounded-full bg-zinc-500/85 dark:bg-zinc-400/90 flex items-center justify-center text-[10px] font-bold text-white leading-none">
                          {formatUnreadBadge(conv.unreadCount ?? 0)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
