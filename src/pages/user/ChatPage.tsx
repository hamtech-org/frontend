import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ChatNavRail } from '@/components/chat/ChatNavRail';
import { ConversationListPanel } from '@/components/chat/ConversationListPanel';
import { useCallContext } from '@/contexts/CallContext';
import { useSocketContext } from '@/contexts/SocketContext';
import { ChatPageProvider, useChatPageContextValue } from '@/pages/user/chat-page/ChatPageContext';
import { useChatModalController } from '@/pages/user/chat-page/hooks/useChatModalController';
import { useChatScrollBehavior } from '@/pages/user/chat-page/hooks/useChatScrollBehavior';
import { useConversationRealtimeLifecycle } from '@/pages/user/chat-page/hooks/useConversationRealtimeLifecycle';
import { useConversationRoutingSync } from '@/pages/user/chat-page/hooks/useConversationRoutingSync';
import { useDirectConversationActions } from '@/pages/user/chat-page/hooks/useDirectConversationActions';
import { useGroupConversationController } from '@/pages/user/chat-page/hooks/useGroupConversationController';
import { useGroupData } from '@/pages/user/chat-page/hooks/useGroupData';
import {
  chatApi,
  patchMessageInGetMessagesCache,
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useCreateConversationMutation,
  useDeleteMessageMutation,
  useEditMessageMutation,
  useMarkAsReadMutation,
  useUpdateConversationPreferencesMutation,
  usePinMessageMutation,
  useRecallMessageMutation,
  useUnpinMessageMutation,
  useReactMessageMutation,
  useLeaveGroupMutation,
  useDeleteGroupMutation,
} from '@/store/api/chatApi';
import { useUploadMediaMutation } from '@/store/api/mediaApi';
import {
  setActiveConversation,
  messageEdited,
  messageRecalled,
  messagePinUpdated,
  setReplyingTo,
} from '@/store/slices/chatSlice';
import { applyMessageHiddenForMe } from '@/store/applyMessageHiddenForMe';
import { socketService } from '@/services/socket';
import type { AppDispatch, RootState } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import { decodeJwtUserId } from '@/utils/chatUtils';
import type { TypingUserEntry } from '@/types/chat.types';
import { FriendsListView } from '@/components/chat/FriendsListView';
import { AddFriendModal } from '@/components/chat/AddFriendModal';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { PinnedMessagesBar } from '@/components/chat/PinnedMessagesBar';
import { ConversationInfoPanel } from '@/components/chat/ConversationInfoPanel';
import type { MuteNotificationsApplyPayload } from '@/components/chat/MuteNotificationsModal';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { EditMessageDialog } from '@/components/chat/EditMessageDialog';
import { MarkReadModal } from '@/components/chat/MarkReadModal';
import { ConfirmModal } from '@/components/chat/ConfirmModal';
import { PinLimitModal, MAX_PINNED_CHATS_TO_TOP, MAX_PINNED_PER_CONVERSATION } from '@/components/chat/PinLimitModal';
import { ConversationPinLimitModal } from '@/components/chat/ConversationPinLimitModal';
import { ProfileModal } from '@/components/chat/ProfileModal';
import { CreateGroupModal } from '@/components/chat/CreateGroupModal';
import { PollModal } from '@/components/chat/PollModal';
import { PollVoteModal } from '@/components/chat/PollVoteModal';
import { MemberManagementModal } from '@/components/chat/MemberManagementModal';
import { AISummaryModal } from '@/components/chat/AISummaryModal';
import { TaskModal } from '@/components/chat/TaskModal';
import { AddMembersModal } from '@/components/chat/AddMembersModal';
import { EditGroupModal } from '@/components/chat/EditGroupModal';
import { apiClient } from '@/services/api';
import type { ApiSuccessResponse } from '@/types/api.types';

type GroupPollOption = {
  text: string;
  voters?: string[];
};

type GroupPoll = {
  pollId: string;
  question: string;
  options: GroupPollOption[];
  createdAt: string;
  isClosed?: boolean;
  isMultipleChoice?: boolean;
  creatorId?: string;
  creatorDisplayName?: string | null;
};

type GroupTask = {
  taskId: string;
  title: string;
  description?: string;
  assignees: string[];
  participants?: string[];
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
  createdAt?: string;
  creatorId?: string;
  creatorDisplayName?: string | null;
};

type AIRecap = {
  summaryId: string;
  content: string;
  createdAt: string;
};

const EMPTY_ARRAY: any[] = [];
const EMPTY_TYPING_USERS: readonly TypingUserEntry[] = [];

export default function ChatPage() {
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const activeConversationIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const EMPTY_MESSAGE_ARRAY: ReadonlyArray<IMessage> = EMPTY_ARRAY;

  const { data: messagesData } = useGetMessagesQuery(
    { conversationId: activeConversationId! },
    { skip: !activeConversationId },
  );

  const socketMessages = useSelector((state: RootState) => {
    if (!activeConversationId) return EMPTY_MESSAGE_ARRAY;
    return state.chat.messages[activeConversationId] ?? EMPTY_MESSAGE_ARRAY;
  });

  const allMessages = useMemo(() => {
    const apiMessages = messagesData?.data ?? [];
    const statusRank = (x?: string) => (x === 'read' ? 3 : x === 'delivered' ? 2 : x === 'sent' ? 1 : 0);
    const RECALL_TEXT = 'Tin nhắn đã được thu hồi';
    // Ghép isPinned / status / thu hồi từ buffer socket: khi patch RTK chậm hoặc refetch chưa về, Redux/socket vẫn phải thắng.
    const merged: IMessage[] = apiMessages.map((m) => {
      const mid = String(m.messageId);
      const sm = socketMessages.find((s) => String(s.messageId) === mid);
      if (!sm) return m;
      const isRecalled = Boolean(m.isRecalled) || Boolean(sm.isRecalled);
      const isDeleted = Boolean(m.isDeleted) || Boolean(sm.isDeleted);
      const pin = (Boolean(m.isPinned) || Boolean(sm.isPinned)) && !isRecalled && !isDeleted;
      const bestStatus =
        statusRank(sm.status) > statusRank(m.status) ? sm.status : m.status ?? sm.status;
      const readBy = (m.readBy?.length ?? 0) >= (sm.readBy?.length ?? 0) ? m.readBy : sm.readBy;
      const pinChanged = pin !== Boolean(m.isPinned);
      const statusChanged = bestStatus !== m.status;
      const readByChanged = JSON.stringify(readBy ?? []) !== JSON.stringify(m.readBy ?? []);
      const recallChanged = isRecalled !== Boolean(m.isRecalled);
      const deleteChanged = isDeleted !== Boolean(m.isDeleted);
      const recallContentPending = isRecalled && String(m.content ?? '').trim() !== RECALL_TEXT;
      if (!pinChanged && !statusChanged && !readByChanged && !recallChanged && !deleteChanged && !recallContentPending) {
        return m;
      }
      const content = isRecalled ? RECALL_TEXT : m.content;
      return {
        ...m,
        isRecalled,
        isDeleted,
        content,
        isPinned: pin,
        ...(bestStatus ? { status: bestStatus } : {}),
        ...(readBy?.length ? { readBy } : {}),
      };
    });
    socketMessages.forEach((sm) => {
      const sid = String(sm.messageId);
      if (!merged.some((m) => String(m.messageId) === sid)) {
        merged.push(sm);
      }
    });
    merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return merged;
  }, [messagesData, socketMessages]);

  /**
   * Thứ tự ghim MRU: tin vừa ghim lên đầu thanh / modal (khớp `pinnedMessagesOrdered`).
   * Giới hạn số tin ghim: `MAX_PINNED_PER_CONVERSATION` (đồng bộ backend).
   */
  const [pinnedMessageOrderByConv, setPinnedMessageOrderByConv] = useState<Record<string, string[]>>({});

  const { primaryPinnedMessage, otherPinnedMessages } = useMemo(() => {
    if (!activeConversationId) {
      return { primaryPinnedMessage: null as IMessage | null, otherPinnedMessages: [] as IMessage[] };
    }
    const pinned = allMessages.filter(
      (m) => m.isPinned && !m.isRecalled && !m.isDeleted,
    );
    if (pinned.length === 0) {
      return { primaryPinnedMessage: null, otherPinnedMessages: [] };
    }

    const order = pinnedMessageOrderByConv[activeConversationId] ?? [];
    const byId = new Map(pinned.map((m) => [m.messageId, m]));
    const pinnedIds = new Set(pinned.map((m) => m.messageId));

    const fromOrder = order.filter((id) => pinnedIds.has(id));
    const notInOrder = pinned
      .filter((m) => !fromOrder.includes(m.messageId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((m) => m.messageId);
    const mergedIds = [...fromOrder, ...notInOrder];

    const primaryId = mergedIds[0];
    const primary = (primaryId ? byId.get(primaryId) : null) ?? pinned[pinned.length - 1]!;
    const other = mergedIds
      .slice(1)
      .map((id) => byId.get(id))
      .filter((m): m is IMessage => m != null);
    return { primaryPinnedMessage: primary, otherPinnedMessages: other };
  }, [allMessages, activeConversationId, pinnedMessageOrderByConv]);

  const pinnedMessagesOrdered = useMemo(() => {
    if (!primaryPinnedMessage) return [];
    return [primaryPinnedMessage, ...otherPinnedMessages];
  }, [primaryPinnedMessage, otherPinnedMessages]);

  const latestMessageIdForRead =
    allMessages.length > 0 ? allMessages[allMessages.length - 1].messageId : undefined;

  const [sendMessage] = useSendMessageMutation();
  const [uploadMedia] = useUploadMediaMutation();
  const [createConversation] = useCreateConversationMutation();
  const [editMessage, { isLoading: isEditing }] = useEditMessageMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [recallMessage] = useRecallMessageMutation();
  const [markAsRead] = useMarkAsReadMutation();
  const [updateConversationPreferences] = useUpdateConversationPreferencesMutation();
  const [pinMessage] = usePinMessageMutation();
  const [unpinMessage] = useUnpinMessageMutation();
  const [reactMessage] = useReactMessageMutation();
  const [leaveGroupMutation] = useLeaveGroupMutation();
  const [deleteGroupMutation] = useDeleteGroupMutation();

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

  const handleAudioCall = useCallback(() => {
    if (activeConversation?.type !== 'direct' || !activeConversation.otherUserId) return;
    initiateCall(activeConversation.otherUserId, 'audio');
  }, [activeConversation, initiateCall]);

  const handleVideoCall = useCallback(() => {
    if (activeConversation?.type !== 'direct' || !activeConversation.otherUserId) return;
    // CallContext sẽ lưu returnTo = location.pathname (đang là /chat/:conversationId)
    initiateCall(activeConversation.otherUserId, 'video');
  }, [activeConversation, initiateCall]);

  const [pinLimitModalMsg, setPinLimitModalMsg] = useState<IMessage | null>(null);
  const [pinReplaceIndex, setPinReplaceIndex] = useState<number | null>(null);
  const [pinLimitSubmitting, setPinLimitSubmitting] = useState(false);
  const [convPinLimitPendingId, setConvPinLimitPendingId] = useState<string | null>(null);
  const [convPinLimitConfirmBusy, setConvPinLimitConfirmBusy] = useState(false);
  const [convPinLimitUnpinningId, setConvPinLimitUnpinningId] = useState<string | null>(null);
  const [conversationSearchRequestTick, setConversationSearchRequestTick] = useState(0);

  const patchMessageInCache = useCallback(
    (conversationId: string, messageId: string, patch: Partial<IMessage>) => {
      patchMessageInGetMessagesCache(dispatch, conversationId, messageId, patch);
    },
    [dispatch],
  );

  const handleReactMessage = useCallback(
    async (msg: IMessage, emoji: string) => {
      try {
        await reactMessage({
          messageId: msg.messageId,
          conversationId: msg.conversationId,
          createdAt: msg.createdAt,
          emoji,
        }).unwrap();
      } catch {
        /* ignore */
      }
    },
    [reactMessage],
  );

  // ── Direct conversation actions ──────────────────────────────────────
  const directActions = useDirectConversationActions({
    conversations,
    activeConversation,
    dispatch,
    navigate,
    createConversation,
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

  useEffect(() => {
    void refetchConversations();
  }, [activeConversationId, refetchConversations]);

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

  const [memberTab, setMemberTab] = useState<'list' | 'pending'>('list');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const jumpHighlightClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [jumpHighlightMessageId, setJumpHighlightMessageId] = useState<string | null>(null);
  const [jumpFlashNonce, setJumpFlashNonce] = useState(0);

  /** GlobalChatSocketBridge đã xử lý hầu hết socket chat; ở đây chỉ giữ UI chỉ thuộc ChatPage. */
  useEffect(() => {
    if (!isConnected) return;
    const onPollSystemMessage = (data: unknown) => {
      const msg = data as IMessage;
      try {
        if (msg.conversationId !== activeConversationIdRef.current || (msg as { type?: string }).type !== 'system') {
          return;
        }
        const raw = String(msg.content ?? '').trim();
        if (!raw.startsWith('{')) return;
        const obj = JSON.parse(raw) as { kind?: string; poll?: { pollId?: string; question?: string } };
        if (obj?.kind !== 'poll_created' || !obj.poll?.pollId) return;
        const pollId = String(obj.poll.pollId);
        const question = String(obj.poll?.question ?? '').trim();
        const toastId = `poll-created-${pollId}`;
        if (toast.isActive(toastId)) return;
        toast.info(question ? `Có bình chọn mới: ${question}` : 'Có bình chọn mới', {
          toastId,
          autoClose: 7000,
          onClick: () => {
            modalActions.setActivePollId(pollId);
            modalActions.setShowPollVoteModal(true);
          },
        });
      } catch {
        /* ignore */
      }
    };
    socketService.on('message:new', onPollSystemMessage);
    return () => {
      socketService.off('message:new', onPollSystemMessage);
    };
  }, [isConnected, modalActions]);

  useEffect(() => {
    if (!isConnected) return;
    const onDisbanded = (data: unknown) => {
      const p = data as { conversationId?: string; groupId?: string };
      const cid = p?.conversationId ?? p?.groupId;
      if (!cid) return;
      if (cid !== activeConversationIdRef.current) return;
      toast.info('Nhóm đã được giải tán');
      dispatch(setActiveConversation(null));
      void navigate('/chat', { replace: true });
    };
    socketService.on('group:disbanded', onDisbanded);
    return () => {
      socketService.off('group:disbanded', onDisbanded);
    };
  }, [isConnected, dispatch, navigate]);

  useEffect(() => {
    if (!isConnected) return;
    const stripRecallFromPins = (data: unknown) => {
      const payload = data as { messageId: string; conversationId: string };
      setPinnedMessageOrderByConv((prev) => {
        const cid = payload.conversationId;
        const cur = prev[cid] ?? [];
        return { ...prev, [cid]: cur.filter((id) => id !== payload.messageId) };
      });
    };
    const onPinUpdated = (data: unknown) => {
      const payload = data as { messageId: string; conversationId: string; isPinned: boolean };
      setPinnedMessageOrderByConv((prev) => {
        const cid = payload.conversationId;
        const cur = prev[cid] ?? [];
        if (payload.isPinned) {
          return {
            ...prev,
            [cid]: [payload.messageId, ...cur.filter((id) => id !== payload.messageId)],
          };
        }
        return { ...prev, [cid]: cur.filter((id) => id !== payload.messageId) };
      });
    };
    socketService.on('message:recall', stripRecallFromPins);
    socketService.on('message:recalled', stripRecallFromPins);
    socketService.on('message:pin_updated', onPinUpdated);
    return () => {
      socketService.off('message:recall', stripRecallFromPins);
      socketService.off('message:recalled', stripRecallFromPins);
      socketService.off('message:pin_updated', onPinUpdated);
    };
  }, [isConnected]);

  useEffect(() => {
    modalActions.setMessageConfirm(null);
    setJumpHighlightMessageId(null);
    if (jumpHighlightClearRef.current) {
      clearTimeout(jumpHighlightClearRef.current);
      jumpHighlightClearRef.current = null;
    }
  }, [activeConversationId, modalActions]);

  // ── Small helpers ────────────────────────────────────────────────────
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      void navigate(`/chat/${conversationId}`);
    },
    [navigate],
  );

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
      patchMessageInCache(
        modalState.editingMessage.conversationId,
        modalState.editingMessage.messageId,
        {
          content: modalState.editDraft.trim(),
          isEdited: true,
        },
      );
      modalActions.setEditingMessage(null);
    } catch {
      /* giữ modal */
    }
  }, [modalState.editingMessage, modalState.editDraft, editMessage, dispatch, patchMessageInCache, modalActions]);

  const handleForwardMediaMessage = useCallback(
    async (targetConversationIds: string[], msg: IMessage, caption: string) => {
      if (targetConversationIds.length === 0) return;
      if (
        !msg.mediaUrl ||
        (msg.type !== 'image' && msg.type !== 'video' && msg.type !== 'file')
      ) {
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

  const handleRecallMsg = useCallback((msg: IMessage) => {
    modalActions.setActionMenuMsgId(null);
    modalActions.setMessageConfirm({ kind: 'recall', msg });
  }, [modalActions]);

  const handleDeleteMsg = useCallback((msg: IMessage) => {
    modalActions.setActionMenuMsgId(null);
    modalActions.setMessageConfirm({ kind: 'delete', msg });
  }, [modalActions]);

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
        patchMessageInCache(msg.conversationId, msg.messageId, {
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
      toast.error(apiMsg || (modalState.messageConfirm?.kind === 'recall' ? 'Thu hồi tin nhắn thất bại' : 'Xóa tin nhắn thất bại'));
    } finally {
      modalActions.setMessageConfirmSubmitting(false);
    }
  }, [modalState.messageConfirm, recallMessage, deleteMessage, dispatch, patchMessageInCache, modalActions]);

  const handleTogglePinMsg = useCallback(
    async (msg: IMessage) => {
      try {
        const cid = msg.conversationId;
        if (msg.isPinned) {
          const myRole = groupMembers.find((m) => m.userId === currentUserId)?.role;
          if (
            activeConversation?.type === 'group' &&
            myRole === 'member' &&
            activeConversation.groupSettings &&
            !activeConversation.groupSettings.memberPermissions.pinMessages
          ) {
            toast.error('Nhóm không cho phép thành viên bỏ/ghim tin nhắn.');
            modalActions.setActionMenuMsgId(null);
            return;
          }
          await unpinMessage({
            messageId: msg.messageId,
            conversationId: cid,
            createdAt: msg.createdAt,
          }).unwrap();
          dispatch(
            messagePinUpdated({
              messageId: msg.messageId,
              conversationId: cid,
              isPinned: false,
            }),
          );
          patchMessageInCache(cid, msg.messageId, { isPinned: false });
          setPinnedMessageOrderByConv((prev) => ({
            ...prev,
            [cid]: (prev[cid] ?? []).filter((id) => id !== msg.messageId),
          }));
        } else {
          const sameConv = activeConversationId && cid === activeConversationId;
          const pinCount = sameConv
            ? pinnedMessagesOrdered.length
            : allMessages.filter(
                (m) =>
                  m.conversationId === cid && m.isPinned && !m.isRecalled && !m.isDeleted,
              ).length;
          if (pinCount >= MAX_PINNED_PER_CONVERSATION) {
            if (sameConv && pinnedMessagesOrdered.length >= MAX_PINNED_PER_CONVERSATION) {
              setPinReplaceIndex(null);
              setPinLimitModalMsg(msg);
              modalActions.setActionMenuMsgId(null);
              return;
            }
            toast.error(`Đã đủ ${MAX_PINNED_PER_CONVERSATION} tin ghim trong cuộc trò chuyện này.`);
            modalActions.setActionMenuMsgId(null);
            return;
          }
          const myRole = groupMembers.find((m) => m.userId === currentUserId)?.role;
          if (
            activeConversation?.type === 'group' &&
            myRole === 'member' &&
            activeConversation.groupSettings &&
            !activeConversation.groupSettings.memberPermissions.pinMessages
          ) {
            toast.error('Nhóm không cho phép thành viên ghim tin nhắn.');
            modalActions.setActionMenuMsgId(null);
            return;
          }
          await pinMessage({
            messageId: msg.messageId,
            conversationId: cid,
            createdAt: msg.createdAt,
          }).unwrap();
          dispatch(
            messagePinUpdated({
              messageId: msg.messageId,
              conversationId: cid,
              isPinned: true,
            }),
          );
          patchMessageInCache(cid, msg.messageId, { isPinned: true });
          setPinnedMessageOrderByConv((prev) => ({
            ...prev,
            [cid]: [msg.messageId, ...(prev[cid] ?? []).filter((id) => id !== msg.messageId)],
          }));
        }
        modalActions.setActionMenuMsgId(null);
      } catch (e: unknown) {
        const msg = (e as { data?: { error?: { message?: string } } })?.data?.error?.message;
        if (msg) toast.error(msg);
      }
    },
    [
      pinMessage,
      unpinMessage,
      dispatch,
      patchMessageInCache,
      activeConversationId,
      pinnedMessagesOrdered,
      allMessages,
      activeConversation,
      groupMembers,
      currentUserId,
    ],
  );

  const handleConfirmPinReplace = useCallback(async () => {
    if (
      pinReplaceIndex === null ||
      !pinLimitModalMsg ||
      pinnedMessagesOrdered.length < MAX_PINNED_PER_CONVERSATION
    )
      return;
    const victim = pinnedMessagesOrdered[pinReplaceIndex];
    if (!victim) return;
    const toPin = pinLimitModalMsg;
    const cid = toPin.conversationId;
    setPinLimitSubmitting(true);
    try {
      await unpinMessage({
        messageId: victim.messageId,
        conversationId: cid,
        createdAt: victim.createdAt,
      }).unwrap();
      dispatch(
        messagePinUpdated({
          messageId: victim.messageId,
          conversationId: cid,
          isPinned: false,
        }),
      );
      patchMessageInCache(cid, victim.messageId, { isPinned: false });
      setPinnedMessageOrderByConv((prev) => ({
        ...prev,
        [cid]: (prev[cid] ?? []).filter((id) => id !== victim.messageId),
      }));

      await pinMessage({
        messageId: toPin.messageId,
        conversationId: cid,
        createdAt: toPin.createdAt,
      }).unwrap();
      dispatch(
        messagePinUpdated({
          messageId: toPin.messageId,
          conversationId: cid,
          isPinned: true,
        }),
      );
      patchMessageInCache(cid, toPin.messageId, { isPinned: true });
      setPinnedMessageOrderByConv((prev) => ({
        ...prev,
        [cid]: [toPin.messageId, ...(prev[cid] ?? []).filter((id) => id !== toPin.messageId)],
      }));
      setPinLimitModalMsg(null);
      modalActions.setActionMenuMsgId(null);
    } catch {
      toast.error('Không cập nhật ghim được. Thử lại.');
    } finally {
      setPinLimitSubmitting(false);
    }
  }, [
    pinLimitModalMsg,
    pinnedMessagesOrdered,
    pinReplaceIndex,
    unpinMessage,
    pinMessage,
    dispatch,
    patchMessageInCache,
  ]);

  const scrollToMessageBubble = useCallback((messageId: string) => {
    if (jumpHighlightClearRef.current) {
      clearTimeout(jumpHighlightClearRef.current);
      jumpHighlightClearRef.current = null;
    }
    setJumpFlashNonce((n) => n + 1);
    setJumpHighlightMessageId(messageId);
    requestAnimationFrame(() => {
      document.getElementById(`chat-msg-${messageId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
    jumpHighlightClearRef.current = setTimeout(() => {
      setJumpHighlightMessageId(null);
      jumpHighlightClearRef.current = null;
    }, 2300);
  }, []);

  const requestOpenConversationSearch = useCallback(() => {
    modalActions.setShowInfo(true);
    setConversationSearchRequestTick((t) => t + 1);
  }, [modalActions]);

  const handleToggleGroupMember = useCallback((conversationId: string, checked: boolean) => {
    modalActions.setSelectedGroupMembers((prev) =>
      checked ? [...prev, conversationId] : prev.filter((id) => id !== conversationId),
    );
  }, [modalActions]);

  const handleConfirmCreateGroup = useCallback(async () => {
    if (modalState.selectedGroupMembers.length < 2) return;
    try {
      const result = await createConversation({
        type: 'group',
        name:
          modalState.groupName ||
          `Nhóm (${modalState.selectedGroupMembers.length + 1} thành viên)`,
        memberIds: modalState.selectedGroupMembers,
      }).unwrap();
      const conversationId = result.data.conversationId;
      // Log trạng thái socket và thời điểm join room
      // eslint-disable-next-line no-console
      socketService.emit('conversation:join', conversationId);
      void navigate(`/chat/${conversationId}`);
      dispatch(chatApi.endpoints.getMessages.initiate({ conversationId }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[DEBUG] Tạo nhóm lỗi:', err);
    }
    modalActions.setShowCreateGroupModal(false);
    modalActions.setSelectedGroupMembers([]);
    modalActions.setGroupName('');
  }, [modalState.selectedGroupMembers, modalState.groupName, createConversation, navigate, dispatch, modalActions]);

  const handleFriendClick = useCallback(
    async (friendId: string, friendName: string) => {
      try {
        console.log('👤 handleFriendClick - friendId:', friendId, 'friendName:', friendName);

        // Check if conversation already exists with this friend
        let existingConversation = conversations.find(
          (c) => c.type === 'direct' && (c.otherUserId === friendId || c.name === friendName),
        );

        // If not found, create a new direct conversation
        if (!existingConversation) {
          console.log('🆕 Creating new direct conversation...');
          const result = await createConversation({
            type: 'direct',
            memberIds: [friendId],
          }).unwrap();
          existingConversation = result.data;
          console.log('✅ Conversation created:', result.data.conversationId);
        } else {
          console.log('✅ Found existing conversation:', existingConversation.conversationId);
        }

        // Close contacts management and navigate to conversation
        modalActions.setShowContactsManagement(false);
        void navigate(`/chat/${existingConversation.conversationId}`);
      } catch (error) {
        console.error('❌ Failed to open conversation with friend:', error);
        // Log the full error object to see what went wrong
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
    },
    [conversations, createConversation, navigate],
  );

  useEffect(() => {
    return () => {
      if (modalState.editGroupAvatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(modalState.editGroupAvatarPreview);
      }
    };
  }, [modalState.editGroupAvatarPreview]);

  const handleUpdateGroup = useCallback(async () => {
    if (!activeConversationId || activeConversation?.type !== 'group') return;
    
    const nextName = modalState.editGroupName.trim();
    if (!nextName) {
      toast.error('Tên nhóm không được để trống');
      return;
    }

    setActionBusy('updateGroup', true);
    const previousName = activeConversation.name;
    const previousAvatar = activeConversation.avatar;
    let nextAvatar = previousAvatar;

    if (modalState.editGroupAvatarFile) {
      /* Code cũ bị thiếu mediaType dẫn đến lỗi 400:
      const formData = new FormData();
      formData.append('file', editGroupAvatarFile);
      const uploadResult = await apiClient.post<
        ApiSuccessResponse<{ url?: string; fileUrl?: string }>
      >('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      nextAvatar = uploadResult.data.data?.url ?? uploadResult.data.data?.fileUrl ?? previousAvatar;
      */

      // Code mới: Sử dụng mutation đã cấu hình chuẩn (gửi kèm cả mediaType)
      try {
        const uploadResult = await uploadMedia({
          file: modalState.editGroupAvatarFile,
          mediaType: 'image',
        }).unwrap();
        nextAvatar = uploadResult.data?.url ?? previousAvatar;
      } catch (err) {
        console.error('Avatar upload failed:', err);
        // Không ngắt luồng chính, nhưng thông báo cho người dùng
        toast.error('Không thể tải lên ảnh đại diện mới');
      }
    }

    dispatch(
      chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
        const conv = draft?.data?.find((item) => item.conversationId === activeConversationId);
        if (conv) {
          conv.name = nextName;
          if (nextAvatar) conv.avatar = nextAvatar;
        }
      }),
    );

    try {
      await apiClient.put(`/chat/groups/${activeConversationId}`, {
        name: nextName,
        avatar: nextAvatar,
      });
      modalActions.setShowEditGroupModal(false);
      modalActions.setEditGroupAvatarFile(null);
      toast.success('Cập nhật nhóm thành công');

      // System message: group name changed (centered)
      const now = new Date();
      const userName = currentUser?.displayName || 'Bạn';
      let content = '';
      if (previousName && previousName !== nextName) {
        content = `Tên nhóm đã đổi từ '${previousName}' thành '${nextName}'`;
      } else {
        content = `${userName} đã đổi tên nhóm thành '${nextName}'`;
      }
      const systemMsg: IMessage = {
        messageId: `system-${Date.now()}`,
        conversationId: activeConversationId,
        senderId: 'system',
        senderDisplayName: 'Hệ thống',
        type: 'system',
        content,
        mediaUrl: null,
        thumbnailUrl: null,
        replyTo: null,
        replyToDetails: null,
        isPinned: false,
        isEdited: false,
        isRecalled: false,
        isDeleted: false,
        reactions: {},
        status: 'sent',
        createdAt: now.toISOString(),
      };
      // Push to local message list
      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId: activeConversationId }, (draft) => {
          if (!draft.data) draft.data = [];
          draft.data.push(systemMsg);
        })
      );
      // Broadcast via socket to all group members
      socketService.emit('message:new', systemMsg);
    } catch (error) {
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          const conv = draft?.data?.find((item) => item.conversationId === activeConversationId);
          if (conv) {
            conv.name = previousName ?? conv.name;
            conv.avatar = previousAvatar;
          }
        }),
      );
      toast.error('Không thể cập nhật nhóm');
      console.error('Failed to update group:', error);
    } finally {
      setActionBusy('updateGroup', false);
    }
  }, [
    activeConversationId,
    activeConversation,
    modalState.editGroupName,
    modalState.editGroupAvatarFile,
    dispatch,
    setActionBusy,
    uploadMedia,
    modalActions,
  ]);

  const handleDeleteGroup = useCallback(async () => {
    if (!activeConversationId) return;
    setActionBusy('deleteGroup', true);
    try {
      await deleteGroupMutation(activeConversationId).unwrap();
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          if (!draft?.data) return;
          draft.data = draft.data.filter((c) => c.conversationId !== activeConversationId);
        }),
      );
      toast.success('Đã giải tán nhóm');
      void navigate('/chat', { replace: true });
    } catch (error: unknown) {
      const msg =
        (error as { data?: { error?: { message?: string } } })?.data?.error?.message ??
        (error as { message?: string })?.message;
      toast.error(typeof msg === 'string' && msg.trim() ? msg : 'Không thể giải tán nhóm');
      console.error('Failed to delete group:', error);
      throw error;
    } finally {
      setActionBusy('deleteGroup', false);
    }
  }, [activeConversationId, deleteGroupMutation, dispatch, navigate, setActionBusy]);

  const handleLeaveGroup = useCallback(async (opts?: { newOwnerUserId?: string }) => {
    if (!activeConversationId) return;
    setActionBusy('leaveGroup', true);
    try {
      await leaveGroupMutation({
        groupId: activeConversationId,
        newOwnerUserId: opts?.newOwnerUserId,
      }).unwrap();
      toast.success('Đã rời nhóm');
      void navigate('/chat', { replace: true });
    } catch (error: unknown) {
      const msg =
        (error as { data?: { error?: { message?: string } } })?.data?.error?.message ??
        (error as { message?: string })?.message;
      toast.error(typeof msg === 'string' && msg.trim() ? msg : 'Không thể rời nhóm');
      console.error('Failed to leave group:', error);
      throw error;
    } finally {
      setActionBusy('leaveGroup', false);
    }
  }, [activeConversationId, leaveGroupMutation, navigate, setActionBusy]);

  const handleAddMembers = useCallback(
    async (memberIds: string[]) => {
      if (!activeConversationId || memberIds.length === 0) return;
      setActionBusy('addMembers', true);
      try {
        await apiClient.post(`/chat/groups/${activeConversationId}/members`, { memberIds });
        toast.success('Đã gửi lời mời vào nhóm');
        // Nghiệp vụ mới: người được mời nằm ở "Chờ duyệt" cho tới khi được duyệt/chấp nhận.
        await fetchGroupRequests(activeConversationId);
        modalActions.setSelectedAddMembers([]);
        modalActions.setShowAddMembersModal(false);
      } catch (error) {
        const status = (error as any)?.response?.status;
        if (status === 403) {
          toast.error('Bạn không có quyền mời thành viên');
        } else {
          toast.error('Không thể gửi lời mời');
        }
        console.error('Failed to add members:', error);
      } finally {
        setActionBusy('addMembers', false);
      }
    },
    [activeConversationId, fetchGroupRequests, setActionBusy, modalActions],
  );

  const handleSubmitTask = useCallback(async () => {
    if (!activeConversationId || !modalState.taskTitle.trim()) return;
    setActionBusy('createTask', true);
    const optimisticTask: GroupTask = {
      taskId: `tmp-${Date.now()}`,
      title: modalState.taskTitle.trim(),
      description: modalState.taskNote.trim(),
      assignees: modalState.taskAssignees,
      status: 'todo',
      dueDate: modalState.taskDeadline || undefined,
      createdAt: new Date().toISOString(),
      creatorId: currentUserId,
      creatorDisplayName: currentUser?.displayName?.trim() ?? null,
    };
    setGroupTasks((prev) => [optimisticTask, ...prev]);
    try {
      await apiClient.post(`/chat/groups/${activeConversationId}/tasks`, {
        title: modalState.taskTitle.trim(),
        description: modalState.taskNote.trim(),
        assignees: modalState.taskAssignees,
        assignToAll: modalState.taskAssignToAll,
        dueDate: modalState.taskDeadline || undefined,
      });
      toast.success('Đã tạo công việc');
      await fetchGroupTasks(activeConversationId);
      modalActions.closeTaskModal();
    } catch (err) {
      setGroupTasks((prev) => prev.filter((task) => task.taskId !== optimisticTask.taskId));
      toast.error('Không thể tạo công việc');
      console.error('Failed to create task:', err);
    } finally {
      setActionBusy('createTask', false);
    }
  }, [
    activeConversationId,
    modalState.taskTitle,
    modalState.taskNote,
    modalState.taskAssignees,
    modalState.taskAssignToAll,
    modalState.taskDeadline,
    modalActions,
    fetchGroupTasks,
    setActionBusy,
    currentUserId,
    currentUser?.displayName,
  ]);

  const openAISummaryFromPanel = useCallback(async () => {
    modalActions.setShowAISummaryModal(true);
    if (latestRecap) {
      modalActions.setAiSummaryResult(latestRecap.content);
      return;
    }
    modalActions.setAiSummaryResult('');
    modalActions.setAiSummaryLoading(true);
    try {
      if (!activeConversationId) return;
      const result = await apiClient.post<ApiSuccessResponse<AIRecap>>(
        `/chat/groups/${activeConversationId}/ai-recap`,
      );
      setLatestRecap(result.data.data);
      modalActions.setAiSummaryResult(result.data.data?.content ?? '');
    } catch {
      modalActions.setAiSummaryResult('Không thể tạo tóm tắt vào lúc này.');
    } finally {
      modalActions.setAiSummaryLoading(false);
    }
  }, [activeConversationId, latestRecap, modalActions]);

  const handleRerunAISummary = useCallback(async () => {
    if (!activeConversationId) return;
    modalActions.setAiSummaryResult('');
    modalActions.setAiSummaryLoading(true);
    try {
      const result = await apiClient.post<ApiSuccessResponse<AIRecap>>(
        `/chat/groups/${activeConversationId}/ai-recap`,
      );
      setLatestRecap(result.data.data);
      modalActions.setAiSummaryResult(result.data.data?.content ?? '');
      toast.success('Đã tạo AI recap');
    } catch {
      modalActions.setAiSummaryResult('Không thể làm mới tóm tắt.');
      toast.error('Không thể tạo AI recap');
    } finally {
      modalActions.setAiSummaryLoading(false);
    }
  }, [activeConversationId, modalActions]);

  const handleCreatePoll = useCallback(async () => {
    if (!activeConversationId || !modalState.pollQuestion.trim()) return;
    setActionBusy('createPoll', true);
    const optimisticPoll: GroupPoll = {
      pollId: `tmp-${Date.now()}`,
      question: modalState.pollQuestion.trim(),
      options: modalState.pollOptions.filter((o) => o.trim()).map((text) => ({ text, voters: [] })),
      createdAt: new Date().toISOString(),
      isClosed: false,
      isMultipleChoice: modalState.pollMultipleChoice,
      creatorId: currentUserId,
      creatorDisplayName: currentUser?.displayName?.trim() ?? null,
    };
    setGroupPolls((prev) => [optimisticPoll, ...prev]);
    try {
      await apiClient.post(`/chat/groups/${activeConversationId}/polls`, {
        question: modalState.pollQuestion.trim(),
        options: modalState.pollOptions.filter((o) => !!o.trim()),
        isMultipleChoice: modalState.pollMultipleChoice,
      });
      toast.success('Tạo bình chọn thành công');
      await fetchGroupPolls(activeConversationId);
      modalActions.setShowPollModal(false);
      modalActions.setPollQuestion('');
      modalActions.setPollOptions(['', '']);
      modalActions.setPollMultipleChoice(false);
    } catch (err) {
      setGroupPolls((prev) => prev.filter((poll) => poll.pollId !== optimisticPoll.pollId));
      toast.error('Không thể tạo bình chọn');
      console.error('Failed to create poll:', err);
    } finally {
      setActionBusy('createPoll', false);
    }
  }, [
    activeConversationId,
    modalState.pollQuestion,
    modalState.pollOptions,
    modalState.pollMultipleChoice,
    fetchGroupPolls,
    setActionBusy,
    currentUserId,
    currentUser?.displayName,
    modalActions,
  ]);

  const openCreateGroupModal = useCallback(() => {
    modalActions.setShowCreateGroupModal(true);
    modalActions.setSelectedGroupMembers([]);
    modalActions.setGroupName('');
  }, [modalActions]);

  const handleToggleConversationMute = useCallback(
    async (conversationId: string) => {
      const c = conversations.find((x) => x.conversationId === conversationId);
      if (!(c?.isMuted ?? false)) return;
      try {
        await updateConversationPreferences({
          conversationId,
          isMuted: false,
          notificationsMutedUntil: null,
        }).unwrap();
        toast.success('Đã bật thông báo');
      } catch {
        toast.error('Không thể cập nhật thông báo');
      }
    },
    [conversations, updateConversationPreferences],
  );

  const handleApplyMuteFromModal = useCallback(
    async (payload: MuteNotificationsApplyPayload) => {
      if (!activeConversationId) {
        toast.error('Không có hội thoại đang mở');
        throw new Error('no_active');
      }
      try {
        if (payload.kind === 'muteFor') {
          await updateConversationPreferences({
            conversationId: activeConversationId,
            muteFor: payload.muteFor,
          }).unwrap();
          toast.success(
            payload.muteFor === '1h'
              ? 'Đã tắt thông báo trong 1 giờ'
              : 'Đã tắt thông báo trong 4 giờ',
          );
        } else if (payload.kind === 'untilIso') {
          await updateConversationPreferences({
            conversationId: activeConversationId,
            isMuted: false,
            notificationsMutedUntil: payload.notificationsMutedUntil,
          }).unwrap();
          toast.success('Đã tắt thông báo đến 8:00 sáng');
        } else {
          await updateConversationPreferences({
            conversationId: activeConversationId,
            isMuted: true,
          }).unwrap();
          toast.success('Đã tắt thông báo đến khi bạn bật lại');
        }
      } catch {
        toast.error('Không thể cập nhật thông báo');
        throw new Error('mute_failed');
      }
    },
    [activeConversationId, updateConversationPreferences],
  );

  const handleToggleConversationPin = useCallback(
    async (conversationId: string) => {
      const c = conversations.find((x) => x.conversationId === conversationId);
      const next = !(c?.isPinnedToTop ?? false);
      if (next) {
        const pinnedTopCount = conversations.filter((x) => x.isPinnedToTop).length;
        if (!c?.isPinnedToTop && pinnedTopCount >= MAX_PINNED_CHATS_TO_TOP) {
          setConvPinLimitPendingId(conversationId);
          return;
        }
      }
      try {
        await updateConversationPreferences({ conversationId, isPinnedToTop: next }).unwrap();
        toast.success(next ? 'Đã ghim hội thoại' : 'Đã bỏ ghim hội thoại');
      } catch (e: unknown) {
        const err = e as { status?: number; data?: { error?: { message?: string } } };
        const msg = err?.data?.error?.message ?? '';
        if (
          next &&
          (msg.includes('Chỉ ghim được tối đa') || err.status === 403)
        ) {
          setConvPinLimitPendingId(conversationId);
        } else {
          toast.error(msg || 'Không thể cập nhật ghim hội thoại');
        }
      }
    },
    [conversations, updateConversationPreferences],
  );

  const handleUnpinFromConvPinModal = useCallback(
    async (targetConversationId: string) => {
      setConvPinLimitUnpinningId(targetConversationId);
      try {
        await updateConversationPreferences({
          conversationId: targetConversationId,
          isPinnedToTop: false,
        }).unwrap();
        toast.success('Đã bỏ ghim hội thoại');
      } catch (err: unknown) {
        const msg = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
        toast.error(msg ?? 'Không thể bỏ ghim');
      } finally {
        setConvPinLimitUnpinningId(null);
      }
    },
    [updateConversationPreferences],
  );

  const handleConfirmPendingConvPin = useCallback(async () => {
    if (!convPinLimitPendingId) return;
    const pinnedTopCount = conversations.filter((x) => x.isPinnedToTop).length;
    if (pinnedTopCount >= MAX_PINNED_CHATS_TO_TOP) {
      toast.info('Vui lòng bỏ ghim ít nhất một hội thoại trước.');
      return;
    }
    const pendingId = convPinLimitPendingId;
    setConvPinLimitConfirmBusy(true);
    try {
      await updateConversationPreferences({ conversationId: pendingId, isPinnedToTop: true }).unwrap();
      toast.success('Đã ghim hội thoại');
      setConvPinLimitPendingId(null);
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(msg ?? 'Không thể ghim hội thoại');
    } finally {
      setConvPinLimitConfirmBusy(false);
    }
  }, [convPinLimitPendingId, conversations, updateConversationPreferences]);

  const handleToggleAddMember = useCallback((userId: string, checked: boolean) => {
    modalActions.setSelectedAddMembers((prev) =>
      checked ? [...prev, userId] : prev.filter((id) => id !== userId),
    );
  }, [modalActions]);

  const handleRequestJoin = useCallback(async () => {
    if (!activeConversationId || groupJoinRequested) return;
    setActionBusy('requestJoin', true);
    setGroupJoinRequested(true);
    try {
      await apiClient.post(`/chat/groups/${activeConversationId}/request`);
      toast.success('Đã gửi yêu cầu tham gia');
    } catch (error) {
      setGroupJoinRequested(false);
      toast.error('Không thể gửi yêu cầu tham gia');
      console.error('Failed to request join:', error);
    } finally {
      setActionBusy('requestJoin', false);
    }
  }, [activeConversationId, groupJoinRequested, setActionBusy]);

  const handleAddPollOption = useCallback(
    async (pollId: string) => {
      if (!activeConversationId) return;
      const optionText = window.prompt('Nhập lựa chọn mới');
      if (!optionText?.trim()) return;
      setActionBusy('addPollOption', true);
      const before = groupPolls;
      setGroupPolls((prev) =>
        prev.map((poll) =>
          poll.pollId === pollId
            ? { ...poll, options: [...poll.options, { text: optionText.trim(), voters: [] }] }
            : poll,
        ),
      );
      try {
        await apiClient.post(`/chat/groups/${activeConversationId}/polls/${pollId}/options`, {
          text: optionText.trim(),
        });
        toast.success('Đã thêm lựa chọn');
        await fetchGroupPolls(activeConversationId);
      } catch (error) {
        setGroupPolls(before);
        toast.error('Không thể thêm lựa chọn');
        console.error('Failed to add poll option:', error);
      } finally {
        setActionBusy('addPollOption', false);
      }
    },
    [activeConversationId, groupPolls, fetchGroupPolls, setActionBusy],
  );

  const handleClosePoll = useCallback(
    async (pollId: string) => {
      if (!activeConversationId) return;
      setActionBusy('closePoll', true);
      const before = groupPolls;
      setGroupPolls((prev) =>
        prev.map((poll) => (poll.pollId === pollId ? { ...poll, isClosed: true } : poll)),
      );
      try {
        await apiClient.post(`/chat/groups/${activeConversationId}/polls/${pollId}/close`);
        toast.success('Đã đóng bình chọn');
      } catch (error) {
        setGroupPolls(before);
        toast.error('Không thể đóng bình chọn');
        console.error('Failed to close poll:', error);
      } finally {
        setActionBusy('closePoll', false);
      }
    },
    [activeConversationId, groupPolls, setActionBusy],
  );

  const handleApproveRequest = useCallback(async (userId: string) => {
    if (!activeConversationId) return;
    
    const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';
    if (!isAdminOrOwner) {
      toast.error('Bạn không có quyền duyệt yêu cầu tham gia');
      return;
    }

    setActionBusy('approveRequest', true);
    const targetRequest = groupRequests.find((item) => item.userId === userId);
    const beforeRequests = groupRequests;
    const beforeMembers = groupMembers;
    setGroupRequests((prev) => prev.filter((item) => item.userId !== userId));
    if (targetRequest) {
      setGroupMembers((prev) => [
        ...prev,
        {
          userId: targetRequest.userId,
          name: targetRequest.name,
          avatar: targetRequest.avatar,
          role: 'member',
          joinedAt: new Date().toISOString(),
        },
      ]);
    }
    try {
      await apiClient.post(`/chat/groups/${activeConversationId}/requests/${userId}/approve`);
      toast.success('Đã duyệt yêu cầu');
      void refetchConversations();
    } catch (err) {
      setGroupRequests(beforeRequests);
      setGroupMembers(beforeMembers);
      toast.error('Không thể duyệt yêu cầu');
      console.error('Failed to approve request:', err);
    } finally {
      setActionBusy('approveRequest', false);
    }
  }, [activeConversationId, groupRequests, groupMembers, refetchConversations, setActionBusy]);

  const handleRejectRequest = useCallback(async (userId: string) => {
    if (!activeConversationId) return;
    
    const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';
    if (!isAdminOrOwner) {
      toast.error('Bạn không có quyền từ chối yêu cầu tham gia');
      return;
    }

    setActionBusy('rejectRequest', true);
    const before = groupRequests;
    setGroupRequests((prev) => prev.filter((item) => item.userId !== userId));
    try {
      await apiClient.post(`/chat/groups/${activeConversationId}/requests/${userId}/reject`);
      toast.success('Đã từ chối yêu cầu');
    } catch (err) {
      setGroupRequests(before);
      toast.error('Không thể từ chối yêu cầu');
      console.error('Failed to reject request:', err);
    } finally {
      setActionBusy('rejectRequest', false);
    }
  }, [activeConversationId, groupRequests, setActionBusy]);

  const handleKickMember = useCallback(async (userId: string) => {
    if (!activeConversationId) return;
    
    const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';
    if (!isAdminOrOwner) {
      toast.error('Bạn không có quyền mời thành viên ra khỏi nhóm');
      return;
    }

    if (window.confirm('Bạn có chắc muốn mời người này ra khỏi nhóm?')) {
      setActionBusy('removeMember', true);
      const before = groupMembers;
      setGroupMembers((prev) => prev.filter((m) => m.userId !== userId));
      try {
        await apiClient.delete(`/chat/groups/${activeConversationId}/members/${userId}`);
        toast.success('Đã xóa thành viên');
      } catch (err) {
        setGroupMembers(before);
        toast.error('Không thể xóa thành viên');
        console.error('Failed to kick member:', err);
      } finally {
        setActionBusy('removeMember', false);
      }
    }
  }, [activeConversationId, groupMembers, setActionBusy]);

  const handleVotePoll = useCallback(async (pollId: string, optionIndex: number) => {
    if (!activeConversationId) return;
    setActionBusy('votePoll', true);
    const before = groupPolls;
    const pollBefore = groupPolls.find((p) => p.pollId === pollId);
    const hadVotedHereBefore = !!pollBefore?.options?.[optionIndex]?.voters?.includes(currentUserId);
    setGroupPolls((prev) =>
      prev.map((poll) => {
        if (poll.pollId !== pollId) return poll;
        const isMultiple = poll.isMultipleChoice === true;
        const nextOptions = poll.options.map((option, index) => {
          const currentVoters = option.voters ?? [];
          const hasVotedHere = currentVoters.includes(currentUserId);
          if (!isMultiple) {
            // single-choice: only one option can contain currentUserId
            if (index === optionIndex) {
              return hasVotedHere
                ? { ...option, voters: currentVoters.filter((id) => id !== currentUserId) }
                : { ...option, voters: [...currentVoters, currentUserId] };
            }
            return { ...option, voters: currentVoters.filter((id) => id !== currentUserId) };
          }
          // multiple-choice: toggle only this option
          if (index === optionIndex) {
            return hasVotedHere
              ? { ...option, voters: currentVoters.filter((id) => id !== currentUserId) }
              : { ...option, voters: [...currentVoters, currentUserId] };
          }
          return option;
        });
        return { ...poll, options: nextOptions };
      })
    );
    try {
      if (hadVotedHereBefore) {
        await apiClient.post(`/chat/groups/${activeConversationId}/polls/${pollId}/unvote`, { optionIndex });
      } else {
        await apiClient.post(`/chat/groups/${activeConversationId}/polls/${pollId}/vote`, { optionIndex });
      }
    } catch (error) {
      setGroupPolls(before);
      toast.error('Không thể bình chọn');
      console.error('Failed to vote poll:', error);
    } finally {
      setActionBusy('votePoll', false);
    }
  }, [activeConversationId, groupPolls, currentUserId, setActionBusy]);

  const openPollVoteModal = useCallback((pollId: string) => {
    modalActions.setActivePollId(pollId);
    modalActions.setShowPollVoteModal(true);
  }, [modalActions]);

  const handleToggleTaskStatus = useCallback(async (taskId: string) => {
    if (!activeConversationId) return;
    setActionBusy('updateTask', true);
    const before = groupTasks;
    const currentTask = groupTasks.find((task) => task.taskId === taskId);
    if (!currentTask) return;
    const nextStatus: GroupTask['status'] = currentTask.status === 'done' ? 'todo' : 'done';
    setGroupTasks((prev) => prev.map((task) => (task.taskId === taskId ? { ...task, status: nextStatus } : task)));
    try {
      await apiClient.put(`/chat/groups/${activeConversationId}/tasks/${taskId}`, { status: nextStatus });
    } catch (error) {
      setGroupTasks(before);
      toast.error('Không thể cập nhật công việc');
      console.error('Failed to update task:', error);
    } finally {
      setActionBusy('updateTask', false);
    }
  }, [activeConversationId, groupTasks, setActionBusy]);

  const messageActions = useMemo(
    () => ({
      handleSaveEdit,
      handleRecallMsg,
      handleDeleteMsg,
      handleMessageConfirm,
      handleTogglePinMsg,
      handleReactMessage,
    }),
    [
      handleSaveEdit,
      handleRecallMsg,
      handleDeleteMsg,
      handleMessageConfirm,
      handleTogglePinMsg,
      handleReactMessage,
    ],
  );

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

  const { messagesContainerRef, messagesEndRef, unreadIncomingCount, handleJumpToLatest } =
    useChatScrollBehavior({
      allMessages,
      activeConversationId,
      currentUserId,
      typingUsers,
      actionMenuMsgId: modalState.actionMenuMsgId,
      setActionMenuMsgId: modalActions.setActionMenuMsgId,
    });

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
        onOpenCreateGroup={openCreateGroupModal}
        onOpenMarkRead={() => modalActions.setShowMarkReadModal(true)}
        onOpenAddFriend={() => modalActions.setShowAddFriendModal(true)}
        onToggleConversationMute={handleToggleConversationMute}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        {modalState.showContactsManagement ? (
          <FriendsListView onFriendClick={handleFriendClick} />
        ) : (
          <>
            <ChatHeader
              activeConversation={activeConversation}
              typingUsers={[...typingUsers]}
              showInfo={modalState.showInfo}
              onToggleShowInfo={() => modalActions.setShowInfo(!modalState.showInfo)}
              onAddMember={groupController.openAddMembersModal}
              onEditGroup={groupController.openEditGroupModal}
              onAudioCall={handleAudioCall}
              onVideoCall={handleVideoCall}
              currentUserRole={currentUserRole}
              resolvedMemberCount={
                activeConversation?.type === 'group' && groupMembers.length > 0
                  ? groupMembers.length
                  : undefined
              }
              onSearchMessages={activeConversationId ? requestOpenConversationSearch : undefined}
            />

            {activeConversationId &&
              ((activeConversation?.pinnedMessageCount ?? 0) > 0 || pinnedMessagesOrdered.length > 0) && (
                <div className="w-full shrink-0">
                  {pinnedMessagesOrdered.length > 0 ? (
                    <PinnedMessagesBar
                      key={activeConversationId}
                      pinnedMessages={pinnedMessagesOrdered}
                      onScrollToMessage={scrollToMessageBubble}
                      onTogglePin={handleTogglePinMsg}
                    />
                  ) : (
                    <div className="w-full shrink-0 border-b border-slate-200 dark:border-slate-700 bg-[#f5f6f8] dark:bg-zinc-800/50 px-3 py-2.5 text-center text-xs text-muted-foreground">
                      Đang tải danh sách tin ghim…
                    </div>
                  )}
                </div>
              )}

            <ChatMessageList
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              allMessages={allMessages}
              activeConversationId={activeConversationId}
              activeConversation={activeConversation}
              currentUserId={currentUserId}
              typingUsers={[...typingUsers]}
              unreadIncomingCount={unreadIncomingCount}
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
              onTogglePin={handleTogglePinMsg}
              onRecall={handleRecallMsg}
              onDelete={handleDeleteMsg}
              onReply={(msg) => dispatch(setReplyingTo(msg))}
              onReact={handleReactMessage}
              onJumpToLatest={handleJumpToLatest}
              groupTasks={groupTasks}
              onTaskJoined={(taskId) => {
                setGroupTasks((prev) =>
                  prev.map((t) => {
                    if (t.taskId !== taskId) return t;
                    const p = Array.isArray(t.participants) ? t.participants : [];
                    return p.includes(currentUserId) ? t : { ...t, participants: [...p, currentUserId] };
                  }),
                );
              }}
              onOpenPollVote={(pollId) => openPollVoteModal(pollId)}
              shareTargetConversations={conversations}
              onForwardMediaMessage={handleForwardMediaMessage}
            />

            <ChatComposer
              activeConversation={activeConversation}
              activeConversationId={activeConversationId}
              onOpenPoll={() => modalActions.setShowPollModal(true)}
              onOpenTask={() => modalActions.setShowTaskModal(true)}
            />
          </>
        )}
      </div>

      {modalState.showInfo && !modalState.showContactsManagement && (
        <ConversationInfoPanel
          numRequests={groupRequests.length}
          activeConversation={activeConversation}
          onOpenAISummaryFromPanel={openAISummaryFromPanel}
          onEditGroup={groupController.openEditGroupModal}
          onAddMembers={groupController.openAddMembersModal}
          onOpenCreateGroup={openCreateGroupModal}
          onToggleMuteNotifications={
            activeConversationId ? () => void handleToggleConversationMute(activeConversationId) : undefined
          }
          onApplyMuteFromModal={
            activeConversationId ? handleApplyMuteFromModal : undefined
          }
          onTogglePinConversation={
            activeConversationId ? () => void handleToggleConversationPin(activeConversationId) : undefined
          }
          onRequestJoin={() => void handleRequestJoin()}
          onVotePoll={(pollId, optionIndex) => void handleVotePoll(pollId, optionIndex)}
          onOpenPollVote={(pollId) => openPollVoteModal(pollId)}
          onAddPollOption={(pollId) => void handleAddPollOption(pollId)}
          onClosePoll={(pollId) => void handleClosePoll(pollId)}
          onToggleTask={(taskId) => void handleToggleTaskStatus(taskId)}
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
          onLeaveGroup={handleLeaveGroup}
          onDeleteGroup={handleDeleteGroup}
          // Modal "Thành viên" đã render ngay trong panel, giữ callback cũ để tương thích nhưng không dùng nữa.
          onOpenMemberModal={() => {}}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          members={groupMembers}
          requests={groupRequests}
          onApproveMember={handleApproveRequest}
          onRejectMember={handleRejectRequest}
          onKickMember={handleKickMember}
          busyMemberActions={{
            approving: groupActionLoading.approveRequest,
            rejecting: groupActionLoading.rejectRequest,
            removing: groupActionLoading.removeMember,
            changingRole: groupActionLoading.changeRole,
          }}
          conversationMessages={allMessages}
          conversationSearchRequestTick={conversationSearchRequestTick}
          onJumpToMessage={scrollToMessageBubble}
          conversations={conversations}
          onSelectConversation={handleSelectConversation}
        />
      )}

      <PollVoteModal
        open={modalState.showPollVoteModal}
        onClose={() => modalActions.setShowPollVoteModal(false)}
        poll={
          modalState.activePollId ? (groupPolls.find((p) => p.pollId === modalState.activePollId) as any) : null
        }
        currentUserId={currentUserId}
        onToggleVote={(pollId, optionIndex) => void handleVotePoll(pollId, optionIndex)}
      />

      <MarkReadModal
        open={modalState.showMarkReadModal}
        onClose={() => modalActions.setShowMarkReadModal(false)}
      />
      <AddFriendModal
        open={modalState.showAddFriendModal}
        query={modalState.addFriendQuery}
        onQueryChange={modalActions.setAddFriendQuery}
        onClose={() => {
          modalActions.setShowAddFriendModal(false);
          modalActions.setAddFriendQuery('');
        }}
      />
      <PinLimitModal
        open={pinLimitModalMsg !== null}
        currentPinned={pinnedMessagesOrdered}
        pendingPin={pinLimitModalMsg}
        replaceIndex={pinReplaceIndex}
        onReplaceIndexChange={setPinReplaceIndex}
        isSubmitting={pinLimitSubmitting}
        onClose={() => {
          if (!pinLimitSubmitting) setPinLimitModalMsg(null);
        }}
        onConfirm={handleConfirmPinReplace}
      />
      <ConversationPinLimitModal
        open={convPinLimitPendingId !== null}
        pendingConversationId={convPinLimitPendingId}
        pendingName={
          conversations.find((x) => x.conversationId === convPinLimitPendingId)?.name ?? 'Hội thoại'
        }
        pinnedConversations={conversationsPinnedToTop}
        isConfirming={convPinLimitConfirmBusy}
        unpinningConversationId={convPinLimitUnpinningId}
        onClose={() => {
          if (!convPinLimitConfirmBusy && !convPinLimitUnpinningId) setConvPinLimitPendingId(null);
        }}
        onUnpinConversation={(id) => void handleUnpinFromConvPinModal(id)}
        onConfirmPinPending={() => void handleConfirmPendingConvPin()}
      />
      <ConfirmModal
        open={modalState.messageConfirm !== null}
        title={
          modalState.messageConfirm?.kind === 'delete'
            ? 'Xóa tin nhắn'
            : modalState.messageConfirm?.kind === 'recall'
              ? 'Thu hồi tin nhắn'
              : ''
        }
        description={
          modalState.messageConfirm?.kind === 'delete'
            ? 'Chỉ xóa trên thiết bị của bạn; người khác trong cuộc trò chuyện vẫn thấy tin nhắn.'
            : modalState.messageConfirm?.kind === 'recall'
              ? 'Thu hồi cho mọi người — không ai còn xem được nội dung tin này.'
              : undefined
        }
        confirmLabel={modalState.messageConfirm?.kind === 'delete' ? 'Xóa' : 'Thu hồi'}
        variant={modalState.messageConfirm?.kind === 'delete' ? 'danger' : 'primary'}
        isConfirming={modalState.messageConfirmSubmitting}
        onClose={() => {
          if (!modalState.messageConfirmSubmitting) modalActions.setMessageConfirm(null);
        }}
        onConfirm={() => void handleMessageConfirm()}
      />
      <ProfileModal
        open={modalState.showProfileModal}
        onClose={() => modalActions.setShowProfileModal(false)}
      />
      <CreateGroupModal
        open={modalState.showCreateGroupModal}
        onClose={() => modalActions.setShowCreateGroupModal(false)}
        groupName={modalState.groupName}
        onGroupNameChange={modalActions.setGroupName}
        selectedGroupMembers={modalState.selectedGroupMembers}
        onToggleMember={handleToggleGroupMember}
        onConfirmCreate={handleConfirmCreateGroup}
      />
      <PollModal
        open={modalState.showPollModal}
        onClose={() => modalActions.setShowPollModal(false)}
        pollQuestion={modalState.pollQuestion}
        onPollQuestionChange={modalActions.setPollQuestion}
        pollOptions={modalState.pollOptions}
        onPollOptionsChange={modalActions.setPollOptions}
        multipleChoice={modalState.pollMultipleChoice}
        onMultipleChoiceChange={modalActions.setPollMultipleChoice}
        onCreatePoll={handleCreatePoll}
      />
      {false && (
        <MemberManagementModal
          open={showMemberModal}
          onClose={() => setShowMemberModal(false)}
          memberTab={memberTab}
          onMemberTabChange={setMemberTab}
          members={groupMembers}
          requests={groupRequests}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
          onKick={handleKickMember}
          busy={{
            approving: groupActionLoading.approveRequest,
            rejecting: groupActionLoading.rejectRequest,
            removing: groupActionLoading.removeMember,
            changingRole: groupActionLoading.changeRole,
          }}
        />
      )}
      <AISummaryModal
        open={modalState.showAISummaryModal}
        onClose={() => modalActions.setShowAISummaryModal(false)}
        conversationName={activeConversation?.name}
        aiSummaryLoading={modalState.aiSummaryLoading}
        aiSummaryResult={modalState.aiSummaryResult}
        onRerunSummary={handleRerunAISummary}
      />
      <TaskModal
        open={modalState.showTaskModal}
        onClose={modalActions.closeTaskModal}
        currentUserId={currentUserId}
        assignToAll={modalState.taskAssignToAll}
        onAssignToAllChange={(v) => {
          modalActions.setTaskAssignToAll(v);
          if (v) modalActions.setTaskAssignees([]);
        }}
        members={groupMembers.map((m) => ({
          id: m.userId,
          name: m.name ?? m.userId,
          avatar:
            m.userId === currentUserId ? m.avatar ?? currentUser?.avatar ?? undefined : m.avatar ?? undefined,
          role: m.role,
        }))}
        taskTitle={modalState.taskTitle}
        onTaskTitleChange={modalActions.setTaskTitle}
        taskDeadline={modalState.taskDeadline}
        onTaskDeadlineChange={modalActions.setTaskDeadline}
        taskNote={modalState.taskNote}
        onTaskNoteChange={modalActions.setTaskNote}
        taskAssignees={modalState.taskAssignees}
        onTaskAssigneesChange={modalActions.setTaskAssignees}
        onSubmitTask={handleSubmitTask}
      />

      <AddMembersModal
        open={modalState.showAddMembersModal}
        onClose={() => modalActions.setShowAddMembersModal(false)}
        selectedIds={modalState.selectedAddMembers}
        existingMemberIds={groupMembers.map((member) => member.userId)}
        onToggleSelect={handleToggleAddMember}
        onConfirm={() => void handleAddMembers(modalState.selectedAddMembers)}
        isSubmitting={groupActionLoading.addMembers}
      />

      <EditGroupModal
        open={modalState.showEditGroupModal}
        groupName={modalState.editGroupName}
        avatarPreview={modalState.editGroupAvatarPreview}
        isSaving={groupActionLoading.updateGroup}
        onClose={() => {
          modalActions.setShowEditGroupModal(false);
          modalActions.setEditGroupAvatarFile(null);
        }}
        onGroupNameChange={modalActions.setEditGroupName}
        onAvatarFileChange={groupController.handleEditGroupAvatarFileChange}
        onSubmit={() => void handleUpdateGroup()}
      />

      <EditMessageDialog
        editingMessage={modalState.editingMessage}
        editDraft={modalState.editDraft}
        onEditDraftChange={modalActions.setEditDraft}
        onClose={() => modalActions.setEditingMessage(null)}
        onSave={handleSaveEdit}
        isEditing={isEditing}
      />
    </div>
    </ChatPageProvider>
  );
}
