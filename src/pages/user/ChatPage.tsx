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
import { useUploadMediaMutation, useUploadMediaMultiMutation, type MediaUploadResult } from '@/store/api/mediaApi';
import { useSocketContext } from '@/contexts/SocketContext';
import type { PendingAttachment } from '@/components/chat/ChatComposer';
import {
  setActiveConversation,
  messageReceived,
  messageEdited,
  messageRecalled,
  messagePinUpdated,
  messageReacted,
  typingStarted,
  typingStopped,
  resetUnread,
  setReplyingTo,
  clearReplyingTo,
} from '@/store/slices/chatSlice';
import { applyMessageHiddenForMe } from '@/store/applyMessageHiddenForMe';
import { socketService } from '@/services/socket';
import type { AppDispatch, RootState } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import { decodeJwtUserId, lastMessagePreviewContentFromMessage } from '@/utils/chatUtils';
import { ChatNavRail } from '@/components/chat/ChatNavRail';
import { ConversationListPanel, type ContactsTabId } from '@/components/chat/ConversationListPanel';
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
import { useCallContext } from '@/contexts/CallContext';
import { apiClient } from '@/services/api';
import type { ApiSuccessResponse } from '@/types/api.types';

type MessageConfirmState =
  | null
  | { kind: 'recall'; msg: IMessage }
  | { kind: 'delete'; msg: IMessage };

type GroupMemberRole = 'owner' | 'admin' | 'member';

type GroupMember = {
  userId: string;
  name?: string;
  avatar?: string;
  role: GroupMemberRole;
  joinedAt?: string;
};

type GroupRequest = {
  userId: string;
  avatar?: string;
  name?: string;
  requestedAt?: string;
};

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

type GroupActionLoading = {
  updateGroup: boolean;
  deleteGroup: boolean;
  leaveGroup: boolean;
  addMembers: boolean;
  removeMember: boolean;
  changeRole: boolean;
  requestJoin: boolean;
  approveRequest: boolean;
  rejectRequest: boolean;
  createPoll: boolean;
  votePoll: boolean;
  addPollOption: boolean;
  closePoll: boolean;
  createTask: boolean;
  updateTask: boolean;
  generateRecap: boolean;
};

const CHAT_NEAR_BOTTOM_PX = 80;
const MAX_PENDING_FILES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function roughMaxBytesForFile(file: File): number {
  if (file.type.startsWith('image/')) return MAX_IMAGE_BYTES;
  if (file.type.startsWith('video/')) return MAX_VIDEO_BYTES;
  return MAX_FILE_BYTES;
}

function messageTypeFromUploadResult(r: MediaUploadResult): IMessage['type'] {
  if (r.type === 'image') return 'image';
  if (r.type === 'video') return 'video';
  return 'file';
}

const EMPTY_ARRAY: any[] = [];

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


  const allMessages = useMemo(() => {
    const apiMessages = messagesData?.data ?? [];
    const statusRank = (x?: string) => (x === 'read' ? 3 : x === 'delivered' ? 2 : x === 'sent' ? 1 : 0);
    // Ghép isPinned / status từ buffer socket: khi patch RTK không khớp messageId hoặc refetch chậm, Redux vẫn đúng.
    const merged: IMessage[] = apiMessages.map((m) => {
      const mid = String(m.messageId);
      const sm = socketMessages.find((s) => String(s.messageId) === mid);
      if (!sm) return m;
      const pin = Boolean(m.isPinned) || Boolean(sm.isPinned);
      const bestStatus =
        statusRank(sm.status) > statusRank(m.status) ? sm.status : m.status ?? sm.status;
      const readBy = (m.readBy?.length ?? 0) >= (sm.readBy?.length ?? 0) ? m.readBy : sm.readBy;
      const pinChanged = pin !== Boolean(m.isPinned);
      const statusChanged = bestStatus !== m.status;
      const readByChanged = JSON.stringify(readBy ?? []) !== JSON.stringify(m.readBy ?? []);
      if (!pinChanged && !statusChanged && !readByChanged) return m;
      return {
        ...m,
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

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
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

  const handleVideoCall = useCallback(() => {
    if (activeConversation?.type !== 'direct' || !activeConversation.otherUserId) return;
    // CallContext sẽ lưu returnTo = location.pathname (đang là /chat/:conversationId)
    initiateCall(activeConversation.otherUserId, 'video');
  }, [activeConversation, initiateCall]);

  const [editingMessage, setEditingMessage] = useState<IMessage | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [actionMenuMsgId, setActionMenuMsgId] = useState<string | null>(null);
  const [messageConfirm, setMessageConfirm] = useState<MessageConfirmState>(null);
  const [messageConfirmSubmitting, setMessageConfirmSubmitting] = useState(false);
  const [pinLimitModalMsg, setPinLimitModalMsg] = useState<IMessage | null>(null);
  const [pinReplaceIndex, setPinReplaceIndex] = useState<number | null>(null);
  const [pinLimitSubmitting, setPinLimitSubmitting] = useState(false);
  const [convPinLimitPendingId, setConvPinLimitPendingId] = useState<string | null>(null);
  const [convPinLimitConfirmBusy, setConvPinLimitConfirmBusy] = useState(false);
  const [convPinLimitUnpinningId, setConvPinLimitUnpinningId] = useState<string | null>(null);
  const lastMarkReadKeyRef = useRef<string>('');

  const patchMessageInCache = useCallback(
    (conversationId: string, messageId: string, patch: Partial<IMessage>) => {
      patchMessageInGetMessagesCache(dispatch, conversationId, messageId, patch);
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
    initiateGroupCall,
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
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [unreadIncomingCount, setUnreadIncomingCount] = useState(0);

  const [showInfo, setShowInfo] = useState(true);
  const [showMarkReadModal, setShowMarkReadModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [conversationSearchRequestTick, setConversationSearchRequestTick] = useState(0);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollMultipleChoice, setPollMultipleChoice] = useState(false);
  const [showPollVoteModal, setShowPollVoteModal] = useState(false);
  const [activePollId, setActivePollId] = useState<string | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupAvatarFile, setEditGroupAvatarFile] = useState<File | null>(null);
  const [editGroupAvatarPreview, setEditGroupAvatarPreview] = useState<string | null>(null);
  const [selectedAddMembers, setSelectedAddMembers] = useState<string[]>([]);
  const [showAISummaryModal, setShowAISummaryModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskNote, setTaskNote] = useState('');
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);
  const [taskAssignToAll, setTaskAssignToAll] = useState(false);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryResult, setAiSummaryResult] = useState('');
  const [memberTab, setMemberTab] = useState<'list' | 'pending'>('list');
  const [showContactsManagement, setShowContactsManagement] = useState(false);
  const [contactsTab, setContactsTab] = useState<ContactsTabId>('friends');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [addFriendQuery, setAddFriendQuery] = useState('');

  const setActionBusy = useCallback((key: keyof GroupActionLoading, value: boolean) => {
    setGroupActionLoading((prev) => ({ ...prev, [key]: value }));
  }, []);

  const fetchGroupMembers = useCallback(async (groupId: string) => {
    setGroupLoading((prev) => ({ ...prev, members: true }));
    try {
      const res = await apiClient.get<ApiSuccessResponse<GroupMember[]>>(`/chat/groups/${groupId}/members`);
      const members = res.data.data ?? [];
      setGroupMembers(members);
      
      // Update join requested state if current user is not a member but in request list
      // (This logic might be better elsewhere but for now let's ensure we have members)
    } catch (err) {
      console.error('[fetchGroupMembers] Error:', err);
      setGroupMembers([]);
    } finally {
      setGroupLoading((prev) => ({ ...prev, members: false }));
    }
  }, []);

  const fetchGroupRequests = useCallback(async (groupId: string) => {
    setGroupLoading((prev) => ({ ...prev, requests: true }));
    try {
      const res = await apiClient.get<ApiSuccessResponse<GroupRequest[]>>(
        `/chat/groups/${groupId}/requests`,
      );
      setGroupRequests(res.data.data ?? []);
    } catch (err: any) {
      // Bỏ qua lỗi 403 nếu người dùng không có quyền xem yêu cầu gia nhập
      if (err.response?.status === 403) {
        setGroupRequests([]);
      } else {
        console.error('[fetchGroupRequests] Error:', err);
        setGroupRequests([]);
      }
    } finally {
      setGroupLoading((prev) => ({ ...prev, requests: false }));
    }
  }, []);

  const fetchGroupPolls = useCallback(async (groupId: string) => {
    setGroupLoading((prev) => ({ ...prev, polls: true }));
    try {
      const res = await apiClient.get<ApiSuccessResponse<GroupPoll[]>>(
        `/chat/groups/${groupId}/polls`,
      );
      setGroupPolls(res.data.data ?? []);
    } catch (err) {
      console.error('[fetchGroupPolls] Error:', err);
      setGroupPolls([]);
    } finally {
      setGroupLoading((prev) => ({ ...prev, polls: false }));
    }
  }, []);

  const fetchGroupTasks = useCallback(async (groupId: string) => {
    setGroupLoading((prev) => ({ ...prev, tasks: true }));
    try {
      const res = await apiClient.get<ApiSuccessResponse<GroupTask[]>>(
        `/chat/groups/${groupId}/tasks`,
      );
      setGroupTasks(res.data.data ?? []);
    } catch (err) {
      console.error('[fetchGroupTasks] Error:', err);
      setGroupTasks([]);
    } finally {
      setGroupLoading((prev) => ({ ...prev, tasks: false }));
    }
  }, []);

  const fetchLatestRecap = useCallback(async (groupId: string) => {
    setGroupLoading((prev) => ({ ...prev, recap: true }));
    try {
      const res = await apiClient.get<ApiSuccessResponse<AIRecap | null>>(
        `/chat/groups/${groupId}/ai-recap/latest`,
      );
      setLatestRecap(res.data.data ?? null);
    } catch (err) {
      // Just failing silently for recap
      setLatestRecap(null);
    } finally {
      setGroupLoading((prev) => ({ ...prev, recap: false }));
    }
  }, []);

  useEffect(() => {
    if (!activeConversationId || activeConversation?.type !== 'group') {
      setGroupMembers([]);
      setGroupRequests([]);
      setGroupPolls([]);
      setGroupTasks([]);
      setLatestRecap(null);
      setGroupJoinRequested(false);
      return;
    }

    void Promise.all([
      fetchGroupMembers(activeConversationId),
      fetchGroupRequests(activeConversationId),
      fetchGroupPolls(activeConversationId),
      fetchGroupTasks(activeConversationId),
      fetchLatestRecap(activeConversationId),
    ]);
  }, [
    activeConversationId,
    activeConversation?.type,
    fetchGroupMembers,
    fetchGroupRequests,
    fetchGroupPolls,
    fetchGroupTasks,
    fetchLatestRecap,
  ]);

  useEffect(() => {
    if (!activeConversationId || activeConversation?.type !== 'group') return;

    const isCurrentGroup = (data: unknown): boolean => {
      const payload = data as { groupId?: string; conversationId?: string };
      const eventGroupId = payload?.groupId ?? payload?.conversationId;
      return eventGroupId === activeConversationId;
    };

    const refreshMembers = () => {
      void fetchGroupMembers(activeConversationId);
      void refetchConversations();
    };

    const refreshRequests = () => {
      void fetchGroupRequests(activeConversationId);
      void refetchConversations();
    };

    const refreshPolls = () => {
      void fetchGroupPolls(activeConversationId);
    };

    const refreshTasks = () => {
      void fetchGroupTasks(activeConversationId);
    };

    const refreshRecap = () => {
      void fetchLatestRecap(activeConversationId);
    };



    // Realtime cập nhật thành viên nhóm
    const handleMemberChanged = (data: any) => {
      if (!isCurrentGroup(data)) return;
      refreshMembers();
    };

    const handleTaskChanged = (data: unknown) => {
      if (!isCurrentGroup(data)) return;
      refreshTasks();
    };

    const handleRequestsChanged = (data: unknown) => {
      if (!isCurrentGroup(data)) return;
      refreshRequests();
    };

    const handlePollChanged = (data: unknown) => {
      if (!isCurrentGroup(data)) return;
      refreshPolls();
    };

    const handleRecapChanged = (data: unknown) => {
      if (!isCurrentGroup(data)) return;
      refreshRecap();
    };

    socketService.on('group:member_joined', handleMemberChanged);
    socketService.on('group:member_left', handleMemberChanged);
    socketService.on('group:members_added', handleMemberChanged);
    socketService.on('group:member_removed', handleMemberChanged);
    socketService.on('group:role_changed', handleMemberChanged);
    socketService.on('group:join_request_new', handleRequestsChanged);
    socketService.on('group:join_request_updated', handleRequestsChanged);
    socketService.on('group:poll_new', handlePollChanged);
    socketService.on('group:poll_updated', handlePollChanged);
    socketService.on('group:task_new', handleTaskChanged);
    socketService.on('group:task_updated', handleTaskChanged);
    socketService.on('group:recap_new', handleRecapChanged);

    return () => {
      socketService.off('group:member_joined', handleMemberChanged);
      socketService.off('group:member_left', handleMemberChanged);
      socketService.off('group:members_added', handleMemberChanged);
      socketService.off('group:member_removed', handleMemberChanged);
      socketService.off('group:role_changed', handleMemberChanged);
      socketService.off('group:join_request_new', handleRequestsChanged);
      socketService.off('group:join_request_updated', handleRequestsChanged);
      socketService.off('group:poll_new', handlePollChanged);
      socketService.off('group:poll_updated', handlePollChanged);
      socketService.off('group:task_new', handleTaskChanged);
      socketService.off('group:task_updated', handleTaskChanged);
      socketService.off('group:recap_new', handleRecapChanged);
    };
  }, [
    activeConversationId,
    activeConversation?.type,
    fetchGroupMembers,
    refetchConversations,
    fetchGroupRequests,
    fetchGroupPolls,
    fetchGroupTasks,
    fetchLatestRecap,
    dispatch,
  ]);

  useEffect(() => {
    const handleNewMessage = (msg: IMessage) => {
      dispatch(messageReceived(msg));
      // Không hiện toast popup cho system message, chỉ hiển thị trong khung chat

      // Đồng bộ ngay lập tức tin nhắn cuối cùng (lastMessage) ở thanh sidebar
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          const conv = draft?.data?.find((item) => item.conversationId === msg.conversationId);
          if (conv) {
            conv.lastMessage = {
              messageId: msg.messageId,
              content: lastMessagePreviewContentFromMessage(msg),
              senderId: msg.senderId,
              type: msg.type,
              createdAt: msg.createdAt,
              senderDisplayName: msg.senderDisplayName,
            };
          }
        })
      );

      // Khi có poll mới trong hội thoại đang mở -> hiện toast/banner, click để mở modal (đỡ gián đoạn)
      try {
        if (msg.conversationId === activeConversationIdRef.current && (msg as any).type === 'system') {
          const raw = String(msg.content ?? '').trim();
          if (raw.startsWith('{')) {
            const obj = JSON.parse(raw) as any;
            if (obj?.kind === 'poll_created' && obj?.poll?.pollId) {
              const pollId = String(obj.poll.pollId);
              const question = String(obj?.poll?.question ?? '').trim();
              const toastId = `poll-created-${pollId}`;
              if (!toast.isActive(toastId)) {
                toast.info(question ? `Có bình chọn mới: ${question}` : 'Có bình chọn mới', {
                  toastId,
                  autoClose: 7000,
                  onClick: () => {
                    setActivePollId(pollId);
                    setShowPollVoteModal(true);
                  },
                });
              }
            }
          }
        }
      } catch {
        // ignore
      }
    };

    const handleEditedMessage = (payload: {
      messageId: string;
      conversationId: string;
      content: string;
    }) => {
      dispatch(messageEdited(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, {
        content: payload.content,
        isEdited: true,
      });
    };

    const handleRecalledMessage = (payload: { messageId: string; conversationId: string }) => {
      dispatch(messageRecalled(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, {
        isRecalled: true,
        content: 'Tin nhắn đã được thu hồi',
        isPinned: false,
      });
      setPinnedMessageOrderByConv((prev) => {
        const cid = payload.conversationId;
        const cur = prev[cid] ?? [];
        return { ...prev, [cid]: cur.filter((id) => id !== payload.messageId) };
      });
    };

    const handleHiddenForMe = (payload: { messageId: string; conversationId: string }) => {
      applyMessageHiddenForMe(dispatch, payload.conversationId, payload.messageId);
    };

    const handlePinUpdated = (payload: {
      messageId: string;
      conversationId: string;
      isPinned: boolean;
    }) => {
      dispatch(messagePinUpdated(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, { isPinned: payload.isPinned });
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

    const handleReactionEvent = (payload: {
      messageId: string;
      conversationId: string;
      reactions: Record<string, string[]>;
    }) => {
      dispatch(messageReacted(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, {
        reactions: payload.reactions,
      });
    };

    const handleTypingEvent = (payload: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
      displayName?: string;
    }) => {
      if (payload.isTyping) {
        dispatch(
          typingStarted({
            conversationId: payload.conversationId,
            userId: payload.userId,
            displayName: payload.displayName,
          }),
        );
      } else {
        dispatch(typingStopped({ conversationId: payload.conversationId, userId: payload.userId }));
      }
    };

    const handleGroupDisbanded = (data: { conversationId?: string; groupId?: string }) => {
      const cid = data?.conversationId ?? data?.groupId;
      if (!cid) return;
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          if (!draft?.data) return;
          draft.data = draft.data.filter((c) => c.conversationId !== cid);
        }),
      );
      dispatch(chatApi.util.invalidateTags([{ type: 'Messages', id: cid }]));
      if (cid === activeConversationIdRef.current) {
        toast.info('Nhóm đã được giải tán');
        dispatch(setActiveConversation(null));
        void navigate('/chat', { replace: true });
      }
    };

    const handleGroupUpdated = (data: any) => {
      console.log('📢 Received group:updated:', data);
      if (!data?.conversationId) return;
      
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          const conv = draft?.data?.find((item) => item.conversationId === data.conversationId);
          if (conv) {
            console.log('✅ Patching conversation in sidebar:', data.name);
            if (data.name) conv.name = data.name;
            if (data.avatar) conv.avatar = data.avatar;
          }
        })
      );

      // Thông báo cho người dùng bằng Toast
      if (data.conversationId !== activeConversationIdRef.current) {
        toast.info(`Nhóm '${data.name}' vừa cập nhật thông tin`);
      }

      if (data.conversationId === activeConversationIdRef.current) {
        console.log('🔄 Refreshing current active group details');
        void fetchGroupMembers(data.conversationId);
      }
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('group:disbanded', handleGroupDisbanded);
    socketService.on('group:updated', handleGroupUpdated);
    socketService.on('message:edited', handleEditedMessage);
    socketService.on('message:recalled', handleRecalledMessage);
    socketService.on('message:hidden_for_me', handleHiddenForMe);
    socketService.on('message:pin_updated', handlePinUpdated);
    socketService.on('message:reaction', handleReactionEvent);
    socketService.on('message:typing', handleTypingEvent);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('group:disbanded', handleGroupDisbanded);
      socketService.off('group:updated', handleGroupUpdated);
      socketService.off('message:edited', handleEditedMessage);
      socketService.off('message:recalled', handleRecalledMessage);
      socketService.off('message:hidden_for_me', handleHiddenForMe);
      socketService.off('message:pin_updated', handlePinUpdated);
      socketService.off('message:reaction', handleReactionEvent);
      socketService.off('message:typing', handleTypingEvent);
    };
  }, [dispatch, patchMessageInCache, fetchGroupMembers, isConnected, navigate]);

  useEffect(() => {
    dispatch(setActiveConversation(routeConversationId ?? null));
  }, [routeConversationId, dispatch]);

  useEffect(() => {
    if (!routeConversationId) return;
    if (convsLoading || convsFetching) return;
    const exists = conversations.some((c) => c.conversationId === routeConversationId);
    if (!exists) {
      navigate('/chat', { replace: true });
    }
  }, [routeConversationId, convsLoading, convsFetching, conversations, navigate]);

  useEffect(() => {
    setMessageConfirm(null);
    setJumpHighlightMessageId(null);
    if (jumpHighlightClearRef.current) {
      clearTimeout(jumpHighlightClearRef.current);
      jumpHighlightClearRef.current = null;
    }
  }, [activeConversationId]);

  // ── Small helpers ────────────────────────────────────────────────────
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      void navigate(`/chat/${conversationId}`);
    },
    [navigate],
  );

  const handleSendMessage = useCallback(
    async (overrideText?: string) => {
      const rawContent = typeof overrideText === 'string' ? overrideText : inputText;
      const content = rawContent.trim();

      if (!activeConversationId || isSending || mediaUploading) return;

      if (pendingAttachments.length > 0) {
        const files = pendingAttachments.map((p) => p.file);
        setMediaUploading(true);
        try {
          const up = await uploadMediaMulti(files).unwrap();
          const results = up.data;
          const captionFirst = content.length > 0 ? content : ' ';
          for (let i = 0; i < results.length; i++) {
            const r = results[i]!;
            await sendMessage({
              conversationId: activeConversationId,
              type: messageTypeFromUploadResult(r),
              content: i === 0 ? captionFirst : ' ',
              mediaId: r.mediaId,
              replyTo: i === 0 ? replyingTo?.messageId : undefined,
            }).unwrap();
          }
          pendingAttachments.forEach((p) => {
            if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          });
          setPendingAttachments([]);
          setInputText('');
          dispatch(clearReplyingTo());
        } catch {
          /* giữ queue + text */
        } finally {
          setMediaUploading(false);
        }
        return;
      }

      if (!content) return;
      setInputText('');
      try {
        await sendMessage({
          conversationId: activeConversationId,
          type: 'text',
          content,
          replyTo: replyingTo?.messageId,
        }).unwrap();
        dispatch(clearReplyingTo());
      } catch {
        setInputText(content);
      }
    },
    [
      inputText,
      activeConversationId,
      isSending,
      mediaUploading,
      pendingAttachments,
      uploadMediaMulti,
      sendMessage,
      replyingTo,
      dispatch,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleTyping = () => {
    if (!activeConversationId) return;
    if (!typingTimerRef.current) {
      socketService.emit('message:typing', activeConversationId);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
    }, 900);
  };

  const handleJumpToLatest = useCallback(() => {
    setUnreadIncomingCount(0);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessage || !editDraft.trim()) return;
    if (editingMessage.type !== 'text') return;
    try {
      await editMessage({
        messageId: editingMessage.messageId,
        content: editDraft.trim(),
        conversationId: editingMessage.conversationId,
        createdAt: editingMessage.createdAt,
      }).unwrap();
      dispatch(
        messageEdited({
          messageId: editingMessage.messageId,
          conversationId: editingMessage.conversationId,
          content: editDraft.trim(),
        }),
      );
      patchMessageInCache(editingMessage.conversationId, editingMessage.messageId, {
        content: editDraft.trim(),
        isEdited: true,
      });
      setEditingMessage(null);
    } catch {
      /* giữ modal */
    }
  }, [editingMessage, editDraft, editMessage, dispatch, patchMessageInCache]);

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
    setActionMenuMsgId(null);
    setMessageConfirm({ kind: 'recall', msg });
  }, []);

  const handleDeleteMsg = useCallback((msg: IMessage) => {
    setActionMenuMsgId(null);
    setMessageConfirm({ kind: 'delete', msg });
  }, []);

  const handleMessageConfirm = useCallback(async () => {
    if (!messageConfirm) return;
    const { kind, msg } = messageConfirm;
    setMessageConfirmSubmitting(true);
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
      setMessageConfirm(null);
      setActionMenuMsgId(null);
    } catch {
      /* ignore */
    } finally {
      setMessageConfirmSubmitting(false);
    }
  }, [messageConfirm, recallMessage, deleteMessage, dispatch, patchMessageInCache]);

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
            setActionMenuMsgId(null);
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
              setActionMenuMsgId(null);
              return;
            }
            toast.error(`Đã đủ ${MAX_PINNED_PER_CONVERSATION} tin ghim trong cuộc trò chuyện này.`);
            setActionMenuMsgId(null);
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
            setActionMenuMsgId(null);
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
        setActionMenuMsgId(null);
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
      setActionMenuMsgId(null);
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

  const jumpHighlightClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [jumpHighlightMessageId, setJumpHighlightMessageId] = useState<string | null>(null);
  const [jumpFlashNonce, setJumpFlashNonce] = useState(0);

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
    setShowInfo(true);
    setConversationSearchRequestTick((t) => t + 1);
  }, []);

  const handleToggleGroupMember = useCallback((conversationId: string, checked: boolean) => {
    setSelectedGroupMembers((prev) =>
      checked ? [...prev, conversationId] : prev.filter((id) => id !== conversationId),
    );
  }, []);

  const handleConfirmCreateGroup = useCallback(async () => {
    if (selectedGroupMembers.length < 2) return;
    try {
      const result = await createConversation({
        type: 'group',
        name: groupName || `Nhóm (${selectedGroupMembers.length + 1} thành viên)`,
        memberIds: selectedGroupMembers,
      }).unwrap();
      const conversationId = result.data.conversationId;
      // Log trạng thái socket và thời điểm join room
      // eslint-disable-next-line no-console
      console.log('[DEBUG] isConnected:', socketService.socket?.connected, 'conversationId:', conversationId, 'at', new Date().toISOString());
      socketService.emit('conversation:join', conversationId);
      // eslint-disable-next-line no-console
      console.log('[DEBUG] Đã emit conversation:join', conversationId, 'at', new Date().toISOString());
      void navigate(`/chat/${conversationId}`);
      dispatch(chatApi.endpoints.getMessages.initiate({ conversationId }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[DEBUG] Tạo nhóm lỗi:', err);
    }
    setShowCreateGroupModal(false);
    setSelectedGroupMembers([]);
    setGroupName('');
  }, [selectedGroupMembers, groupName, createConversation, navigate, dispatch]);

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
        setShowContactsManagement(false);
        void navigate(`/chat/${existingConversation.conversationId}`);
      } catch (error) {
        console.error('❌ Failed to open conversation with friend:', error);
        // Log the full error object to see what went wrong
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
    },
    [conversations, createConversation, navigate],
  );

  const closeTaskModal = useCallback(() => {
    setShowTaskModal(false);
    setTaskTitle('');
    setTaskDeadline('');
    setTaskNote('');
    setTaskAssignees([]);
    setTaskAssignToAll(false);
  }, []);

  useEffect(() => {
    return () => {
      if (editGroupAvatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(editGroupAvatarPreview);
      }
    };
  }, [editGroupAvatarPreview]);

  const openEditGroupModal = useCallback(() => {
    if (activeConversation?.type !== 'group') return;
    if (editGroupAvatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(editGroupAvatarPreview);
    }
    setEditGroupName(activeConversation.name ?? '');
    setEditGroupAvatarFile(null);
    setEditGroupAvatarPreview(activeConversation.avatar ?? null);
    setShowEditGroupModal(true);
  }, [activeConversation, editGroupAvatarPreview]);

  const handleEditGroupAvatarFileChange = useCallback(
    (file: File | null) => {
      setEditGroupAvatarFile(file);
      if (editGroupAvatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(editGroupAvatarPreview);
      }
      if (file) {
        setEditGroupAvatarPreview(URL.createObjectURL(file));
        return;
      }
      setEditGroupAvatarPreview(activeConversation?.avatar ?? null);
    },
    [activeConversation?.avatar, editGroupAvatarPreview],
  );

  const handleUpdateGroup = useCallback(async () => {
    if (!activeConversationId || activeConversation?.type !== 'group') return;
    
    const nextName = editGroupName.trim();
    if (!nextName) {
      toast.error('Tên nhóm không được để trống');
      return;
    }

    setActionBusy('updateGroup', true);
    const previousName = activeConversation.name;
    const previousAvatar = activeConversation.avatar;
    let nextAvatar = previousAvatar;

    if (editGroupAvatarFile) {
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
          file: editGroupAvatarFile, 
          mediaType: 'image' 
        }).unwrap();
        nextAvatar = uploadResult.data?.url ?? uploadResult.data?.fileUrl ?? previousAvatar;
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
      setShowEditGroupModal(false);
      setEditGroupAvatarFile(null);
      toast.success('Cập nhật nhóm thành công');

      // System message: group name changed (centered)
      const now = new Date();
      const userName = currentUser?.displayName || currentUser?.name || 'Bạn';
      let content = '';
      if (previousName && previousName !== nextName) {
        content = `Tên nhóm đã đổi từ '${previousName}' thành '${nextName}'`;
      } else {
        content = `${userName} đã đổi tên nhóm thành '${nextName}'`;
      }
      const systemMsg = {
        messageId: `system-${Date.now()}`,
        conversationId: activeConversationId,
        senderId: 'system',
        senderDisplayName: 'Hệ thống',
        type: 'system',
        subtype: 'group_name_changed',
        position: 'center',
        content,
        mediaUrl: null,
        mediaType: null,
        mediaSize: null,
        thumbnailUrl: null,
        replyTo: null,
        replyToDetails: null,
        isPinned: false,
        isEdited: false,
        isRecalled: false,
        isDeleted: false,
        reactions: {},
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
    editGroupName,
    editGroupAvatarFile,
    dispatch,
    setActionBusy,
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
        setSelectedAddMembers([]);
        setShowAddMembersModal(false);
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
    [activeConversationId, fetchGroupRequests, setActionBusy],
  );

  const handleSubmitTask = useCallback(async () => {
    if (!activeConversationId || !taskTitle.trim()) return;
    setActionBusy('createTask', true);
    const optimisticTask: GroupTask = {
      taskId: `tmp-${Date.now()}`,
      title: taskTitle.trim(),
      description: taskNote.trim(),
      assignees: taskAssignees,
      status: 'todo',
      dueDate: taskDeadline || undefined,
      createdAt: new Date().toISOString(),
      creatorId: currentUserId,
      creatorDisplayName: currentUser?.displayName?.trim() ?? null,
    };
    setGroupTasks((prev) => [optimisticTask, ...prev]);
    try {
      await apiClient.post(`/chat/groups/${activeConversationId}/tasks`, {
        title: taskTitle.trim(),
        description: taskNote.trim(),
        assignees: taskAssignees,
        assignToAll: taskAssignToAll,
        dueDate: taskDeadline || undefined,
      });
      toast.success('Đã tạo công việc');
      await fetchGroupTasks(activeConversationId);
      closeTaskModal();
    } catch (err) {
      setGroupTasks((prev) => prev.filter((task) => task.taskId !== optimisticTask.taskId));
      toast.error('Không thể tạo công việc');
      console.error('Failed to create task:', err);
    } finally {
      setActionBusy('createTask', false);
    }
  }, [
    activeConversationId,
    taskTitle,
    taskNote,
    taskAssignees,
    taskAssignToAll,
    taskDeadline,
    closeTaskModal,
    fetchGroupTasks,
    setActionBusy,
    currentUserId,
    currentUser?.displayName,
  ]);

  const openAISummaryFromPanel = useCallback(async () => {
    setShowAISummaryModal(true);
    if (latestRecap) {
      setAiSummaryResult(latestRecap.content);
      return;
    }
    setAiSummaryResult('');
    setAiSummaryLoading(true);
    try {
      if (!activeConversationId) return;
      const result = await apiClient.post<ApiSuccessResponse<AIRecap>>(
        `/chat/groups/${activeConversationId}/ai-recap`,
      );
      setLatestRecap(result.data.data);
      setAiSummaryResult(result.data.data?.content ?? '');
    } catch {
      setAiSummaryResult('Không thể tạo tóm tắt vào lúc này.');
    } finally {
      setAiSummaryLoading(false);
    }
  }, [activeConversationId, latestRecap]);

  const handleRerunAISummary = useCallback(async () => {
    if (!activeConversationId) return;
    setAiSummaryResult('');
    setAiSummaryLoading(true);
    try {
      const result = await apiClient.post<ApiSuccessResponse<AIRecap>>(
        `/chat/groups/${activeConversationId}/ai-recap`,
      );
      setLatestRecap(result.data.data);
      setAiSummaryResult(result.data.data?.content ?? '');
      toast.success('Đã tạo AI recap');
    } catch {
      setAiSummaryResult('Không thể làm mới tóm tắt.');
      toast.error('Không thể tạo AI recap');
    } finally {
      setAiSummaryLoading(false);
    }
  }, [activeConversationId]);

  const handleCreatePoll = useCallback(async () => {
    if (!activeConversationId || !pollQuestion.trim()) return;
    setActionBusy('createPoll', true);
    const optimisticPoll: GroupPoll = {
      pollId: `tmp-${Date.now()}`,
      question: pollQuestion.trim(),
      options: pollOptions.filter((o) => o.trim()).map((text) => ({ text, voters: [] })),
      createdAt: new Date().toISOString(),
      isClosed: false,
      isMultipleChoice: pollMultipleChoice,
      creatorId: currentUserId,
      creatorDisplayName: currentUser?.displayName?.trim() ?? null,
    };
    setGroupPolls((prev) => [optimisticPoll, ...prev]);
    try {
      await apiClient.post(`/chat/groups/${activeConversationId}/polls`, {
        question: pollQuestion.trim(),
        options: pollOptions.filter((o) => !!o.trim()),
        isMultipleChoice: pollMultipleChoice,
      });
      toast.success('Tạo bình chọn thành công');
      await fetchGroupPolls(activeConversationId);
      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollMultipleChoice(false);
    } catch (err) {
      setGroupPolls((prev) => prev.filter((poll) => poll.pollId !== optimisticPoll.pollId));
      toast.error('Không thể tạo bình chọn');
      console.error('Failed to create poll:', err);
    } finally {
      setActionBusy('createPoll', false);
    }
  }, [
    activeConversationId,
    pollQuestion,
    pollOptions,
    pollMultipleChoice,
    fetchGroupPolls,
    setActionBusy,
    currentUserId,
    currentUser?.displayName,
  ]);

  const openCreateGroupModal = useCallback(() => {
    setShowCreateGroupModal(true);
    setSelectedGroupMembers([]);
    setGroupName('');
  }, []);

  const openAddMembersModal = useCallback(() => {
    setSelectedAddMembers([]);
    // Đảm bảo đã có danh sách member trước khi lọc bạn bè (tránh hiện cả người đã trong nhóm).
    if (activeConversationId) {
      void fetchGroupMembers(activeConversationId);
    }
    setShowAddMembersModal(true);
  }, [activeConversationId, fetchGroupMembers]);

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
    setSelectedAddMembers((prev) =>
      checked ? [...prev, userId] : prev.filter((id) => id !== userId),
    );
  }, []);

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

  const handleAddFriendSubmit = useCallback(() => {
    // Modal now handles all friend request logic internally
    setShowAddFriendModal(false);
    setAddFriendQuery('');
  }, []);

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

  const handleChangeMemberRole = useCallback(async (userId: string, role: GroupMemberRole) => {
    if (!activeConversationId) return;
    
    if (currentUserRole !== 'owner') {
      toast.error('Chỉ Trưởng nhóm mới có quyền phân quyền thành viên');
      return;
    }

    setActionBusy('changeRole', true);
    const before = groupMembers;
    setGroupMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } : m)));
    try {
      await apiClient.put(`/chat/groups/${activeConversationId}/members/${userId}/role`, { role });
      toast.success('Đã cập nhật vai trò');
    } catch (error) {
      setGroupMembers(before);
      toast.error('Không thể cập nhật vai trò');
      console.error('Failed to change member role:', error);
    } finally {
      setActionBusy('changeRole', false);
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
    setActivePollId(pollId);
    setShowPollVoteModal(true);
  }, []);

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

  const currentUserRole = groupMembers.find((m) => m.userId === currentUserId)?.role;

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
        activeConversationId={activeConversationId}
        currentUserId={currentUserId}
        activeMessages={allMessages}
        showContactsManagement={showContactsManagement}
        contactsTab={contactsTab}
        onContactsTabChange={setContactsTab}
        onSelectConversation={handleSelectConversation}
        onPickSearchMessage={scrollToMessageBubble}
        onOpenCreateGroup={openCreateGroupModal}
        onOpenMarkRead={() => setShowMarkReadModal(true)}
        onOpenAddFriend={() => setShowAddFriendModal(true)}
        onToggleConversationMute={handleToggleConversationMute}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        {showContactsManagement ? (
          <FriendsListView onFriendClick={handleFriendClick} />
        ) : (
          <>
            <ChatHeader
              activeConversation={activeConversation}
              typingUsers={typingUsers}
              showInfo={showInfo}
              onToggleShowInfo={() => setShowInfo(!showInfo)}
              onAddMember={openAddMembersModal}
              onEditGroup={openEditGroupModal}
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
              typingUsers={typingUsers}
              unreadIncomingCount={unreadIncomingCount}
              jumpHighlightMessageId={jumpHighlightMessageId}
              jumpFlashNonce={jumpFlashNonce}
              onJumpToMessage={scrollToMessageBubble}
              actionMenuMsgId={actionMenuMsgId}
              onActionMenuMsgIdChange={setActionMenuMsgId}
              onStartEdit={(msg) => {
                if (msg.type !== 'text') return;
                setEditingMessage(msg);
                setEditDraft(msg.content);
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
              inputText={inputText}
              onInputTextChange={setInputText}
              onKeyDown={handleKeyDown}
              onTyping={handleTyping}
              onSend={handleSendMessage}
              isSending={isSending}
              isUploadingMedia={mediaUploading}
              replyingTo={replyingTo}
              onClearReply={() => dispatch(clearReplyingTo())}
              onOpenPoll={() => setShowPollModal(true)}
              onOpenTask={() => setShowTaskModal(true)}
              pendingAttachments={pendingAttachments}
              onAddPendingFiles={addPendingFiles}
              onRemovePendingAttachment={removePendingAttachment}
            />
          </>
        )}
      </div>

      {showInfo && !showContactsManagement && (
        <ConversationInfoPanel
          numRequests={groupRequests.length}
          activeConversation={activeConversation}
          onOpenAISummaryFromPanel={openAISummaryFromPanel}
          onEditGroup={openEditGroupModal}
          onAddMembers={openAddMembersModal}
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
            activeConversation?.type === 'group' ? () => setShowPollModal(true) : undefined
          }
          onOpenTaskModalFromPanel={
            activeConversation?.type === 'group' ? () => setShowTaskModal(true) : undefined
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
        open={showPollVoteModal}
        onClose={() => setShowPollVoteModal(false)}
        poll={activePollId ? (groupPolls.find((p) => p.pollId === activePollId) as any) : null}
        currentUserId={currentUserId}
        onToggleVote={(pollId, optionIndex) => void handleVotePoll(pollId, optionIndex)}
      />

      <MarkReadModal open={showMarkReadModal} onClose={() => setShowMarkReadModal(false)} />
      <AddFriendModal
        open={showAddFriendModal}
        query={addFriendQuery}
        onQueryChange={setAddFriendQuery}
        onClose={() => {
          setShowAddFriendModal(false);
          setAddFriendQuery('');
        }}
        onSubmit={handleAddFriendSubmit}
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
        open={messageConfirm !== null}
        title={
          messageConfirm?.kind === 'delete'
            ? 'Xóa tin nhắn'
            : messageConfirm?.kind === 'recall'
              ? 'Thu hồi tin nhắn'
              : ''
        }
        description={
          messageConfirm?.kind === 'delete'
            ? 'Chỉ xóa trên thiết bị của bạn; người khác trong cuộc trò chuyện vẫn thấy tin nhắn.'
            : messageConfirm?.kind === 'recall'
              ? 'Thu hồi cho mọi người — không ai còn xem được nội dung tin này.'
              : undefined
        }
        confirmLabel={messageConfirm?.kind === 'delete' ? 'Xóa' : 'Thu hồi'}
        variant={messageConfirm?.kind === 'delete' ? 'danger' : 'primary'}
        isConfirming={messageConfirmSubmitting}
        onClose={() => {
          if (!messageConfirmSubmitting) setMessageConfirm(null);
        }}
        onConfirm={() => void handleMessageConfirm()}
      />
      <ProfileModal open={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <CreateGroupModal
        open={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        conversations={conversations}
        groupName={groupName}
        onGroupNameChange={setGroupName}
        selectedGroupMembers={selectedGroupMembers}
        onToggleMember={handleToggleGroupMember}
        onConfirmCreate={handleConfirmCreateGroup}
      />
      <PollModal
        open={showPollModal}
        onClose={() => setShowPollModal(false)}
        pollQuestion={pollQuestion}
        onPollQuestionChange={setPollQuestion}
        pollOptions={pollOptions}
        onPollOptionsChange={setPollOptions}
        multipleChoice={pollMultipleChoice}
        onMultipleChoiceChange={setPollMultipleChoice}
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
          onChangeRole={async (userId, role) => {
            await handleChangeMemberRole(userId, role);
          }}
          busy={{
            approving: groupActionLoading.approveRequest,
            rejecting: groupActionLoading.rejectRequest,
            removing: groupActionLoading.removeMember,
            changingRole: groupActionLoading.changeRole,
          }}
        />
      )}
      <AISummaryModal
        open={showAISummaryModal}
        onClose={() => setShowAISummaryModal(false)}
        conversationName={activeConversation?.name}
        aiSummaryLoading={aiSummaryLoading}
        aiSummaryResult={aiSummaryResult}
        onRerunSummary={handleRerunAISummary}
      />
      <TaskModal
        open={showTaskModal}
        onClose={closeTaskModal}
        currentUserId={currentUserId}
        assignToAll={taskAssignToAll}
        onAssignToAllChange={(v) => {
          setTaskAssignToAll(v);
          if (v) setTaskAssignees([]);
        }}
        members={groupMembers.map((m) => ({
          id: m.userId,
          name: m.name ?? m.userId,
          avatar:
            m.userId === currentUserId ? m.avatar ?? currentUser?.avatar ?? undefined : m.avatar ?? undefined,
          role: m.role,
        }))}
        taskTitle={taskTitle}
        onTaskTitleChange={setTaskTitle}
        taskDeadline={taskDeadline}
        onTaskDeadlineChange={setTaskDeadline}
        taskNote={taskNote}
        onTaskNoteChange={setTaskNote}
        taskAssignees={taskAssignees}
        onTaskAssigneesChange={setTaskAssignees}
        onSubmitTask={handleSubmitTask}
      />

      <AddMembersModal
        open={showAddMembersModal}
        onClose={() => setShowAddMembersModal(false)}
        selectedIds={selectedAddMembers}
        existingMemberIds={groupMembers.map((member) => member.userId)}
        onToggleSelect={handleToggleAddMember}
        onConfirm={() => void handleAddMembers(selectedAddMembers)}
        isSubmitting={groupActionLoading.addMembers}
      />

      <EditGroupModal
        open={showEditGroupModal}
        groupName={editGroupName}
        avatarPreview={editGroupAvatarPreview}
        isSaving={groupActionLoading.updateGroup}
        onClose={() => {
          setShowEditGroupModal(false);
          setEditGroupAvatarFile(null);
        }}
        onGroupNameChange={setEditGroupName}
        onAvatarFileChange={handleEditGroupAvatarFileChange}
        onSubmit={() => void handleUpdateGroup()}
      />

      <EditMessageDialog
        editingMessage={editingMessage}
        editDraft={editDraft}
        onEditDraftChange={setEditDraft}
        onClose={() => setEditingMessage(null)}
        onSave={handleSaveEdit}
        isEditing={isEditing}
      />
    </div>
  );
}
