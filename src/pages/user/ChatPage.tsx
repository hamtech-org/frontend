import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ChatNavRail } from '@/components/chat/ChatNavRail';
import { ConversationListPanel } from '@/components/chat/ConversationListPanel';
import { ChatMainContent } from '@/components/chat/ChatMainContent';
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
import { useChatRealtimeEvents } from '@/pages/user/chat-page/hooks/useChatRealtimeEvents';
import { useConversationRealtimeLifecycle } from '@/pages/user/chat-page/hooks/useConversationRealtimeLifecycle';
import { useConversationRoutingSync } from '@/pages/user/chat-page/hooks/useConversationRoutingSync';
import { useDirectConversationActions } from '@/pages/user/chat-page/hooks/useDirectConversationActions';
import { useGroupConversationController } from '@/pages/user/chat-page/hooks/useGroupConversationController';
import { useGroupData } from '@/pages/user/chat-page/hooks/useGroupData';
import { useConversationPreferences } from '@/pages/user/chat-page/hooks/useConversationPreferences';
import { useMessagePinController } from '@/pages/user/chat-page/hooks/useMessagePinController';
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
import { messageEdited, messageRecalled } from '@/store/slices/chatSlice';
import { applyMessageHiddenForMe } from '@/store/applyMessageHiddenForMe';
import type { AppDispatch, RootState } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import { decodeJwtUserId } from '@/utils/chatUtils';
import type { TypingUserEntry } from '@/types/chat.types';

const EMPTY_TYPING_USERS: readonly TypingUserEntry[] = [];

/** Màn hình hiển thị trên mobile (< md). Desktop dùng layout cột song song. */
type MobileView = 'list' | 'chat';

export default function ChatPage() {
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const dispatch = useDispatch<AppDispatch>();

  // ── Responsive breakpoint ─────────────────────────────────────────────
  const isTabletOrDesktop = useBreakpoint('md');

  // ── Mobile navigation state ───────────────────────────────────────────
  /** Trên mobile, chỉ 1 view active tại 1 thời điểm. */
  const [mobileView, setMobileView] = useState<MobileView>('list');
  /** Sheet ConversationList trên mobile khi đang xem chat. */
  const [mobileListOpen, setMobileListOpen] = useState(false);

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
  const conversations = conversationsData?.data ?? [];
  const conversationsPinnedToTop = useMemo(
    () => conversations.filter((c) => c.isPinnedToTop),
    [conversations],
  );

  const activeConversationId = useSelector((state: RootState) => state.chat.activeConversationId);
  const activeConversation = conversations.find((c) => c.conversationId === activeConversationId);

  const typingUsers = useSelector((state: RootState) => {
    if (!activeConversationId) return EMPTY_TYPING_USERS;
    return state.chat.typingUsers[activeConversationId] ?? EMPTY_TYPING_USERS;
  });

  // ── Message data (merged API + socket, pinned MRU) ───────────────────
  const messageData = useChatMessageData(activeConversationId);

  // ── RTK Mutations (for message moderation) ───────────────────────────
  const [sendMessage] = useSendMessageMutation();
  const [uploadMedia] = useUploadMediaMutation();
  const [editMessage, { isLoading: isEditing }] = useEditMessageMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [recallMessage] = useRecallMessageMutation();
  const [markAsRead] = useMarkAsReadMutation();

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
  const { initiateCall, initiateGroupCall } = useCallContext();
  const { isConnected } = useSocketContext();

  // ── Modal state ──────────────────────────────────────────────────────
  const { state: modalState, actions: modalActions } = useChatModalController();

  // ── Conversation preferences (mute/pin) ──────────────────────────────
  const convPrefs = useConversationPreferences({
    activeConversationId,
    conversations,
  });

  // ── Message pin controller ───────────────────────────────────────────
  const pinController = useMessagePinController({
    dispatch,
    activeConversationId,
    activeConversation,
    currentUserId,
    groupMembers,
    pinnedMessagesOrdered: messageData.pinnedMessagesOrdered,
    allMessages: messageData.allMessages,
    patchMessageInCache: messageData.patchMessageInCache,
    setPinnedMessageOrderByConv: messageData.setPinnedMessageOrderByConv,
    setActionMenuMsgId: modalActions.setActionMenuMsgId,
  });

  // ── Direct conversation actions ──────────────────────────────────────
  const directActions = useDirectConversationActions({
    conversations,
    activeConversation,
    dispatch,
    navigate,
    createConversation: undefined as never, // handled via internal hook
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

  // ── Group controller ─────────────────────────────────────────────────
  const groupController = useGroupConversationController({
    activeConversationId,
    activeConversation,
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
    groupFetchers: {
      fetchGroupMembers,
      fetchGroupRequests,
      fetchGroupPolls,
      fetchGroupTasks,
    },
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
    },
    setActionBusy,
    navigate,
  });

  // ── Message moderation actions ───────────────────────────────────────
  const handleSaveEdit = useCallback(async () => {
    if (!modalState.editingMessage || !modalState.editDraft.trim()) return;
    if (modalState.editingMessage.type !== 'text') return;
    try {
      await editMessage({
        messageId: modalState.editingMessage.messageId,
        content: modalState.editDraft.trim(),
        conversationId: modalState.editingMessage.conversationId,
        createdAt: modalState.editingMessage.createdAt,
      }).unwrap();
      dispatch(
        messageEdited({
          messageId: modalState.editingMessage.messageId,
          conversationId: modalState.editingMessage.conversationId,
          content: modalState.editDraft.trim(),
        }),
      );
      messageData.patchMessageInCache(
        modalState.editingMessage.conversationId,
        modalState.editingMessage.messageId,
        { content: modalState.editDraft.trim(), isEdited: true },
      );
      modalActions.setEditingMessage(null);
    } catch {
      /* giữ modal */
    }
  }, [
    modalState.editingMessage,
    modalState.editDraft,
    editMessage,
    dispatch,
    messageData.patchMessageInCache,
    modalActions,
  ]);

  const handleRecallMsg = useCallback(
    (msg: IMessage) => {
      modalActions.setActionMenuMsgId(null);
      modalActions.setMessageConfirm({ kind: 'recall', msg });
    },
    [modalActions],
  );

  const handleDeleteMsg = useCallback(
    (msg: IMessage) => {
      modalActions.setActionMenuMsgId(null);
      modalActions.setMessageConfirm({ kind: 'delete', msg });
    },
    [modalActions],
  );

  const handleMessageConfirm = useCallback(async () => {
    if (!modalState.messageConfirm) return;
    const { kind, msg } = modalState.messageConfirm;
    modalActions.setMessageConfirmSubmitting(true);
    try {
      if (kind === 'recall') {
        await recallMessage({
          messageId: msg.messageId,
          conversationId: msg.conversationId,
          createdAt: msg.createdAt,
        }).unwrap();
        dispatch(messageRecalled({ messageId: msg.messageId, conversationId: msg.conversationId }));
        messageData.patchMessageInCache(msg.conversationId, msg.messageId, {
          isRecalled: true,
          content: 'Tin nhắn đã được thu hồi',
          isPinned: false,
        });
      } else {
        await deleteMessage({
          messageId: msg.messageId,
          conversationId: msg.conversationId,
          createdAt: msg.createdAt,
        }).unwrap();
        applyMessageHiddenForMe(dispatch, msg.conversationId, msg.messageId);
      }
      modalActions.setMessageConfirm(null);
      modalActions.setActionMenuMsgId(null);
    } catch (e: unknown) {
      const d = e && typeof e === 'object' && 'data' in e ? (e as { data: unknown }).data : null;
      const body = d && typeof d === 'object' ? (d as { error?: { message?: string } }) : null;
      const apiMsg = body?.error?.message?.trim();
      toast.error(
        apiMsg ||
          (modalState.messageConfirm?.kind === 'recall'
            ? 'Thu hồi tin nhắn thất bại'
            : 'Xóa tin nhắn thất bại'),
      );
    } finally {
      modalActions.setMessageConfirmSubmitting(false);
    }
  }, [
    modalState.messageConfirm,
    recallMessage,
    deleteMessage,
    dispatch,
    messageData.patchMessageInCache,
    modalActions,
  ]);

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

  // ── Forward media ────────────────────────────────────────────────────
  const handleForwardMediaMessage = useCallback(
    async (targetConversationIds: string[], msg: IMessage, caption: string) => {
      if (targetConversationIds.length === 0) return;
      if (!msg.mediaUrl || (msg.type !== 'image' && msg.type !== 'video' && msg.type !== 'file')) {
        toast.error('Không chia sẻ được tin này');
        throw new Error('invalid');
      }
      const text = caption.trim();
      const content = text.length > 0 ? text : ' ';
      try {
        for (const targetConversationId of targetConversationIds) {
          await sendMessage({
            conversationId: targetConversationId,
            type: msg.type,
            content,
            mediaUrl: msg.mediaUrl,
          }).unwrap();
        }
        const n = targetConversationIds.length;
        toast.success(n === 1 ? 'Đã chia sẻ tới 1 hội thoại' : `Đã chia sẻ tới ${n} hội thoại`);
      } catch {
        toast.error('Chia sẻ thất bại');
        throw new Error('send failed');
      }
    },
    [sendMessage],
  );

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      navigate(`/chat/${conversationId}`);
      setMobileView('chat');
      setMobileListOpen(false);
    },
    [navigate],
  );

  // ── Routing sync ─────────────────────────────────────────────────────

  // ── Mobile: auto-switch sang 'chat' khi chọn hội thoại ──────────────
  useEffect(() => {
    if (activeConversationId && !isTabletOrDesktop) {
      setMobileView('chat');
      setMobileListOpen(false);
    }
  }, [activeConversationId, isTabletOrDesktop]);

  // ── Mobile: vào /chat (không conversationId) thì luôn hiện danh sách ─
  useEffect(() => {
    if (isTabletOrDesktop) return;
    if (routeConversationId) return;
    if (activeConversationId) return;
    setMobileView('list');
    setMobileListOpen(false);
  }, [isTabletOrDesktop, routeConversationId, activeConversationId]);

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

  // ── Realtime events ──────────────────────────────────────────────────
  useChatRealtimeEvents({
    dispatch,
    isConnected,
    activeConversationId,
    setActivePollId: modalActions.setActivePollId,
    setShowPollVoteModal: modalActions.setShowPollVoteModal,
    fetchGroupMembers,
    patchMessageInCache: messageData.patchMessageInCache,
    setPinnedMessageOrderByConv: messageData.setPinnedMessageOrderByConv,
    navigate,
  });

  // ── Jump highlight ───────────────────────────────────────────────────
  const jumpHighlightClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [jumpHighlightMessageId, setJumpHighlightMessageId] = useState<string | null>(null);
  const [jumpFlashNonce, setJumpFlashNonce] = useState(0);
  const [conversationSearchRequestTick, setConversationSearchRequestTick] = useState(0);

  const scrollToMessageBubble = useCallback((messageId: string) => {
    if (jumpHighlightClearRef.current) {
      clearTimeout(jumpHighlightClearRef.current);
      jumpHighlightClearRef.current = null;
    }
    setJumpFlashNonce((n) => n + 1);
    setJumpHighlightMessageId(messageId);
    const tryScrollIntoView = (remainingAttempts: number) => {
      const node = document.getElementById(`chat-msg-${messageId}`);
      if (node) {
        node.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        return;
      }
      if (remainingAttempts <= 0) return;
      window.setTimeout(() => tryScrollIntoView(remainingAttempts - 1), 120);
    };
    requestAnimationFrame(() => {
      tryScrollIntoView(8);
    });
    jumpHighlightClearRef.current = setTimeout(() => {
      setJumpHighlightMessageId(null);
      jumpHighlightClearRef.current = null;
    }, 2300);
  }, []);

  // Reset on conversation switch
  useEffect(() => {
    modalActions.setMessageConfirm(null);
    setJumpHighlightMessageId(null);
    if (jumpHighlightClearRef.current) {
      clearTimeout(jumpHighlightClearRef.current);
      jumpHighlightClearRef.current = null;
    }
  }, [activeConversationId, modalActions]);

  const requestOpenConversationSearch = useCallback(() => {
    modalActions.setShowInfo(true);
    setConversationSearchRequestTick((t) => t + 1);
  }, [modalActions]);

  // ── Scroll behavior ──────────────────────────────────────────────────
  const { messagesContainerRef, messagesEndRef, unreadIncomingCount, handleJumpToLatest } =
    useChatScrollBehavior({
      allMessages: messageData.allMessages,
      activeConversationId,
      currentUserId,
      typingUsers,
      actionMenuMsgId: modalState.actionMenuMsgId,
      setActionMenuMsgId: modalActions.setActionMenuMsgId,
    });

  // ── Friend click (for contacts management) ──────────────────────────
  const handleFriendClick = useCallback(
    async (friendId: string, friendName: string) => {
      try {
        const existingConversation = conversations.find(
          (c) => c.type === 'direct' && (c.otherUserId === friendId || c.name === friendName),
        );
        if (!existingConversation) {
          void directActions.handleFriendClick(friendId, friendName);
          return;
        }
        modalActions.setShowContactsManagement(false);
        void navigate(`/chat/${existingConversation.conversationId}`);
      } catch {
        void directActions.handleFriendClick(friendId, friendName);
      }
    },
    [conversations, navigate, modalActions, directActions],
  );

  // ── Context value ────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────

  /** Props chung cho ConversationListPanel (tránh lặp code). */
  const convListPanelProps = {
    conversations,
    convsLoading,
    activeMessages: messageData.allMessages,
    showContactsManagement: modalState.showContactsManagement,
    contactsTab: modalState.contactsTab,
    onContactsTabChange: modalActions.setContactsTab,
    onSelectConversation: handleSelectConversation,
    onPickSearchMessage: scrollToMessageBubble,
    onOpenCreateGroup: useCallback(() => {
      modalActions.setShowCreateGroupModal(true);
      modalActions.setSelectedGroupMembers([]);
      modalActions.setGroupName('');
    }, [modalActions]),
    onOpenMarkRead: () => modalActions.setShowMarkReadModal(true),
    onOpenAddFriend: () => modalActions.setShowAddFriendModal(true),
    onToggleConversationMute: convPrefs.handleToggleConversationMute,
  };

  /** ConversationInfoPanel — dùng chung cho cả desktop sidebar và mobile Sheet. */
  const conversationInfoPanel = (
    <ConversationInfoPanel
      numRequests={groupRequests.length}
      activeConversation={activeConversation}
      onOpenAISummaryFromPanel={groupController.openAISummaryFromPanel}
      onEditGroup={groupController.openEditGroupModal}
      onAddMembers={groupController.openAddMembersModal}
      onOpenCreateGroup={useCallback(() => {
        modalActions.setShowCreateGroupModal(true);
        modalActions.setSelectedGroupMembers([]);
        modalActions.setGroupName('');
      }, [modalActions])}
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
      onToggleTask={(taskId) => void groupController.handleToggleTaskStatus(taskId)}
      onOpenPollModalFromPanel={
        activeConversation?.type === 'group' ? () => modalActions.setShowPollModal(true) : undefined
      }
      onOpenTaskModalFromPanel={
        activeConversation?.type === 'group' ? () => modalActions.setShowTaskModal(true) : undefined
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
      onOpenMemberModal={() => {}}
      currentUserRole={currentUserRole}
      currentUserId={currentUserId}
      members={groupMembers}
      requests={groupRequests}
      onApproveMember={groupController.handleApproveRequest}
      onRejectMember={groupController.handleRejectRequest}
      onKickMember={groupController.handleKickMember}
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
    />
  );

  return (
    <ChatPageProvider value={contextValue}>
      {/*
       * Layout wrapper:
       *  - Mobile (< md): flex-col, padding-bottom 64px untuk bottom tab bar
       *  - Tablet/Desktop (md+): flex-row như cũ
       */}
      <div className="w-full h-full min-h-0 flex overflow-hidden bg-background">
        {/* ── Nav Rail (desktop/tablet) + Bottom Tab (mobile) ─────────── */}
        <ChatNavRail
          navigate={navigate}
          onOpenProfile={() => modalActions.setShowProfileModal(true)}
          showContactsManagement={modalState.showContactsManagement}
          onToggleContacts={() => {
            modalActions.setShowContactsManagement((v) => !v);
            modalActions.setContactsTab('friends');
          }}
        />

        {/* ── Conversation List: Desktop/Tablet — sidebar cố định ──────── */}
        <div className="hidden md:flex md:shrink-0">
          <ConversationListPanel {...convListPanelProps} />
        </div>

        {/* ── Conversation List: Mobile — Sheet từ trái ─────────────────
             Chỉ hiện khi mobileView === 'list' hoặc user mở sheet thủ công  */}
        {!isTabletOrDesktop && mobileView === 'list' && (
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <ConversationListPanel {...convListPanelProps} />
          </div>
        )}

        {/* Sheet ConversationList trên mobile khi đang xem chat */}
        {!isTabletOrDesktop && (
          <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
            <SheetContent side="left" className="w-80 p-0 overflow-y-auto">
              <SheetTitle className="sr-only">Danh sách hội thoại</SheetTitle>
              <ConversationListPanel {...convListPanelProps} />
            </SheetContent>
          </Sheet>
        )}

        {/* ── Chat Main Content ─────────────────────────────────────────
             Mobile: ẩn khi đang ở 'list' view (chưa chọn conversation)
             Desktop: luôn hiện                                           */}
        {(isTabletOrDesktop || mobileView === 'chat') && (
          <ChatMainContent
            showContactsManagement={modalState.showContactsManagement}
            showInfo={modalState.showInfo}
            onToggleShowInfo={() => modalActions.setShowInfo(!modalState.showInfo)}
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
            onStartEdit={(msg) => {
              if (msg.type !== 'text') return;
              modalActions.setEditingMessage(msg);
              modalActions.setEditDraft(msg.content);
            }}
            onOpenPoll={() => modalActions.setShowPollModal(true)}
            onOpenTask={() => modalActions.setShowTaskModal(true)}
            onSearchMessages={activeConversationId ? requestOpenConversationSearch : undefined}
            resolvedMemberCount={
              activeConversation?.type === 'group' && groupMembers.length > 0
                ? groupMembers.length
                : undefined
            }
            onFriendClick={handleFriendClick}
            shareTargetConversations={conversations}
            onForwardMediaMessage={handleForwardMediaMessage}
            onBack={!isTabletOrDesktop ? () => setMobileView('list') : undefined}
          />
        )}

        {/* ── Side Info Rail ───────────────────────────────────────────
             Desktop: animated sidebar; Mobile/Tablet: Sheet overlay     */}
        <ChatSideInfoRail
          showInfo={modalState.showInfo}
          showContactsManagement={modalState.showContactsManagement}
          onClose={() => modalActions.setShowInfo(false)}
        >
          {conversationInfoPanel}
        </ChatSideInfoRail>

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
