import type { RefObject, SetStateAction, Dispatch } from 'react';
import { useMemo } from 'react';
import { Phone, Video } from 'lucide-react';
import { useSelector } from 'react-redux';
import { PendingFriendsPanel } from '@/components/chat/PendingFriendsPanel';
import { FriendsListView } from '@/components/chat/FriendsListView';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { PinnedMessagesBar } from '@/components/chat/PinnedMessagesBar';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ShellSurface } from '@/components/layout/ShellPrimitives';
import type { IConversation, IMessage, TypingUserEntry } from '@/types/chat.types';
import type { ContactsTabId } from '@/components/chat/ConversationListPanel';
import { useChatPageContext } from '@/pages/user/chat-page/ChatPageContext';
import { useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '@/store/store';
import { setReplyingTo } from '@/store/slices/chatSlice';
import { useCallContext } from '@/contexts/CallContext';

interface ChatMainContentProps {
  // UI visibility (from modalState)
  showContactsManagement: boolean;
  contactsTab: ContactsTabId;
  showInfo: boolean;
  onToggleShowInfo: () => void;

  // Typing
  typingUsers: readonly TypingUserEntry[];

  // Pinned messages (grouped)
  pinned: {
    primaryMessage: IMessage | null;
    otherMessages: IMessage[];
    showOtherPanel: boolean;
    onToggleOtherPanel: () => void;
    onScrollToMessage: (messageId: string) => void;
  };

  // Format helper
  formatMessageTime: (value: string) => string;

  // Scroll refs & state (grouped)
  scroll: {
    containerRef: RefObject<HTMLDivElement>;
    endRef: RefObject<HTMLDivElement>;
    allMessages: IMessage[];
    unreadIncomingCount: number;
    onJumpToLatest: () => void;
  };

  // Action menu (from modalState)
  actionMenuMsgId: string | null;
  onActionMenuMsgIdChange: Dispatch<SetStateAction<string | null>>;
  onStartEdit: (msg: IMessage) => void;

  // Modal openers
  onOpenPoll: () => void;
  onOpenTask: () => void;

  /** Khi không truyền (layout tối giản), chuyển tiếp media bị tắt. */
  shareTargetConversations?: IConversation[];
  onForwardMediaMessage?: (
    targetConversationIds: string[],
    message: IMessage,
    caption: string,
  ) => Promise<void>;
}

export function ChatMainContent(props: ChatMainContentProps) {
  const { core, group, groupActions, directActions, messageActions } = useChatPageContext();
  const dispatch = useDispatch<AppDispatch>();
  const { joinActiveGroupCall } = useCallContext();
  const activeGroupCall = useSelector((s: RootState) => s.call.activeGroupCall);
  const callStatus = useSelector((s: RootState) => s.call.status);

  const {
    showContactsManagement,
    contactsTab,
    showInfo,
    onToggleShowInfo,
    typingUsers,
    pinned,
    scroll,
    actionMenuMsgId,
    onActionMenuMsgIdChange,
    onStartEdit,
    onOpenPoll,
    onOpenTask,
    shareTargetConversations = [],
    onForwardMediaMessage = async () => {},
  } = props;

  const pinnedMessagesList = useMemo(() => {
    const primary = pinned.primaryMessage;
    const others = pinned.otherMessages;
    if (!primary) return others;
    const rest = others.filter((m) => m.messageId !== primary.messageId);
    return [primary, ...rest];
  }, [pinned.primaryMessage, pinned.otherMessages]);

  return (
    <ShellSurface className="flex-1 flex flex-col min-w-0 min-h-0 relative border-0">
      {showContactsManagement ? (
        contactsTab === 'friendRequests' ? (
          <PendingFriendsPanel onFriendRequestAccepted={directActions.handleFriendRequestAccepted} />
        ) : (
          <FriendsListView onFriendClick={directActions.handleFriendClick} />
        )
      ) : (
        <>
          <ChatHeader
            activeConversation={core.activeConversation}
            typingUsers={[...typingUsers]}
            showInfo={showInfo}
            onToggleShowInfo={onToggleShowInfo}
            onAddMember={groupActions.openAddMembersModal}
            onEditGroup={groupActions.openEditGroupModal}
            onAudioCall={
              core.activeConversation?.type === 'group'
                ? directActions.handleGroupAudioCall
                : directActions.handleAudioCall
            }
            onVideoCall={
              core.activeConversation?.type === 'group'
                ? directActions.handleGroupVideoCall
                : directActions.handleVideoCall
            }
            currentUserRole={core.currentUserRole}
          />

          {core.activeConversationId && pinnedMessagesList.length > 0 && (
            <PinnedMessagesBar
              pinnedMessages={pinnedMessagesList}
              onScrollToMessage={pinned.onScrollToMessage}
              onTogglePin={messageActions.handleTogglePinMsg}
            />
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
            actionMenuMsgId={actionMenuMsgId}
            onActionMenuMsgIdChange={onActionMenuMsgIdChange}
            onStartEdit={onStartEdit}
            onTogglePin={messageActions.handleTogglePinMsg}
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
          />

          {core.activeConversation?.type === 'group' &&
            activeGroupCall?.conversationId === core.activeConversationId && (
              <div className="shrink-0 px-3 pb-2 pt-1 border-t border-black/5 dark:border-white/10 bg-background">
                <div className="rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                  <div className="flex items-start gap-2 min-w-0">
                    {activeGroupCall.type === 'video' ? (
                      <Video className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    ) : (
                      <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {activeGroupCall.type === 'video' ? 'Cuộc gọi video nhóm' : 'Cuộc gọi thoại nhóm'}{' '}
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
            onOpenPoll={onOpenPoll}
            onOpenTask={onOpenTask}
          />
        </>
      )}
    </ShellSurface>
  );
}
