import type { RefObject, SetStateAction, Dispatch } from 'react';
import { PendingFriendsPanel } from '@/components/chat/PendingFriendsPanel';
import { FriendsListView } from '@/components/chat/FriendsListView';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { PinnedMessagesBar } from '@/components/chat/PinnedMessagesBar';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ShellSurface } from '@/components/layout/ShellPrimitives';
import type { TypingUserEntry } from '@/store/slices/chatSlice';
import type { IMessage } from '@/types/chat.types';
import type { ContactsTabId } from '@/components/chat/ConversationListPanel';
import { useChatPageContext } from '@/pages/user/chat-page/ChatPageContext';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store/store';
import { setReplyingTo } from '@/store/slices/chatSlice';

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
}

export function ChatMainContent(props: ChatMainContentProps) {
  const { core, group, groupActions, directActions, messageActions } = useChatPageContext();
  const dispatch = useDispatch<AppDispatch>();

  const {
    showContactsManagement,
    contactsTab,
    showInfo,
    onToggleShowInfo,
    typingUsers,
    pinned,
    formatMessageTime,
    scroll,
    actionMenuMsgId,
    onActionMenuMsgIdChange,
    onStartEdit,
    onOpenPoll,
    onOpenTask,
  } = props;

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
            onAudioCall={directActions.handleAudioCall}
            onVideoCall={directActions.handleVideoCall}
            currentUserRole={core.currentUserRole}
          />

          {core.activeConversationId && pinned.primaryMessage && (
            <PinnedMessagesBar
              primaryPinnedMessage={pinned.primaryMessage}
              otherPinnedMessages={pinned.otherMessages}
              showOtherPinnedPanel={pinned.showOtherPanel}
              onToggleOtherPinnedPanel={pinned.onToggleOtherPanel}
              onScrollToMessage={pinned.onScrollToMessage}
              onTogglePin={messageActions.handleTogglePinMsg}
              formatMessageTime={formatMessageTime}
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
          />

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
