import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ChatNavRail } from '@/components/chat/ChatNavRail';
import { ConversationListPanel } from '@/components/chat/ConversationListPanel';
import { ChatMainContent } from '@/components/chat/ChatMainContent';
import { AIAssistantPanel } from '@/components/chat/AIAssistantPanel';
import { ChatSideInfoRail } from '@/components/chat/ChatSideInfoRail';
import { ConversationInfoPanel } from '@/components/chat/ConversationInfoPanel';
import { ChatModalsHost } from '@/components/chat/ChatModalsHost';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useCallContext } from '@/contexts/CallContext';
import { useSocketContext } from '@/contexts/SocketContext';
import { ChatPageProvider, useChatPageContextValue } from '@/pages/user/chat-page/ChatPageContext';
import { useChatModalController } from '@/pages/user/chat-page/hooks/useChatModalController';
import { useChatMessageData } from '@/pages/user/chat-page/hooks/useChatMessageData';
import { useChatScrollBehavior } from '@/pages/user/chat-page/hooks/useChatScrollBehavior';
import { useTaskReminderScheduler } from '@/pages/user/chat-page/hooks/useTaskReminderScheduler';
import { useChatRealtimeEvents } from '@/pages/user/chat-page/hooks/useChatRealtimeEvents';
import { useConversationRealtimeLifecycle } from '@/pages/user/chat-page/hooks/useConversationRealtimeLifecycle';
import { useConversationRoutingSync } from '@/pages/user/chat-page/hooks/useConversationRoutingSync';
import { useDirectConversationActions } from '@/pages/user/chat-page/hooks/useDirectConversationActions';
import { useGroupConversationController } from '@/pages/user/chat-page/hooks/useGroupConversationController';
import { useGroupData } from '@/pages/user/chat-page/hooks/useGroupData';
import { useMessageModerationActions } from '@/pages/user/chat-page/hooks/useMessageModerationActions';
import { useChatMobileLayout } from '@/pages/user/chat-page/hooks/useChatMobileLayout';
import { useMessageJumpNavigation } from '@/pages/user/chat-page/hooks/useMessageJumpNavigation';
import { useConversationPreferences } from '@/pages/user/chat-page/hooks/useConversationPreferences';
import { useMessagePinController } from '@/pages/user/chat-page/hooks/useMessagePinController';
import { useConversationWithFreshGroupSettings } from '@/pages/user/chat-page/hooks/useConversationWithFreshGroupSettings';
import { resolveGroupMemberRole } from '@/utils/groupConversationPermissions';
import { useDueTaskNotifications } from '@/pages/user/chat-page/hooks/useDueTaskNotifications';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import {
  useGetConversationsQuery,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useRecallMessageMutation,
  useMarkAsReadMutation,
} from '@/store/api/chatApi';
import { useUploadMediaMutation } from '@/store/api/mediaApi';
import { applyMessageHiddenForMe } from '@/store/applyMessageHiddenForMe';
import type { AppDispatch, RootState } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import { decodeJwtUserId } from '@/utils/chatUtils';
import type { TypingUserEntry } from '@/types/chat.types';

const EMPTY_TYPING_USERS: readonly TypingUserEntry[] = [];

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const dispatch = useDispatch<AppDispatch>();

  const isTabletOrDesktop = useBreakpoint('md');

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const currentUserId = useMemo(
    () => currentUser?.userId ?? decodeJwtUserId(accessToken) ?? '',
    [currentUser?.userId, accessToken],
  );

  const {
    data: conversationsData,
    isLoading: convsLoading,
    isFetching: convsFetching,
    refetch: refetchConversations,
  } = useGetConversationsQuery();
  const conversations = useMemo(() => conversationsData?.data ?? [], [conversationsData?.data]);
  const conversationsPinnedToTop = useMemo(
    () => conversations.filter((c) => c.isPinnedToTop),
    [conversations],
  );

  const activeConversationId = useSelector((state: RootState) => state.chat.activeConversationId);
  const activeConversation = conversations.find((c) => c.conversationId === activeConversationId);
  const activeConversationForPermissions =
    useConversationWithFreshGroupSettings(activeConversation);

  const typingUsers = useSelector((state: RootState) => {
    if (!activeConversationId) return EMPTY_TYPING_USERS;
    return state.chat.typingUsers[activeConversationId] ?? EMPTY_TYPING_USERS;
  });

  const messageData = useChatMessageData(activeConversationId);

  const [sendMessage] = useSendMessageMutation();
  const [uploadMedia] = useUploadMediaMutation();
  const [editMessage, { isLoading: isEditing }] = useEditMessageMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [recallMessage] = useRecallMessageMutation();
  const [markAsRead] = useMarkAsReadMutation();

  const { initiateCall, initiateGroupCall } = useCallContext();
  const { isConnected } = useSocketContext();

  const {
    groupMembers,
    setGroupMembers,
    groupRequests,
    setGroupRequests,
    groupPolls,
    setGroupPolls,
    groupTasks,
    setGroupTasks,
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
    isSocketReady: isConnected,
  });
  const currentUserRole = useMemo(
    () =>
      resolveGroupMemberRole({
        userId: currentUserId,
        members: groupMembers,
        conversationLeaderId: activeConversation?.leaderId,
        conversationCreatorId: activeConversation?.creatorId,
      }),
    [currentUserId, groupMembers, activeConversation?.leaderId, activeConversation?.creatorId],
  );

  const { state: modalState, actions: modalActions } = useChatModalController();
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [focusTaskNonce, setFocusTaskNonce] = useState(0);
  const {
    mobileView,
    mobileListOpen,
    setMobileListOpen,
    handleSelectConversation,
    handleBackToList,
  } = useChatMobileLayout({
    isTabletOrDesktop,
    activeConversationId: activeConversationId ?? undefined,
    routeConversationId,
    navigate,
  });

  const convPrefs = useConversationPreferences({
    activeConversationId,
    conversations,
  });

  const pinController = useMessagePinController({
    dispatch,
    activeConversation: activeConversationForPermissions,
    currentUserId,
    groupMembers,
    pinnedMessagesOrdered: messageData.pinnedMessagesOrdered,
    allMessages: messageData.allMessages,
    patchMessageInCache: messageData.patchMessageInCache,
    setPinnedMessageOrderByConv: messageData.setPinnedMessageOrderByConv,
    setActionMenuMsgId: modalActions.setActionMenuMsgId,
  });

  const directActions = useDirectConversationActions({
    conversations,
    activeConversation,
    dispatch,
    navigate,
    initiateCall,
    initiateGroupCall,
    selectedGroupMembers: modalState.selectedGroupMembers,
    groupName: modalState.groupName,
    setShowCreateGroupModal: modalActions.setShowCreateGroupModal,
    setSelectedGroupMembers: modalActions.setSelectedGroupMembers,
    setGroupName: modalActions.setGroupName,
    setShowContactsManagement: modalActions.setShowContactsManagement,
  });

  const uploadMediaForGroup = useCallback(
    (payload: { file: File; mediaType: 'image' }) => uploadMedia(payload),
    [uploadMedia],
  );

  const groupController = useGroupConversationController({
    activeConversationId,
    activeConversation: activeConversationForPermissions,
    currentUserId,
    currentUserDisplayName: currentUser?.displayName,
    currentUserRole,
    dispatch,
    uploadMedia: uploadMediaForGroup,
    groupState: {
      groupMembers,
      groupRequests,
      groupPolls,
      groupTasks,
      groupJoinRequested,
    },
    groupSetters: {
      setGroupMembers,
      setGroupRequests,
      setGroupPolls,
      setGroupTasks,
      setGroupJoinRequested,
    },
    groupFetchers: {
      fetchGroupMembers,
      fetchGroupRequests,
      fetchGroupPolls,
      fetchGroupTasks,
    },
    refetchConversations,
    modalState: {
      editGroupAvatarPreview: modalState.editGroupAvatarPreview,
      editGroupName: modalState.editGroupName,
      editGroupAvatarFile: modalState.editGroupAvatarFile,
      taskTitle: modalState.taskTitle,
      taskNote: modalState.taskNote,
      taskAssignees: modalState.taskAssignees,
      taskAssignToAll: modalState.taskAssignToAll,
      taskDeadline: modalState.taskDeadline,
      pollQuestion: modalState.pollQuestion,
      pollOptions: modalState.pollOptions,
      pollMultipleChoice: modalState.pollMultipleChoice,
      selectedAddMembers: modalState.selectedAddMembers,
      editingTaskId: modalState.editingTaskId,
      taskSubtaskRows: modalState.taskSubtaskRows,
      taskDeleteConfirm: modalState.taskDeleteConfirm,
    },
    modalActions: {
      setEditGroupName: modalActions.setEditGroupName,
      setEditGroupAvatarFile: modalActions.setEditGroupAvatarFile,
      setEditGroupAvatarPreview: modalActions.setEditGroupAvatarPreview,
      setShowEditGroupModal: modalActions.setShowEditGroupModal,
      setSelectedAddMembers: modalActions.setSelectedAddMembers,
      setShowAddMembersModal: modalActions.setShowAddMembersModal,
      closeTaskModal: modalActions.closeTaskModal,
      setShowAISummaryModal: modalActions.setShowAISummaryModal,
      setAiSummaryResult: modalActions.setAiSummaryResult,
      setAiSummaryLoading: modalActions.setAiSummaryLoading,
      setShowPollModal: modalActions.setShowPollModal,
      setPollQuestion: modalActions.setPollQuestion,
      setPollOptions: modalActions.setPollOptions,
      setPollMultipleChoice: modalActions.setPollMultipleChoice,
      setTaskAssignToAll: modalActions.setTaskAssignToAll,
      setTaskAssignees: modalActions.setTaskAssignees,
      setActivePollId: modalActions.setActivePollId,
      setShowPollVoteModal: modalActions.setShowPollVoteModal,
      setShowTaskModal: modalActions.setShowTaskModal,
      setTaskTitle: modalActions.setTaskTitle,
      setTaskNote: modalActions.setTaskNote,
      setTaskDeadline: modalActions.setTaskDeadline,
      setEditingTaskId: modalActions.setEditingTaskId,
      setTaskDeleteConfirm: modalActions.setTaskDeleteConfirm,
      setTaskSubtaskRows: modalActions.setTaskSubtaskRows,
    },
    setActionBusy,
    navigate,
  });

  const { handleSaveEdit, handleRecallMsg, handleDeleteMsg, handleMessageConfirm } =
    useMessageModerationActions({
      dispatch,
      editingMessage: modalState.editingMessage,
      editDraft: modalState.editDraft,
      setEditingMessage: modalActions.setEditingMessage,
      setActionMenuMsgId: modalActions.setActionMenuMsgId,
      messageConfirm: modalState.messageConfirm,
      setMessageConfirm: modalActions.setMessageConfirm,
      setMessageConfirmSubmitting: modalActions.setMessageConfirmSubmitting,
      patchMessageInCache: messageData.patchMessageInCache,
      removeMessageFromCache: (conversationId, messageId) =>
        applyMessageHiddenForMe(dispatch, conversationId, messageId),
      editMessage,
      recallMessage,
      deleteMessage,
    });

  const messageActions = useMemo(
    () => ({
      handleSaveEdit,
      handleRecallMsg,
      handleDeleteMsg,
      handleMessageConfirm,
      handleTogglePinMsg: pinController.handleTogglePinMsg,
      handleReactMessage: messageData.handleReactMessage,
    }),
    [
      handleSaveEdit,
      handleRecallMsg,
      handleDeleteMsg,
      handleMessageConfirm,
      pinController.handleTogglePinMsg,
      messageData.handleReactMessage,
    ],
  );

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
    latestMessageIdForRead: messageData.latestMessageIdForRead,
    dispatch,
    markAsRead,
  });

  useChatRealtimeEvents({
    dispatch,
    isConnected,
    activeConversationId,
    currentUserId,
    setActivePollId: modalActions.setActivePollId,
    setShowPollVoteModal: modalActions.setShowPollVoteModal,
    fetchGroupMembers,
    patchMessageInCache: messageData.patchMessageInCache,
    setPinnedMessageOrderByConv: messageData.setPinnedMessageOrderByConv,
    navigate,
  });

  const {
    jumpHighlightMessageId,
    jumpFlashNonce,
    conversationSearchRequestTick,
    scrollToMessageBubble,
    requestOpenConversationSearch,
  } = useMessageJumpNavigation({
    activeConversationId: activeConversationId ?? undefined,
    onRequestOpenSearchPanel: () => {
      modalActions.setShowInfo(true);
    },
  });

  const { messagesContainerRef, messagesEndRef, unreadIncomingCount, handleJumpToLatest } =
    useChatScrollBehavior({
      allMessages: messageData.allMessages,
      activeConversationId,
      currentUserId,
      typingUsers,
      actionMenuMsgId: modalState.actionMenuMsgId,
      setActionMenuMsgId: modalActions.setActionMenuMsgId,
    });

  useEffect(() => {
    modalActions.setMessageConfirm(null);
  }, [activeConversationId, modalActions]);

  useEffect(() => {
    const sp = new URLSearchParams(location.search ?? '');
    const next = String(sp.get('focusTaskId') ?? '').trim();
    if (!next) return;
    setFocusTaskId(next);
    setFocusTaskNonce((x) => x + 1);
    modalActions.setShowInfo(true);
  }, [location.search, modalActions]);

  const handleForwardMediaMessage = useCallback(
    async (targetConversationIds: string[], msg: IMessage, caption: string) => {
      if (targetConversationIds.length === 0) return;
      if (!msg.mediaUrl || (msg.type !== 'image' && msg.type !== 'video' && msg.type !== 'file')) {
        throw new Error('invalid');
      }
      const text = caption.trim();
      const content = text.length > 0 ? text : ' ';
      for (const targetConversationId of targetConversationIds) {
        await sendMessage({
          conversationId: targetConversationId,
          type: msg.type,
          content,
          mediaUrl: msg.mediaUrl,
        }).unwrap();
      }
    },
    [sendMessage],
  );

  const handleFriendClick = useCallback(
    async (friendId: string, friendName: string) => {
      await directActions.handleFriendClick(friendId, friendName);
    },
    [directActions],
  );

  const handleOpenMessages = useCallback(() => {
    setShowAIAssistant(false);
    modalActions.setShowContactsManagement(false);
  }, [modalActions]);

  const handleToggleContacts = useCallback(() => {
    setShowAIAssistant(false);
    modalActions.setShowContactsManagement((v) => !v);
    modalActions.setContactsTab('friends');
  }, [modalActions]);

  const handleOpenAIAssistant = useCallback(() => {
    setShowAIAssistant(true);
    modalActions.setShowContactsManagement(false);
    modalActions.setShowInfo(false);
  }, [modalActions]);

  const handleOpenProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  const handleOpenMarkRead = useCallback(() => {
    modalActions.setShowMarkReadModal(true);
  }, [modalActions]);

  const handleOpenAddFriend = useCallback(() => {
    modalActions.setShowAddFriendModal(true);
  }, [modalActions]);

  const handleToggleShowInfo = useCallback(() => {
    modalActions.setShowInfo((v) => !v);
  }, [modalActions]);

  const handleCloseInfo = useCallback(() => {
    modalActions.setShowInfo(false);
  }, [modalActions]);

  const handleStartEdit = useCallback(
    (msg: IMessage) => {
      if (msg.type !== 'text') return;
      modalActions.setEditingMessage(msg);
      modalActions.setEditDraft(msg.content);
    },
    [modalActions],
  );

  const openCreateGroupModal = modalActions.openCreateGroupModal;

  const contextValue = useChatPageContextValue({
    currentUserId,
    currentUserRole,
    activeConversationId,
    activeConversation: activeConversationForPermissions,
    groupMembers,
    groupRequests,
    groupPolls,
    groupTasks,
    groupJoinRequested,
    groupLoading,
    groupActionLoading,
    setGroupTasks,
    messages: messageData.allMessages,
    groupActions: groupController,
    directActions,
    messageActions,
  });

  useTaskReminderScheduler({
    conversationId: activeConversationId,
    tasks: groupTasks,
    members: groupMembers.map((m) => ({ userId: m.userId, displayName: m.displayName })),
    currentUserId,
  });

  useDueTaskNotifications({
    conversations,
    currentUserId,
  });

  const convListPanelProps = {
    conversations,
    convsLoading,
    activeMessages: messageData.allMessages,
    showContactsManagement: modalState.showContactsManagement,
    contactsTab: modalState.contactsTab,
    onContactsTabChange: modalActions.setContactsTab,
    onSelectConversation: handleSelectConversation,
    onPickSearchMessage: scrollToMessageBubble,
    onOpenCreateGroup: openCreateGroupModal,
    onOpenMarkRead: handleOpenMarkRead,
    onOpenAddFriend: handleOpenAddFriend,
    onToggleConversationMute: convPrefs.handleToggleConversationMute,
  };

  const conversationInfoPanel = (
    <ConversationInfoPanel
      numRequests={groupRequests.length}
      activeConversation={activeConversationForPermissions}
      onOpenAISummaryFromPanel={groupController.openAISummaryFromPanel}
      onEditGroup={groupController.openEditGroupModal}
      onAddMembers={groupController.openAddMembersModal}
      onOpenCreateGroup={openCreateGroupModal}
      onToggleMuteNotifications={
        activeConversationId
          ? () => void convPrefs.handleToggleConversationMute(activeConversationId)
          : undefined
      }
      onApplyMuteFromModal={activeConversationId ? convPrefs.handleApplyMuteFromModal : undefined}
      onTogglePinConversation={
        activeConversationId
          ? () => void convPrefs.handleToggleConversationPin(activeConversationId)
          : undefined
      }
      onRequestJoin={() => void groupController.handleRequestJoin()}
      onVotePoll={(pollId, optionIndex) => void groupController.handleVotePoll(pollId, optionIndex)}
      onOpenPollVote={(pollId) => groupController.openPollVoteModal(pollId)}
      onAddPollOption={(pollId) => void groupController.handleAddPollOption(pollId)}
      onClosePoll={(pollId) => void groupController.handleClosePoll(pollId)}
      onOpenPollModalFromPanel={
        activeConversation?.type === 'group' ? () => modalActions.setShowPollModal(true) : undefined
      }
      onOpenTaskModalFromPanel={
        activeConversation?.type === 'group' ? groupController.openCreateTaskModal : undefined
      }
      polls={groupPolls}
      tasks={groupTasks}
      isJoinRequested={groupJoinRequested}
      loading={{
        polls: groupLoading.polls || groupActionLoading.votePoll,
        tasks: groupLoading.tasks || groupActionLoading.updateTask,
        recap: groupLoading.recap || groupActionLoading.generateRecap,
        requestJoin: groupActionLoading.requestJoin,
        updateGroup: groupActionLoading.updateGroup,
        leaveGroup: groupActionLoading.leaveGroup,
        deleteGroup: groupActionLoading.deleteGroup,
      }}
      onLeaveGroup={groupController.handleLeaveGroup}
      onDeleteGroup={groupController.handleDeleteGroup}
      onTransferGroupOwner={(userId, currentOwnerNewRole) =>
        void groupController.handleTransferGroupOwner(userId, currentOwnerNewRole)
      }
      onOpenMemberModal={() => {}}
      currentUserRole={currentUserRole}
      currentUserId={currentUserId}
      members={groupMembers}
      requests={groupRequests}
      onApproveMember={groupController.handleApproveRequest}
      onRejectMember={groupController.handleRejectRequest}
      onKickMember={groupController.handleKickMember}
      onDemoteAdminToMember={groupController.handleDemoteAdminToMember}
      onPromoteMemberToAdmin={groupController.handlePromoteMemberToAdmin}
      busyMemberActions={{
        approving: groupActionLoading.approveRequest,
        rejecting: groupActionLoading.rejectRequest,
        removing: groupActionLoading.removeMember,
        changingRole: groupActionLoading.changeRole,
      }}
      conversationMessages={messageData.allMessages}
      conversationSearchRequestTick={conversationSearchRequestTick}
      onJumpToMessage={scrollToMessageBubble}
      conversations={conversations}
      onSelectConversation={handleSelectConversation}
      onTaskJoined={(taskId) => void groupController.handleTaskJoined(taskId)}
      onEditTaskFromBulletin={(t) => groupController.openEditTaskFromGroupTask(String(t.taskId))}
      onDeleteTaskFromBulletin={(id) => void groupController.handleDeleteGroupTask(id)}
      taskActionBusy={groupActionLoading.createTask || groupActionLoading.updateTask}
      focusTaskId={focusTaskId}
      focusTaskNonce={focusTaskNonce}
    />
  );

  return (
    <ChatPageProvider value={contextValue}>
      <div className="w-full h-full min-h-0 flex overflow-hidden bg-background">
        <ChatNavRail
          navigate={navigate}
          onOpenProfile={handleOpenProfile}
          showContactsManagement={modalState.showContactsManagement}
          showAIAssistant={showAIAssistant}
          onOpenMessages={handleOpenMessages}
          onToggleContacts={handleToggleContacts}
          onOpenAIAssistant={handleOpenAIAssistant}
        />

        {!showAIAssistant && (
          <div className="hidden md:flex md:shrink-0">
            <ConversationListPanel {...convListPanelProps} />
          </div>
        )}

        {!showAIAssistant && !isTabletOrDesktop && mobileView === 'list' && (
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <ConversationListPanel {...convListPanelProps} />
          </div>
        )}

        {!showAIAssistant && !isTabletOrDesktop && (
          <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
            <SheetContent
              side="left"
              className="w-[clamp(280px,85vw,360px)] max-w-[100vw] p-0 overflow-y-auto"
            >
              <SheetTitle className="sr-only">Danh sách hội thoại</SheetTitle>
              <ConversationListPanel {...convListPanelProps} />
            </SheetContent>
          </Sheet>
        )}

        {showAIAssistant ? (
          <AIAssistantPanel
            onOpenDirectChat={async (otherUserId, otherDisplayName) => {
              await directActions.handleFriendClick(otherUserId, otherDisplayName);
              setShowAIAssistant(false);
            }}
          />
        ) : (
          (isTabletOrDesktop || mobileView === 'chat') && (
            <ChatMainContent
              showContactsManagement={modalState.showContactsManagement}
              contactsTab={modalState.contactsTab}
              showInfo={modalState.showInfo}
              onToggleShowInfo={handleToggleShowInfo}
              onOpenConversationList={undefined}
              typingUsers={typingUsers}
              pinned={{
                pinnedMessagesOrdered: messageData.pinnedMessagesOrdered,
                pinnedMessageCount: activeConversation?.pinnedMessageCount ?? 0,
                onScrollToMessage: scrollToMessageBubble,
                onTogglePin: pinController.handleTogglePinMsg,
              }}
              scroll={{
                containerRef: messagesContainerRef,
                endRef: messagesEndRef,
                allMessages: messageData.allMessages,
                unreadIncomingCount,
                onJumpToLatest: handleJumpToLatest,
              }}
              jumpHighlightMessageId={jumpHighlightMessageId}
              jumpFlashNonce={jumpFlashNonce}
              onJumpToMessage={scrollToMessageBubble}
              actionMenuMsgId={modalState.actionMenuMsgId}
              onActionMenuMsgIdChange={modalActions.setActionMenuMsgId}
              onStartEdit={handleStartEdit}
              onOpenPoll={() => modalActions.setShowPollModal(true)}
              onOpenTask={groupController.openCreateTaskModal}
              onSearchMessages={activeConversationId ? requestOpenConversationSearch : undefined}
              resolvedMemberCount={
                activeConversation?.type === 'group' && groupMembers.length > 0
                  ? groupMembers.length
                  : undefined
              }
              onFriendClick={handleFriendClick}
              shareTargetConversations={conversations}
              onForwardMediaMessage={handleForwardMediaMessage}
              onBack={!isTabletOrDesktop ? handleBackToList : undefined}
              onEditGroupTask={(id) => groupController.openEditTaskFromGroupTask(id)}
              onDeleteGroupTask={(id) => void groupController.handleDeleteGroupTask(id)}
              postMessageListSlot={null}
            />
          )
        )}

        {!showAIAssistant && (
          <ChatSideInfoRail
            showInfo={modalState.showInfo}
            showContactsManagement={modalState.showContactsManagement}
            onClose={handleCloseInfo}
          >
            {conversationInfoPanel}
          </ChatSideInfoRail>
        )}

        <ChatModalsHost
          state={modalState}
          actions={modalActions}
          isEditing={isEditing}
          pinLimit={{
            pinLimitModalMsg: pinController.pinLimitModalMsg,
            setPinLimitModalMsg: pinController.setPinLimitModalMsg,
            pinnedMessagesOrdered: messageData.pinnedMessagesOrdered,
            pinReplaceIndex: pinController.pinReplaceIndex,
            setPinReplaceIndex: pinController.setPinReplaceIndex,
            pinLimitSubmitting: pinController.pinLimitSubmitting,
            onConfirmPinReplace: pinController.handleConfirmPinReplace,
          }}
          convPinLimit={{
            convPinLimitPendingId: convPrefs.convPinLimitPendingId,
            setConvPinLimitPendingId: convPrefs.setConvPinLimitPendingId,
            convPinLimitConfirmBusy: convPrefs.convPinLimitConfirmBusy,
            convPinLimitUnpinningId: convPrefs.convPinLimitUnpinningId,
            conversationsPinnedToTop,
            conversations,
            onUnpinConversation: convPrefs.handleUnpinFromConvPinModal,
            onConfirmPinPending: convPrefs.handleConfirmPendingConvPin,
          }}
        />
      </div>
    </ChatPageProvider>
  );
}
