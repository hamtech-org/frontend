import type { RefObject, SetStateAction, Dispatch, ReactNode } from 'react';
import { Phone, Video } from 'lucide-react';
import { useSelector } from 'react-redux';
import { FriendsListView } from '@/components/chat/FriendsListView';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { PinnedMessagesBar } from '@/components/chat/PinnedMessagesBar';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import type { IConversation, IMessage, TypingUserEntry } from '@/types/chat.types';
import { useChatPageContext } from '@/pages/user/chat-page/ChatPageContext';
import { useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '@/store/store';
import { setReplyingTo } from '@/store/slices/chatSlice';
import { useCallContext } from '@/contexts/CallContext';

interface ChatMainContentProps {
  // UI visibility (from modalState)
  showContactsManagement: boolean;
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
  const showJoinGroupCall =
    core.activeConversation?.type === 'group' &&
    Boolean(core.activeConversationId) &&
    activeGroupCall?.conversationId === core.activeConversationId &&
    (callStatus === 'idle' || callStatus === 'ended');

  const {
    showContactsManagement,
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
        <FriendsListView onFriendClick={onFriendClick ?? directActions.handleFriendClick} />
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
            onTaskJoined={(taskId) => {
              group.setTasks((prev) =>
                prev.map((task) => {
                  if (task.taskId !== taskId) return task;
                  const participants = Array.isArray(task.participants) ? task.participants : [];
                  return participants.includes(core.currentUserId)
                    ? task
                    : { ...task, participants: [...participants, core.currentUserId] };
                }),
              );
            }}
            onOpenPollVote={groupActions.openPollVoteModal}
            shareTargetConversations={shareTargetConversations}
            onForwardMediaMessage={onForwardMediaMessage}
            onEditGroupTask={onEditGroupTask}
            onDeleteGroupTask={onDeleteGroupTask}
          />

          {postMessageListSlot}

          {core.activeConversation?.type === 'group' &&
            activeGroupCall?.conversationId === core.activeConversationId &&
            !showJoinGroupCall && (
              <div className="shrink-0 px-3 pb-2 pt-1 border-t border-border/40 bg-background">
                <div className="rounded-2xl border border-border/40 bg-card px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                  <div className="flex items-start gap-2 min-w-0">
                    {activeGroupCall.type === 'video' ? (
                      <Video className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    ) : (
                      <Phone className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {activeGroupCall.type === 'video'
                          ? 'Cuộc gọi video nhóm'
                          : 'Cuộc gọi thoại nhóm'}{' '}
                        <span className="font-normal text-muted-foreground">đang diễn ra</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tham gia muộn nếu bạn chưa vào kênh — nút sẽ ẩn khi cuộc gọi kết thúc.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={callStatus !== 'idle' && callStatus !== 'ended'}
                    onClick={() => joinActiveGroupCall()}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-45 disabled:pointer-events-none text-white text-sm font-medium"
                  >
                    Tham gia
                  </button>
                </div>
              </div>
            )}

          <ChatComposer
            activeConversation={core.activeConversation}
            activeConversationId={core.activeConversationId}
            currentUserRole={core.currentUserRole}
            onOpenPoll={onOpenPoll}
            onOpenTask={onOpenTask}
            onOpenAISummary={groupActions.openAISummaryFromPanel}
          />
        </>
      )}
    </div>
  );
}
