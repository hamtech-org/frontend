import type { RefObject, SetStateAction, Dispatch, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FriendsListView } from '@/components/chat/FriendsListView';
import { FriendRequestsView } from '@/components/chat/FriendRequestsView';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { PinnedMessagesBar } from '@/components/chat/PinnedMessagesBar';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import type { ContactsTabId } from '@/components/chat/ContactsManagementPanel';
import type { IConversation, IMessage, TypingUserEntry } from '@/types/chat.types';
import { useChatPageContext } from '@/pages/user/chat-page/ChatPageContext';
import type { AppDispatch, RootState } from '@/store/store';
import { setReplyingTo } from '@/store/slices/chatSlice';
import { useCallContext } from '@/contexts/CallContext';

interface ChatMainContentProps {
  // UI visibility (from modalState)
  showContactsManagement: boolean;
  contactsTab: ContactsTabId;
  showInfo: boolean;
  onToggleShowInfo: () => void;
  /** Mở drawer danh sách hội thoại (mobile). */
  onOpenConversationList?: () => void;

  // Typing
  typingUsers: readonly TypingUserEntry[];

  // Pinned messages (grouped)
  pinned: {
    pinnedMessagesOrdered: IMessage[];
    pinnedMessageCount: number;
    onScrollToMessage: (messageId: string) => void;
    onTogglePin: (msg: IMessage) => Promise<void>;
  };

  // Scroll refs & state (grouped)
  scroll: {
    containerRef: RefObject<HTMLDivElement>;
    endRef: RefObject<HTMLDivElement>;
    allMessages: IMessage[];
    unreadIncomingCount: number;
    isScrolledUp: boolean;
    onJumpToLatest: () => void;
  };

  // Jump highlight
  jumpHighlightMessageId: string | null;
  jumpFlashNonce: number;
  onJumpToMessage: (messageId: string) => void;

  // Action menu (from modalState)
  actionMenuMsgId: string | null;
  onActionMenuMsgIdChange: Dispatch<SetStateAction<string | null>>;
  onStartEdit: (msg: IMessage) => void;

  // Modal openers
  onOpenPoll: () => void;
  onOpenTask: () => void;

  // Search
  onSearchMessages?: () => void;
  resolvedMemberCount?: number;

  // Friend click for contacts view
  onFriendClick?: (friendId: string, friendName: string) => Promise<void>;
  onGroupClick?: (conversationId: string, groupName: string) => Promise<void>;
  groupConversations?: IConversation[];

  /** Khi không truyền (layout tối giản), chuyển tiếp media bị tắt. */
  shareTargetConversations?: IConversation[];
  onForwardMediaMessage?: (
    targetConversationIds: string[],
    message: IMessage,
    caption: string,
  ) => Promise<void>;

  onEditGroupTask?: (taskId: string) => void;
  onDeleteGroupTask?: (taskId: string) => void;

  /**
   * Callback quay lại danh sách hội thoại — chỉ dùng trên mobile.
   * Khi được truyền, ChatHeader sẽ hiển thị nút back (ẩn trên md+).
   */
  onBack?: () => void;

  /** Vùng tùy chọn ngay dưới danh sách tin (vd. banner realtime nhóm). */
  postMessageListSlot?: ReactNode;
}

export function ChatMainContent(props: ChatMainContentProps) {
  const { core, group, groupActions, directActions, messageActions } = useChatPageContext();
  const dispatch = useDispatch<AppDispatch>();
  const { joinActiveGroupCall } = useCallContext();
  const activeGroupCall = useSelector((s: RootState) => s.call.activeGroupCall);
  const callStatus = useSelector((s: RootState) => s.call.status);
  const callScope = useSelector((s: RootState) => s.call.callScope);
  const callConversationId = useSelector((s: RootState) => s.call.conversationId);
  const callChannelName = useSelector((s: RootState) => s.call.channelName);
  /** Đang trong chuông / kết nối / cuộc gọi nhóm của đúng hội thoại này — ẩn nút Tham gia (đã có modal hoặc CallPage). */
  const inThisGroupCallFlow =
    core.activeConversation?.type === 'group' &&
    Boolean(core.activeConversationId) &&
    activeGroupCall?.conversationId === core.activeConversationId &&
    callScope === 'group' &&
    callConversationId === core.activeConversationId &&
    ['incoming-ringing', 'outgoing-ringing', 'connecting', 'connected'].includes(callStatus) &&
    (!activeGroupCall.channelName ||
      !callChannelName ||
      activeGroupCall.channelName === callChannelName);
  const showJoinGroupCall =
    core.activeConversation?.type === 'group' &&
    Boolean(core.activeConversationId) &&
    activeGroupCall?.conversationId === core.activeConversationId &&
    !inThisGroupCallFlow;

  const {
    showContactsManagement,
    contactsTab,
    showInfo,
    onToggleShowInfo,
    onOpenConversationList,
    typingUsers,
    pinned,
    scroll,
    jumpHighlightMessageId,
    jumpFlashNonce,
    onJumpToMessage,
    actionMenuMsgId,
    onActionMenuMsgIdChange,
    onStartEdit,
    onOpenPoll,
    onOpenTask,
    onSearchMessages,
    resolvedMemberCount,
    onFriendClick,
    onGroupClick,
    groupConversations = [],
    shareTargetConversations = [],
    onForwardMediaMessage = async () => {},
    onBack,
    postMessageListSlot,
    onEditGroupTask,
    onDeleteGroupTask,
  } = props;

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
      {showContactsManagement ? (
        contactsTab === 'friendRequests' ? (
          <FriendRequestsView />
        ) : contactsTab === 'friends' ? (
          <FriendsListView onFriendClick={onFriendClick ?? directActions.handleFriendClick} />
        ) : contactsTab === 'groups' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-1">
            {groupConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có nhóm nào.</p>
            ) : (
              groupConversations.map((conv) => {
                const name = conv.name ?? 'Nhóm';
                return (
                  <button
                    key={conv.conversationId}
                    type="button"
                    onClick={() =>
                      void (onGroupClick ?? directActions.handleGroupClick)(
                        conv.conversationId,
                        name,
                      )
                    }
                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="relative shrink-0 w-11 h-11 rounded-full overflow-hidden">
                      {conv.avatar ? (
                        <img
                          src={conv.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-600">
                          {name.trim().slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-black dark:text-white truncate">
                        {name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conv.memberCount != null ? `${conv.memberCount} thành viên` : 'Nhóm'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Chưa hỗ trợ màn hình này.
          </div>
        )
      ) : (
        <>
          <ChatHeader
            activeConversation={core.activeConversation}
            typingUsers={[...typingUsers]}
            showInfo={showInfo}
            onToggleShowInfo={onToggleShowInfo}
            onOpenConversationList={onOpenConversationList}
            onAddMember={groupActions.openAddMembersModal}
            onEditGroup={groupActions.openEditGroupModal}
            onAudioCall={
              core.activeConversation?.type === 'group'
                ? directActions.handleGroupAudioCall
                : directActions.handleAudioCall
            }
            onVideoCall={
              core.activeConversation?.type === 'group'
                ? showJoinGroupCall
                  ? joinActiveGroupCall
                  : directActions.handleGroupVideoCall
                : directActions.handleVideoCall
            }
            showJoinGroupCall={showJoinGroupCall}
            joinGroupCallLabel={
              activeGroupCall?.type === 'video' ? 'Tham gia video' : 'Tham gia thoại'
            }
            onJoinGroupCall={joinActiveGroupCall}
            currentUserRole={core.currentUserRole}
            resolvedMemberCount={resolvedMemberCount}
            onSearchMessages={onSearchMessages}
            onBack={onBack}
          />

          {core.activeConversationId && pinned.pinnedMessagesOrdered.length > 0 && (
            <div className="w-full shrink-0">
              <PinnedMessagesBar
                key={core.activeConversationId}
                pinnedMessages={pinned.pinnedMessagesOrdered}
                onScrollToMessage={pinned.onScrollToMessage}
                onTogglePin={pinned.onTogglePin}
              />
            </div>
          )}

          <div className="relative flex flex-1 min-h-0 flex-col">
            <ChatMessageList
              messagesContainerRef={scroll.containerRef}
              messagesEndRef={scroll.endRef}
              allMessages={scroll.allMessages}
              activeConversationId={core.activeConversationId}
              activeConversation={core.activeConversation}
              currentUserId={core.currentUserId}
              typingUsers={[...typingUsers]}
              unreadIncomingCount={scroll.unreadIncomingCount}
              jumpHighlightMessageId={jumpHighlightMessageId}
              jumpFlashNonce={jumpFlashNonce}
              onJumpToMessage={onJumpToMessage}
              actionMenuMsgId={actionMenuMsgId}
              onActionMenuMsgIdChange={onActionMenuMsgIdChange}
              onStartEdit={onStartEdit}
              onTogglePin={pinned.onTogglePin}
              onRecall={messageActions.handleRecallMsg}
              onDelete={messageActions.handleDeleteMsg}
              onReply={(msg) => dispatch(setReplyingTo(msg))}
              onReact={messageActions.handleReactMessage}
              onJumpToLatest={scroll.onJumpToLatest}
              groupTasks={group.tasks}
              groupMembers={group.members}
              onTaskJoined={
                core.activeConversation?.type === 'group'
                  ? (taskId) => {
                      void groupActions.handleTaskJoined(String(taskId));
                    }
                  : undefined
              }
              onOpenPollVote={groupActions.openPollVoteModal}
              shareTargetConversations={shareTargetConversations}
              onForwardMediaMessage={onForwardMediaMessage}
              onEditGroupTask={onEditGroupTask}
              onDeleteGroupTask={onDeleteGroupTask}
            />

            {scroll.isScrolledUp && core.activeConversationId && (
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                onClick={scroll.onJumpToLatest}
                className="absolute bottom-4 right-5 z-30 rounded-full bg-background/95 shadow-lg shadow-black/10 backdrop-blur-sm hover:scale-105 active:scale-95"
                aria-label="Cuộn xuống tin mới nhất"
              >
                <ChevronDown className="text-foreground/70" />
                {scroll.unreadIncomingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                    {scroll.unreadIncomingCount > 99 ? '99+' : scroll.unreadIncomingCount}
                  </span>
                )}
              </Button>
            )}
          </div>

          {postMessageListSlot}

          <ChatComposer
            activeConversation={core.activeConversation}
            activeConversationId={core.activeConversationId}
            currentUserRole={core.currentUserRole}
            groupMembers={group.members}
            onOpenPoll={onOpenPoll}
            onOpenTask={onOpenTask}
            onOpenAISummary={groupActions.openAISummaryFromPanel}
          />
        </>
      )}
    </div>
  );
}
