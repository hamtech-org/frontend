import { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
  type ListRowRenderer,
} from 'react-virtualized';
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
import type { IConversation, IMessage } from '@/types/chat.types';
import {
  formatConversationListLastPreview,
  parseConversationListMediaPreview,
  sortConversationsForSidebar,
} from '@/utils/chatUtils';
import { formatZaloConversationTime } from '@/utils/formatDate';
import { resolveGroupAvatarDisplayUrl } from '@/utils/groupAvatarUrl';
import { resolveChatMediaFetchUrl } from '@/utils/chatMediaDownload';
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
      rows.push({
        kind: 'header',
        key: 'h:pinned',
        title: 'Ghim',
        count: pinnedConversations.length,
      });
      for (const c of pinnedConversations)
        rows.push({ kind: 'conversation', key: `c:${c.conversationId}`, conv: c });
    }
    rows.push({
      kind: 'header',
      key: 'h:chats',
      title: 'Tin nhắn',
      count: normalConversations.length,
    });
    for (const c of normalConversations)
      rows.push({ kind: 'conversation', key: `c:${c.conversationId}`, conv: c });
    return rows;
  }, [normalConversations, pinnedConversations]);

  const mainRowCacheRef = useRef<CellMeasurerCache | null>(null);
  if (mainRowCacheRef.current == null) {
    mainRowCacheRef.current = new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 96,
      minHeight: 24,
    });
  }
  const mainListRef = useRef<List | null>(null);

  const mutedRowCacheRef = useRef<CellMeasurerCache | null>(null);
  if (mutedRowCacheRef.current == null) {
    mutedRowCacheRef.current = new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 96,
    });
  }
  const mutedListRef = useRef<List | null>(null);

  const mainRowsMeasuringKey = useMemo(
    () => mainRows.map((r) => (r.kind === 'header' ? r.key : r.conv.conversationId)).join('|'),
    [mainRows],
  );

  const mutedMeasuringKey = useMemo(
    () => mutedConversations.map((c) => c.conversationId).join('|'),
    [mutedConversations],
  );

  useEffect(() => {
    mainRowCacheRef.current?.clearAll();
    mainListRef.current?.recomputeRowHeights(0);
  }, [mainRowsMeasuringKey, activeConversationId]);

  useEffect(() => {
    if (!mutedExpanded) return;
    mutedRowCacheRef.current?.clearAll();
    mutedListRef.current?.recomputeRowHeights(0);
  }, [mutedExpanded, mutedMeasuringKey, activeConversationId]);

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
    <div className="w-full md:w-[clamp(260px,28vw,340px)] h-full border-r border-border flex flex-col shrink-0 min-h-0 bg-card text-card-foreground">
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
                        const avatarSrc =
                          contact.type === 'group'
                            ? resolveGroupAvatarDisplayUrl(contact.avatar, {
                                conversationId: contact.conversationId,
                                avatarVersion: String(contact.memberCount ?? ''),
                              })
                            : contact.avatar
                              ? resolveChatMediaFetchUrl(contact.avatar)
                              : undefined;
                        return (
                          <button
                            key={contact.conversationId}
                            type="button"
                            onClick={() => pickConversation(contact.conversationId)}
                            className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-muted transition-colors text-left"
                          >
                            {avatarSrc ? (
                              <img
                                src={avatarSrc}
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
        <ContactsManagementPanel
          contactsTab={contactsTab}
          onContactsTabChange={onContactsTabChange}
          groupConversations={conversations.filter((c) => c.type === 'group')}
        />
      ) : (
        <div className="flex-1 min-h-0 pb-4 flex flex-col gap-2">
          {/* px-2 được chuyển vào bên trong item để chống cắt khúc khi scale/ring */}
          {convsLoading && (
            <div className="flex flex-col gap-2 px-3 pt-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="h-3.5 bg-muted rounded-full w-3/4" />
                    <div className="h-2.5 bg-muted/70 rounded-full w-1/2" />
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className="h-2.5 bg-muted rounded-full w-8" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!convsLoading && (
            <TooltipProvider delayDuration={150}>
              {(() => {
                const renderConversationCard = (
                  conv: IConversation,
                  _rowKey: string,
                  style: React.CSSProperties,
                  measureRef?: (element: HTMLElement | null) => void,
                ) => {
                  const isActive = activeConversationId === conv.conversationId;
                  const hasUnread = (conv.unreadCount ?? 0) > 0;
                  const isGroup = conv.type === 'group';
                  const isMuted = !!conv.isMuted;
                  const hasPinnedMessages = (conv.pinnedMessageCount ?? 0) > 0;
                  const isConvPinnedToTop = !!conv.isPinnedToTop;
                  /** Chỉ icon ghim hội thoại lên đầu; tin ghim trong chat không dùng icon này (tránh nhầm giới hạn 5). */
                  const showConvPinIcon = isConvPinnedToTop;
                  const displayName = conv.name ?? 'Hội thoại';
                  const avatarSrc = isGroup
                    ? resolveGroupAvatarDisplayUrl(conv.avatar, {
                        conversationId: conv.conversationId,
                        avatarVersion: String(conv.memberCount ?? ''),
                      })
                    : conv.avatar
                      ? resolveChatMediaFetchUrl(conv.avatar)
                      : undefined;
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

                  /** Nút bật lại thông báo (chuông gạch) — hiện mọi hàng đang mute, kể cả trong panel muted. */
                  const showMuteToggle = isMuted && !!onToggleConversationMute;

                  return (
                    <div ref={measureRef} style={style} className="px-2 pb-0.5">
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-2.5 rounded-2xl flex items-center gap-2 transition-colors group ${
                          isActive
                            ? 'bg-blue-500/12 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/20 dark:ring-blue-400/15'
                            : baseIdle
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectConversation(conv.conversationId)}
                          className="flex flex-1 min-w-0 items-center gap-3 text-left rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        >
                          <div className="relative shrink-0">
                            {avatarSrc ? (
                              <img
                                key={
                                  isGroup
                                    ? `${conv.conversationId}:${conv.updatedAt ?? ''}:${avatarSrc}`
                                    : conv.avatar
                                }
                                src={avatarSrc}
                                alt={displayName}
                                className={`w-11 h-11 rounded-full object-cover border-2 ${isActive ? 'border-blue-500/30' : 'border-transparent'}`}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div
                                className={`w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center border-2 ${isActive ? 'border-blue-500/30' : 'border-transparent'}`}
                              >
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
                                  ? 'text-blue-600/70 dark:text-blue-300/70'
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
                                      className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-500' : 'text-blue-500'}`}
                                      aria-hidden
                                    />
                                  )}
                                  {lastMsgType === 'video' && (
                                    <Video
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        isActive ? 'text-violet-500' : 'text-violet-500'
                                      }`}
                                      aria-hidden
                                    />
                                  )}
                                  {lastMsgType === 'file' && (
                                    <Paperclip
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        isActive
                                          ? 'text-slate-600 dark:text-slate-400'
                                          : 'text-slate-600 dark:text-slate-400'
                                      }`}
                                      aria-hidden
                                    />
                                  )}
                                  {lastPreviewParts.suffix ? (
                                    <span className="truncate min-w-0">
                                      {lastPreviewParts.suffix}
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="truncate min-w-0">{lastMsgText}</span>
                              )}
                            </p>
                          </div>
                        </button>

                        <div className="shrink-0 flex flex-col items-end gap-1 self-stretch justify-between py-0.5 pl-1 min-w-[52px]">
                          {/* Top: Time */}
                          <p
                            className={`text-[11px] font-medium tabular-nums shrink-0 w-full text-right ${
                              isActive
                                ? 'text-blue-600/60 dark:text-blue-300/60'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {lastMsgTime}
                          </p>

                          {/* Bottom: Icons and Badges (horizontal) */}
                          <div className="flex items-center justify-end gap-1.5 w-full flex-nowrap mt-auto">
                            {showConvPinIcon && (
                              <span
                                className="shrink-0 pointer-events-none"
                                aria-hidden
                                title={
                                  hasPinnedMessages
                                    ? 'Ghim hội thoại (có tin ghim trong chat)'
                                    : 'Ghim hội thoại lên đầu danh sách'
                                }
                              >
                                <Pin
                                  className={`w-3.5 h-3.5 ${
                                    isActive
                                      ? 'text-blue-500/70'
                                      : 'text-zinc-600 dark:text-zinc-400'
                                  }`}
                                  strokeWidth={1.75}
                                />
                              </span>
                            )}

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
                                    className={`shrink-0 w-5 h-5 inline-flex items-center justify-center rounded-full ${
                                      isActive
                                        ? 'hover:bg-blue-500/10'
                                        : 'hover:bg-black/10 dark:hover:bg-white/10'
                                    }`}
                                    aria-label="Bật thông báo"
                                  >
                                    <BellOff
                                      className={`w-3.5 h-3.5 shrink-0 text-red-500 dark:text-red-400`}
                                      aria-hidden
                                    />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={6}>
                                  Đang tắt thông báo. Nhấn để bật.
                                </TooltipContent>
                              </Tooltip>
                            ) : null}

                            {(conv.unreadCount ?? 0) > 0 && !isActive && (
                              <div className="min-h-[18px] min-w-[18px] px-1 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white leading-none">
                                {formatUnreadBadge(conv.unreadCount ?? 0)}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                };

                const renderMainRow: ListRowRenderer = ({ index, key, parent, style }) => {
                  const row = mainRows[index];
                  if (!row) return null;

                  return (
                    <CellMeasurer
                      key={key}
                      cache={mainRowCacheRef.current!}
                      columnIndex={0}
                      parent={parent}
                      rowIndex={index}
                    >
                      {({ registerChild }) => {
                        if (row.kind === 'header') {
                          const isPinnedHeader = row.key === 'h:pinned';
                          const isChatsHeader = row.key === 'h:chats';
                          return (
                            <div ref={registerChild} style={style} className="pt-2 pb-1">
                              <div className="px-3 flex items-center justify-between">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                  {isPinnedHeader ? <Pin className="size-3.5" aria-hidden /> : null}
                                  {isChatsHeader ? (
                                    <MessageCircle className="size-3.5" aria-hidden />
                                  ) : null}
                                  <span>{row.title}</span>
                                </p>
                                {typeof row.count === 'number' ? (
                                  <span className="text-[10px] tabular-nums text-muted-foreground/60">
                                    {isPinnedHeader ? `${row.count}/5` : row.count}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        }

                        return renderConversationCard(row.conv, key, style, registerChild);
                      }}
                    </CellMeasurer>
                  );
                };

                const renderMutedRow =
                  (list: IConversation[]): ListRowRenderer =>
                  ({ index, key, parent, style }) => {
                    const conv = list[index];
                    if (!conv) return null;
                    return (
                      <CellMeasurer
                        key={key}
                        cache={mutedRowCacheRef.current!}
                        columnIndex={0}
                        parent={parent}
                        rowIndex={index}
                      >
                        {({ registerChild }) =>
                          renderConversationCard(conv, key, style, registerChild)
                        }
                      </CellMeasurer>
                    );
                  };

                return (
                  <>
                    <div className="flex-1 min-h-0">
                      <AutoSizer>
                        {({ width, height }) => (
                          <List
                            ref={mainListRef}
                            width={width}
                            height={height}
                            rowCount={mainRows.length}
                            deferredMeasurementCache={mainRowCacheRef.current!}
                            rowHeight={(info) => mainRowCacheRef.current!.rowHeight(info)}
                            rowRenderer={renderMainRow}
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
                                  ref={mutedListRef}
                                  width={width}
                                  height={height}
                                  rowCount={mutedConversations.length}
                                  deferredMeasurementCache={mutedRowCacheRef.current!}
                                  rowHeight={(info) => mutedRowCacheRef.current!.rowHeight(info)}
                                  rowRenderer={renderMutedRow(mutedConversations)}
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
      )}
    </div>
  );
}
