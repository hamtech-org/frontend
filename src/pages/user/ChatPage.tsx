import { ChatMainContent } from '@/components/chat/ChatMainContent';
import { ChatModalsHost } from '@/components/chat/ChatModalsHost';
import { ChatNavRail } from '@/components/chat/ChatNavRail';
import { ChatSideInfoRail } from '@/components/chat/ChatSideInfoRail';
import { ConversationListPanel } from '@/components/chat/ConversationListPanel';
import { useCallContext } from '@/contexts/CallContext';
import { useSocketContext } from '@/contexts/SocketContext';
import { ChatPageProvider, useChatPageContextValue } from '@/pages/user/chat-page/ChatPageContext';
import { useChatMessageData } from '@/pages/user/chat-page/hooks/useChatMessageData';
import { useChatModalController } from '@/pages/user/chat-page/hooks/useChatModalController';
import { useChatRealtimeEvents } from '@/pages/user/chat-page/hooks/useChatRealtimeEvents';
import { useChatScrollBehavior } from '@/pages/user/chat-page/hooks/useChatScrollBehavior';
import { useConversationRealtimeLifecycle } from '@/pages/user/chat-page/hooks/useConversationRealtimeLifecycle';
import { useConversationRoutingSync } from '@/pages/user/chat-page/hooks/useConversationRoutingSync';
import { useDirectConversationActions } from '@/pages/user/chat-page/hooks/useDirectConversationActions';
import { useGroupConversationController } from '@/pages/user/chat-page/hooks/useGroupConversationController';
import { useGroupData } from '@/pages/user/chat-page/hooks/useGroupData';
import { useMessageModerationActions } from '@/pages/user/chat-page/hooks/useMessageModerationActions';
import {
  useCreateConversationMutation,
  useDeleteMessageMutation,
  useEditMessageMutation,
  useMarkAsReadMutation,
  usePinMessageMutation,
  useRecallMessageMutation,
  useUnpinMessageMutation,
  useGetConversationsQuery,
} from '@/store/api/chatApi';
import { useUploadMediaMutation } from '@/store/api/mediaApi';
import type { TypingUserEntry } from '@/store/slices/chatSlice';

import type { AppDispatch, RootState } from '@/store/store';
import { decodeJwtUserId } from '@/utils/chatUtils';
import { formatTime } from '@/utils/formatDate';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

const EMPTY_TYPING_USERS: ReadonlyArray<TypingUserEntry> = [];

export default function ChatPage() {
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const dispatch = useDispatch<AppDispatch>();

  // ── Auth ──────────────────────────────────────────────────────────────
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const currentUserId = useMemo(
    () => currentUser?.userId ?? decodeJwtUserId(accessToken) ?? '',
    [currentUser?.userId, accessToken],
  );

  // ── Conversations query ──────────────────────────────────────────────
  const {
    data: conversationsData,
    isLoading: convsLoading,
    isFetching: convsFetching,
    refetch: refetchConversations,
  } = useGetConversationsQuery();
  const conversations = useMemo(() => conversationsData?.data ?? [], [conversationsData?.data]);

  const activeConversationId = useSelector((state: RootState) => state.chat.activeConversationId);
  const activeConversation = conversations.find((c) => c.conversationId === activeConversationId);

  const typingUsers = useSelector((state: RootState) => {
    if (!activeConversationId) return EMPTY_TYPING_USERS;
    return state.chat.typingUsers[activeConversationId] ?? EMPTY_TYPING_USERS;
  });


  // ── Message data ─────────────────────────────────────────────────────
  const {
    allMessages,
    primaryPinnedMessage,
    otherPinnedMessages,
    latestMessageIdForRead,
    patchMessageInCache,
    removeMessageFromCache,
    handleReactMessage,
  } = useChatMessageData(activeConversationId);

  // ── RTK Query mutations ──────────────────────────────────────────────
  const [uploadMedia] = useUploadMediaMutation();
  const [createConversation] = useCreateConversationMutation();
  const [editMessage, { isLoading: isEditing }] = useEditMessageMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [recallMessage] = useRecallMessageMutation();
  const [markAsRead] = useMarkAsReadMutation();
  const [pinMessage] = usePinMessageMutation();
  const [unpinMessage] = useUnpinMessageMutation();

  // ── Group data ───────────────────────────────────────────────────────
  const {
    groupMembers,
    setGroupMembers,
    groupRequests,
    setGroupRequests,
    groupPolls,
    setGroupPolls,
    groupTasks,
    setGroupTasks,
    latestRecap,
    setLatestRecap,
    groupJoinRequested,
    setGroupJoinRequested,
    groupLoading,
    groupActionLoading,
    setActionBusy,
    fetchGroupMembers,
    fetchGroupRequests,
    fetchGroupPolls,
    fetchGroupTasks,
  } = useGroupData({
    activeConversationId,
    activeConversationType: activeConversation?.type,
    refetchConversations,
  });
  const currentUserRole = groupMembers.find((m) => m.userId === currentUserId)?.role;

  // ── Contexts ─────────────────────────────────────────────────────────
  const { initiateCall } = useCallContext();
  const { isConnected } = useSocketContext();

  // ── Modal state ──────────────────────────────────────────────────────
  const { state: modalState, actions: modalActions } = useChatModalController();

  // ── Group actions controller ─────────────────────────────────────────
  const groupController = useGroupConversationController({
    activeConversationId,
    activeConversation,
    currentUserId,
    currentUserDisplayName: currentUser?.displayName,
    currentUserRole,
    dispatch,
    uploadMedia,
    groupState: {
      groupMembers,
      groupRequests,
      groupPolls,
      groupTasks,
      groupJoinRequested,
      latestRecap,
    },
    groupSetters: {
      setGroupMembers,
      setGroupRequests,
      setGroupPolls,
      setGroupTasks,
      setGroupJoinRequested,
      setLatestRecap,
    },
    groupFetchers: { fetchGroupMembers, fetchGroupRequests, fetchGroupPolls, fetchGroupTasks },
    modalState,
    modalActions,
    setActionBusy,
    navigate,
  });

  // ── Direct conversation actions ──────────────────────────────────────
  const directActions = useDirectConversationActions({
    conversations,
    activeConversation,
    dispatch,
    navigate,
    createConversation,
    initiateCall,
    selectedGroupMembers: modalState.selectedGroupMembers,
    groupName: modalState.groupName,
    setShowCreateGroupModal: modalActions.setShowCreateGroupModal,
    setSelectedGroupMembers: modalActions.setSelectedGroupMembers,
    setGroupName: modalActions.setGroupName,
    setShowContactsManagement: modalActions.setShowContactsManagement,
  });

  // ── Message moderation ───────────────────────────────────────────────
  const {
    handleSaveEdit,
    handleRecallMsg,
    handleDeleteMsg,
    handleMessageConfirm,
    handleTogglePinMsg,
  } = useMessageModerationActions({
    dispatch,
    editingMessage: modalState.editingMessage,
    editDraft: modalState.editDraft,
    setEditingMessage: modalActions.setEditingMessage,
    setActionMenuMsgId: modalActions.setActionMenuMsgId,
    messageConfirm: modalState.messageConfirm,
    setMessageConfirm: modalActions.setMessageConfirm,
    setMessageConfirmSubmitting: modalActions.setMessageConfirmSubmitting,
    patchMessageInCache,
    removeMessageFromCache,
    editMessage,
    recallMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
  });

  // ── Memoized message actions for context ─────────────────────────────
  const messageActions = useMemo(
    () => ({
      handleSaveEdit,
      handleRecallMsg,
      handleDeleteMsg,
      handleMessageConfirm,
      handleTogglePinMsg,
      handleReactMessage,
    }),
    [handleSaveEdit, handleRecallMsg, handleDeleteMsg, handleMessageConfirm, handleTogglePinMsg, handleReactMessage],
  );

  // ── Build context value ──────────────────────────────────────────────
  const contextValue = useChatPageContextValue({
    currentUserId,
    currentUserRole,
    activeConversationId,
    activeConversation,
    groupMembers,
    groupRequests,
    groupPolls,
    groupTasks,
    groupJoinRequested,
    groupLoading,
    groupActionLoading,
    setGroupTasks,
    groupActions: groupController,
    directActions,
    messageActions,
  });

  // ── Scroll behavior ──────────────────────────────────────────────────
  const { messagesContainerRef, messagesEndRef, unreadIncomingCount, handleJumpToLatest } =
    useChatScrollBehavior({
      allMessages,
      activeConversationId,
      currentUserId,
      typingUsers,
      actionMenuMsgId: modalState.actionMenuMsgId,
      setActionMenuMsgId: modalActions.setActionMenuMsgId,
    });



  // ── Realtime events & lifecycle ──────────────────────────────────────
  useChatRealtimeEvents({
    dispatch,
    isConnected,
    activeConversationId,
    setActivePollId: modalActions.setActivePollId,
    setShowPollVoteModal: modalActions.setShowPollVoteModal,
    fetchGroupMembers,
    patchMessageInCache,
    removeMessageFromCache,
  });

  useConversationRoutingSync({
    dispatch,
    routeConversationId,
    conversations,
    convsLoading,
    convsFetching,
    navigate,
  });

  useConversationRealtimeLifecycle({
    activeConversationId,
    latestMessageIdForRead,
    dispatch,
    markAsRead,
  });

  // ── Side effects ─────────────────────────────────────────────────────
  useEffect(() => {
    void refetchConversations();
  }, [activeConversationId, refetchConversations]);

  useEffect(() => {
    modalActions.setShowOtherPinnedPanel(false);
    modalActions.setMessageConfirm(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  // ── Small helpers ────────────────────────────────────────────────────
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      void navigate(`/chat/${conversationId}`);
    },
    [navigate],
  );

  const scrollToMessageBubble = useCallback(
    (messageId: string) => {
      document.getElementById(`chat-msg-${messageId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      modalActions.setShowOtherPinnedPanel(false);
    },
    [modalActions],
  );

  const formatMessageTime = (createdAt: string) => formatTime(createdAt);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <ChatPageProvider value={contextValue}>
      <div className="w-full h-full min-h-0 flex overflow-hidden bg-background">
        <ChatNavRail
          navigate={navigate}
          onOpenProfile={() => modalActions.setShowProfileModal(true)}
          showContactsManagement={modalState.showContactsManagement}
          onToggleContacts={() => {
            modalActions.setShowContactsManagement((v) => !v);
            modalActions.setContactsTab('friends');
          }}
        />

        <ConversationListPanel
          conversations={conversations}
          convsLoading={convsLoading}
          activeMessages={allMessages}
          showContactsManagement={modalState.showContactsManagement}
          contactsTab={modalState.contactsTab}
          onContactsTabChange={modalActions.setContactsTab}
          onSelectConversation={handleSelectConversation}
          onPickSearchMessage={scrollToMessageBubble}
          formatMessageTime={formatMessageTime}
          onOpenCreateGroup={modalActions.openCreateGroupModal}
          onOpenMarkRead={() => modalActions.setShowMarkReadModal(true)}
          onOpenAddFriend={() => modalActions.setShowAddFriendModal(true)}
        />

        <ChatMainContent
          showContactsManagement={modalState.showContactsManagement}
          contactsTab={modalState.contactsTab}
          showInfo={modalState.showInfo}
          onToggleShowInfo={() => modalActions.setShowInfo((prev) => !prev)}
          typingUsers={typingUsers}
          pinned={{
            primaryMessage: primaryPinnedMessage,
            otherMessages: otherPinnedMessages,
            showOtherPanel: modalState.showOtherPinnedPanel,
            onToggleOtherPanel: () => modalActions.setShowOtherPinnedPanel((prev) => !prev),
            onScrollToMessage: scrollToMessageBubble,
          }}
          formatMessageTime={formatMessageTime}
          scroll={{
            containerRef: messagesContainerRef,
            endRef: messagesEndRef,
            allMessages,
            unreadIncomingCount,
            onJumpToLatest: handleJumpToLatest,
          }}
          actionMenuMsgId={modalState.actionMenuMsgId}
          onActionMenuMsgIdChange={modalActions.setActionMenuMsgId}
          onStartEdit={(msg) => {
            modalActions.setEditingMessage(msg);
            modalActions.setEditDraft(msg.content);
          }}
          onOpenPoll={() => modalActions.setShowPollModal(true)}
          onOpenTask={() => modalActions.setShowTaskModal(true)}
        />

        <ChatSideInfoRail
          showInfo={modalState.showInfo}
          showContactsManagement={modalState.showContactsManagement}
        />

        <ChatModalsHost
          state={modalState}
          actions={modalActions}
          isEditing={isEditing}
        />
      </div>
    </ChatPageProvider>
  );
}
