import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { BarChart2, CheckCircle2, ClipboardList, X } from 'lucide-react';
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
import { useTaskReminderScheduler } from '@/pages/user/chat-page/hooks/useTaskReminderScheduler';
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
import {
  setActiveConversation,
  messageReceived,
  messageEdited,
  messageRecalled,
  messagePinUpdated,
  setReplyingTo,
} from '@/store/slices/chatSlice';
import {
  applyMessageHiddenForMe,
  hideTaskAssignedCardsForTaskId,
  patchTaskAssignedSystemMessages,
} from '@/store/applyMessageHiddenForMe';
import { socketService } from '@/services/socket';
import type { AppDispatch, RootState } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import { decodeJwtUserId } from '@/utils/chatUtils';
import {
  canUserPinMessageInGroup,
  canUserCreateTaskInGroup,
} from '@/utils/groupConversationPermissions';
import type { TypingUserEntry } from '@/types/chat.types';
import { FriendsListView } from '@/components/chat/FriendsListView';
import { AddFriendModal } from '@/components/chat/AddFriendModal';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { PinnedMessagesBar } from '@/components/chat/PinnedMessagesBar';
import { ConversationInfoPanel } from '@/components/chat/ConversationInfoPanel';
import {
  nextLocalEightAmIsoString,
  type MuteNotificationsApplyPayload,
} from '@/components/chat/MuteNotificationsModal';
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
  assignToAll?: boolean;
  broadcast?: boolean;
  subtasks?: Array<{
    id: string;
    assigneeId: string;
    assigneeName: string;
    content: string;
    done: boolean;
    completedAt: string | null;
  }>;
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

function isoToDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Giá trị lưu trong JSON thẻ giao việc (ISO) từ input datetime-local. */
function deadlineLocalInputToJsonValue(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const EMPTY_ARRAY: any[] = [];
const EMPTY_TYPING_USERS: readonly TypingUserEntry[] = [];

export default function ChatPage() {
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const dispatch = useDispatch<AppDispatch>();

  // ── Responsive breakpoint ─────────────────────────────────────────────
  const isTabletOrDesktop = useBreakpoint('md');
  const isDesktop = useBreakpoint('lg');

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
  const [chatFrameNotice, setChatFrameNotice] = useState<{
    text: string;
    atIso: string;
    variant?: 'poll' | 'task_assigned' | 'task_joined';
    onClick?: () => void;
  } | null>(null);
  const chatFrameNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatFrameNoticeDedupeRef = useRef<Map<string, number>>(new Map());

  const showChatFrameNotice = useCallback(
    (
      text: string,
      opts?: {
        atIso?: string;
        onClick?: () => void;
        ttlMs?: number;
        variant?: 'poll' | 'task_assigned' | 'task_joined';
      },
    ) => {
      const atIso = opts?.atIso ?? new Date().toISOString();
      setChatFrameNotice({ text, atIso, onClick: opts?.onClick, variant: opts?.variant });
      if (chatFrameNoticeTimerRef.current) clearTimeout(chatFrameNoticeTimerRef.current);
      chatFrameNoticeTimerRef.current = setTimeout(() => setChatFrameNotice(null), opts?.ttlMs ?? 7000);
    },
    [],
  );

  const dedupedNotice = useCallback(
    (
      key: string,
      text: string,
      opts?: {
        atIso?: string;
        onClick?: () => void;
        ttlMs?: number;
        variant?: 'poll' | 'task_assigned' | 'task_joined';
        dedupeMs?: number;
      },
    ) => {
      const now = Date.now();
      const dedupeMs = opts?.dedupeMs ?? 2500;
      const last = chatFrameNoticeDedupeRef.current.get(key) ?? 0;
      if (now - last < dedupeMs) return;
      chatFrameNoticeDedupeRef.current.set(key, now);
      // prune old keys occasionally
      if (chatFrameNoticeDedupeRef.current.size > 200) {
        for (const [k, ts] of chatFrameNoticeDedupeRef.current.entries()) {
          if (now - ts > 60_000) chatFrameNoticeDedupeRef.current.delete(k);
        }
      }
      showChatFrameNotice(text, opts);
    },
    [showChatFrameNotice],
  );

  useEffect(() => {
    return () => {
      if (chatFrameNoticeTimerRef.current) clearTimeout(chatFrameNoticeTimerRef.current);
    };
  }, []);

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
        const obj = JSON.parse(raw) as {
          kind?: string;
          poll?: { pollId?: string; question?: string };
          task?: { taskId?: string; title?: string };
          actor?: { name?: string };
          createdAt?: string;
        };
        const kind = String(obj?.kind ?? '');
        const atIso = String(obj?.createdAt ?? msg.createdAt ?? new Date().toISOString());

        if (kind === 'poll_created' && obj.poll?.pollId) {
          const pollId = String(obj.poll.pollId);
          const question = String(obj.poll?.question ?? '').trim();
          showChatFrameNotice(question ? `Có bình chọn mới: ${question}` : 'Có bình chọn mới', {
            atIso,
            variant: 'poll',
            onClick: () => {
              modalActions.setActivePollId(pollId);
              modalActions.setShowPollVoteModal(true);
            },
          });
          return;
        }

        if (kind === 'task_assigned') {
          void fetchGroupTasks(msg.conversationId);
          return;
        }

        if (kind === 'task_joined') {
          void fetchGroupTasks(msg.conversationId);
          return;
        }

        if (kind === 'task_updated' || kind === 'task_deleted') {
          void fetchGroupTasks(msg.conversationId);
          return;
        }
      } catch {
        /* ignore */
      }
    };
    socketService.on('message:new', onPollSystemMessage);
    return () => {
      socketService.off('message:new', onPollSystemMessage);
    };
  }, [isConnected, modalActions, showChatFrameNotice, fetchGroupTasks]);

  // Group realtime notifications: show banner for any group:* changes (members/roles/settings/requests/polls/tasks)
  useEffect(() => {
    if (!isConnected) return;

    const isActive = (payload: any): boolean => {
      const cid = String(payload?.conversationId ?? payload?.groupId ?? '').trim();
      return Boolean(cid && cid === String(activeConversationIdRef.current ?? ''));
    };

    const onGroupUpdated = (data: any) => {
      if (!isActive(data)) return;
      const name = String(data?.name ?? '').trim();
      dedupedNotice(
        `group:updated:${String(activeConversationIdRef.current)}`,
        name ? `Nhóm đã cập nhật: ${name}` : 'Nhóm đã cập nhật thông tin',
        { variant: 'task_assigned' },
      );
      void fetchGroupMembers(String(activeConversationIdRef.current));
    };

    const onSettingsUpdated = (data: any) => {
      if (!isActive(data)) return;
      dedupedNotice(`group:settings:${String(activeConversationIdRef.current)}`, 'Cài đặt nhóm đã thay đổi', {
        variant: 'task_assigned',
      });
    };

    const onRoleChanged = (data: any) => {
      if (!isActive(data)) return;
      dedupedNotice(`group:role:${String(data?.userId ?? '')}`, 'Vai trò thành viên đã thay đổi', {
        variant: 'task_assigned',
      });
      void fetchGroupMembers(String(activeConversationIdRef.current));
    };

    const onMemberJoined = (data: any) => {
      if (!isActive(data)) return;
      dedupedNotice(`group:member_joined:${String(data?.userId ?? '')}`, 'Có thành viên mới tham gia nhóm', {
        variant: 'task_assigned',
      });
      void fetchGroupMembers(String(activeConversationIdRef.current));
    };

    const onMemberLeft = (data: any) => {
      if (!isActive(data)) return;
      dedupedNotice(`group:member_left:${String(data?.userId ?? '')}`, 'Một thành viên vừa rời nhóm', {
        variant: 'task_assigned',
      });
      void fetchGroupMembers(String(activeConversationIdRef.current));
    };

    const onMemberRemoved = (data: any) => {
      if (!isActive(data)) return;
      dedupedNotice(`group:member_removed:${String(data?.userId ?? '')}`, 'Một thành viên đã bị xóa khỏi nhóm', {
        variant: 'task_assigned',
      });
      void fetchGroupMembers(String(activeConversationIdRef.current));
    };

    const onJoinRequestNew = (data: any) => {
      if (!isActive(data)) return;
      dedupedNotice(`group:join_req_new:${String(activeConversationIdRef.current)}`, 'Có yêu cầu tham gia nhóm mới', {
        variant: 'task_assigned',
      });
      void fetchGroupRequests(String(activeConversationIdRef.current));
    };

    const onJoinRequestUpdated = (data: any) => {
      if (!isActive(data)) return;
      dedupedNotice(
        `group:join_req_upd:${String(activeConversationIdRef.current)}`,
        'Danh sách yêu cầu tham gia đã cập nhật',
        { variant: 'task_assigned' },
      );
      void fetchGroupRequests(String(activeConversationIdRef.current));
    };

    const onPollNew = (data: any) => {
      if (!isActive(data)) return;
      dedupedNotice(`group:poll_new:${String(activeConversationIdRef.current)}`, 'Có bình chọn mới trong nhóm', {
        variant: 'poll',
      });
      void fetchGroupPolls(String(activeConversationIdRef.current));
    };

    const onPollUpdated = (data: any) => {
      if (!isActive(data)) return;
      dedupedNotice(`group:poll_upd:${String(data?.pollId ?? '')}`, 'Bình chọn vừa được cập nhật', {
        variant: 'poll',
      });
      void fetchGroupPolls(String(activeConversationIdRef.current));
    };

    const onTaskNew = (data: any) => {
      if (!isActive(data)) return;
      void fetchGroupTasks(String(activeConversationIdRef.current));
    };

    const onTaskUpdated = (data: any) => {
      if (!isActive(data)) return;
      void fetchGroupTasks(String(activeConversationIdRef.current));
    };

    const onTaskDeleted = (data: any) => {
      if (!isActive(data)) return;
      void fetchGroupTasks(String(activeConversationIdRef.current));
    };

    const onGroupDisbanded = (data: any) => {
      if (!isActive(data)) return;
      dedupedNotice(`group:disbanded:${String(activeConversationIdRef.current)}`, 'Nhóm đã bị giải tán', {
        variant: 'task_assigned',
        dedupeMs: 10_000,
      });
    };

    const onGroupDeleted = (data: any) => {
      if (!isActive(data)) return;
      dedupedNotice(`group:deleted:${String(activeConversationIdRef.current)}`, 'Nhóm đã bị xóa', {
        variant: 'task_assigned',
        dedupeMs: 10_000,
      });
    };

    socketService.on('group:updated', onGroupUpdated);
    socketService.on('group:settings_updated', onSettingsUpdated);
    socketService.on('group:role_changed', onRoleChanged);
    socketService.on('group:member_joined', onMemberJoined);
    socketService.on('group:member_left', onMemberLeft);
    socketService.on('group:member_removed', onMemberRemoved);
    socketService.on('group:join_request_new', onJoinRequestNew);
    socketService.on('group:join_request_updated', onJoinRequestUpdated);
    socketService.on('group:poll_new', onPollNew);
    socketService.on('group:poll_updated', onPollUpdated);
    socketService.on('group:task_new', onTaskNew);
    socketService.on('group:task_updated', onTaskUpdated);
    socketService.on('group:task_deleted', onTaskDeleted);
    socketService.on('group:disbanded', onGroupDisbanded);
    socketService.on('group:deleted', onGroupDeleted);

    return () => {
      socketService.off('group:updated', onGroupUpdated);
      socketService.off('group:settings_updated', onSettingsUpdated);
      socketService.off('group:role_changed', onRoleChanged);
      socketService.off('group:member_joined', onMemberJoined);
      socketService.off('group:member_left', onMemberLeft);
      socketService.off('group:member_removed', onMemberRemoved);
      socketService.off('group:join_request_new', onJoinRequestNew);
      socketService.off('group:join_request_updated', onJoinRequestUpdated);
      socketService.off('group:poll_new', onPollNew);
      socketService.off('group:poll_updated', onPollUpdated);
      socketService.off('group:task_new', onTaskNew);
      socketService.off('group:task_updated', onTaskUpdated);
      socketService.off('group:task_deleted', onTaskDeleted);
      socketService.off('group:disbanded', onGroupDisbanded);
      socketService.off('group:deleted', onGroupDeleted);
    };
  }, [
    isConnected,
    dedupedNotice,
    fetchGroupMembers,
    fetchGroupRequests,
    fetchGroupPolls,
    fetchGroupTasks,
  ]);

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
        const myRole = groupMembers.find((m) => m.userId === currentUserId)?.role;
        if (
          activeConversation?.type === 'group' &&
          !canUserPinMessageInGroup({ conversation: activeConversation, userRole: myRole })
        ) {
          toast.error(
            msg.isPinned
              ? 'Nhóm không cho phép thành viên bỏ/ghim tin nhắn.'
              : 'Nhóm không cho phép thành viên ghim tin nhắn.',
          );
          modalActions.setActionMenuMsgId(null);
          return;
        }
        if (msg.isPinned) {
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
      socketService.emit('conversation:join', conversationId);
      void navigate(`/chat/${conversationId}`);
      dispatch(chatApi.endpoints.getMessages.initiate({ conversationId }));
    } catch (err) {
      console.error('[DEBUG] Tạo nhóm lỗi:', err);
    }
    modalActions.setShowCreateGroupModal(false);
    modalActions.setSelectedGroupMembers([]);
    modalActions.setGroupName('');
  }, [modalState.selectedGroupMembers, modalState.groupName, createConversation, navigate, dispatch, modalActions]);

  // ── Friend click (for contacts management) ──────────────────────────
  const handleFriendClick = useCallback(
    async (friendId: string, friendName: string) => {
      try {
        const existingConversation = conversations.find(
          (c) => c.type === 'direct' && (c.otherUserId === friendId || c.name === friendName),
        );
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

  // Subtasks editor (inside TaskModal) — local UI state.
  const [taskSubtaskRows, setTaskSubtaskRows] = useState<Array<{ assigneeId: string; content: string }>>([]);


  const handleSubmitTask = useCallback(async () => {
    if (!activeConversationId || !modalState.taskTitle.trim()) return;
    const isGroupOptIn = Boolean(modalState.taskAssignToAll);
    const cleanSubtaskRows = taskSubtaskRows
      .map((r) => ({ assigneeId: String(r.assigneeId ?? ''), content: String(r.content ?? '').trim() }))
      .filter((r) => r.assigneeId && r.content);
    const editingId = modalState.editingTaskId ? String(modalState.editingTaskId) : null;

    if (!editingId) {
      if (
        !canUserCreateTaskInGroup({
          conversation: activeConversation,
          userRole: currentUserRole,
        })
      ) {
        toast.error('Nhóm không cho phép thành viên tạo công việc / nhắc hẹn.');
        return;
      }
    }

    if (editingId) {
      setActionBusy('updateTask', true);
      try {
        await apiClient.patch(`/chat/groups/${activeConversationId}/tasks/${editingId}`, {
          title: modalState.taskTitle.trim(),
          description: modalState.taskNote.trim(),
          assignees: isGroupOptIn ? [] : modalState.taskAssignees,
          assignToAll: isGroupOptIn,
          dueDate: modalState.taskDeadline || undefined,
          subtasks: cleanSubtaskRows,
        });
        await fetchGroupTasks(activeConversationId);
        const byId = new Map(groupMembers.map((m) => [m.userId, m.displayName ?? m.name ?? m.userId]));
        const assigneeLabel =
          cleanSubtaskRows.length > 0
            ? cleanSubtaskRows.map((r) => String(byId.get(r.assigneeId) ?? r.assigneeId)).join(', ')
            : isGroupOptIn
              ? 'Cả nhóm'
              : modalState.taskAssignees.map((id) => String(byId.get(id) ?? id)).join(', ') || 'cả nhóm';
        patchTaskAssignedSystemMessages(dispatch, activeConversationId, editingId, {
          title: modalState.taskTitle.trim(),
          dueDate: deadlineLocalInputToJsonValue(modalState.taskDeadline),
          note: modalState.taskNote.trim() ? modalState.taskNote.trim() : null,
          assigneeLabel,
          assignToAll: isGroupOptIn,
          broadcast: isGroupOptIn,
        });
        toast.success('Đã lưu thay đổi');
        modalActions.closeTaskModal();
      } catch (err) {
        const st = (err as any)?.response?.status;
        toast.error(st === 403 ? 'Bạn không có quyền sửa công việc này' : 'Không thể lưu công việc');
        console.error('Failed to patch task:', err);
      } finally {
        setActionBusy('updateTask', false);
      }
      return;
    }

    setActionBusy('createTask', true);
    const optimisticTask: GroupTask = {
      taskId: `tmp-${Date.now()}`,
      title: modalState.taskTitle.trim(),
      description: modalState.taskNote.trim(),
      // If "assign to all", assignees stays empty (opt-in via participants).
      assignees: isGroupOptIn ? [] : modalState.taskAssignees,
      participants: [],
      assignToAll: isGroupOptIn,
      broadcast: isGroupOptIn,
      subtasks:
        cleanSubtaskRows.length > 0
          ? cleanSubtaskRows.map((r) => ({
              id: `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              assigneeId: r.assigneeId,
              assigneeName:
                groupMembers.find((m) => m.userId === r.assigneeId)?.displayName ??
                groupMembers.find((m) => m.userId === r.assigneeId)?.name ??
                r.assigneeId,
              content: r.content,
              done: false,
              completedAt: null,
            }))
          : undefined,
      status: 'todo',
      dueDate: modalState.taskDeadline || undefined,
      createdAt: new Date().toISOString(),
      creatorId: currentUserId,
      creatorDisplayName: currentUser?.displayName?.trim() ?? null,
    };
    setGroupTasks((prev) => [optimisticTask, ...prev]);
    try {
      const createRes = await apiClient.post(`/chat/groups/${activeConversationId}/tasks`, {
        title: modalState.taskTitle.trim(),
        description: modalState.taskNote.trim(),
        assignees: isGroupOptIn ? [] : modalState.taskAssignees,
        assignToAll: isGroupOptIn,
        dueDate: modalState.taskDeadline || undefined,
        subtasks: cleanSubtaskRows.length > 0 ? cleanSubtaskRows : undefined,
      });
      const createdTaskId =
        (createRes as any)?.data?.data?.taskId ??
        (createRes as any)?.data?.taskId ??
        (createRes as any)?.data?.data?.id ??
        null;
      toast.success('Đã tạo công việc');
      await fetchGroupTasks(activeConversationId);
      // Avoid duplicate task cards in chat: optimistic tmp taskId vs server taskId.
      applyMessageHiddenForMe(
        dispatch,
        activeConversationId,
        `local-task-card:${activeConversationId}:${optimisticTask.taskId}`,
      );

      // Broadcast system card to everyone (local JSON, no spam).
      const byId = new Map(groupMembers.map((m) => [m.userId, m.displayName ?? m.name ?? m.userId]));
      const subtasks =
        optimisticTask.subtasks?.map((s) => ({
          id: s.id,
          assigneeId: s.assigneeId,
          assigneeName: String(byId.get(s.assigneeId) ?? s.assigneeId),
          content: s.content,
          done: false,
          completedAt: null,
        })) ?? [];
      const assigneeLabel =
        subtasks.length > 0
          ? subtasks.map((s) => s.assigneeName).join(', ')
          : isGroupOptIn
            ? 'Cả nhóm'
            : (modalState.taskAssignees.map((id) => String(byId.get(id) ?? id)).join(', ') || 'cả nhóm');
      const content = JSON.stringify({
        kind: 'task_assigned',
        actor: { userId: currentUserId, name: currentUser?.displayName?.trim() ?? 'Bạn' },
        task: {
          taskId: createdTaskId ? String(createdTaskId) : optimisticTask.taskId,
          title: optimisticTask.title,
          dueDate: optimisticTask.dueDate ?? null,
          note: optimisticTask.description?.trim() ? optimisticTask.description.trim() : null,
          assigneeLabel,
          assignToAll: isGroupOptIn,
          broadcast: isGroupOptIn,
          subtasks: subtasks.length > 0 ? subtasks : undefined,
        },
      });
      const taskIdForCard = createdTaskId ? String(createdTaskId) : optimisticTask.taskId;
      const systemMsg: IMessage = {
        messageId: `local-task-card:${activeConversationId}:${taskIdForCard}`,
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
        createdAt: new Date().toISOString(),
      } as any;
      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId: activeConversationId }, (draft) => {
          if (!draft.data) draft.data = [];
          if (!draft.data.some((m) => String(m.messageId) === String(systemMsg.messageId))) {
            draft.data.push(systemMsg);
          }
        }),
      );
      dispatch(messageReceived(systemMsg));
      socketService.emit('message:new', systemMsg);

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
    activeConversation,
    currentUserRole,
    modalState.taskTitle,
    modalState.taskNote,
    modalState.taskAssignees,
    modalState.taskAssignToAll,
    modalState.taskDeadline,
    modalState.editingTaskId,
    modalActions,
    fetchGroupTasks,
    setActionBusy,
    dispatch,
    currentUserId,
    currentUser?.displayName,
    groupMembers,
    taskSubtaskRows,
  ]);

  const openCreateTaskModal = useCallback(() => {
    if (
      !canUserCreateTaskInGroup({
        conversation: activeConversation,
        userRole: currentUserRole,
      })
    ) {
      toast.error('Nhóm không cho phép thành viên tạo công việc / nhắc hẹn.');
      return;
    }
    modalActions.setEditingTaskId(null);
    modalActions.setTaskTitle('');
    modalActions.setTaskNote('');
    modalActions.setTaskDeadline('');
    modalActions.setTaskAssignToAll(false);
    modalActions.setTaskAssignees([]);
    const first = groupMembers[0]?.userId ?? '';
    setTaskSubtaskRows(first ? [{ assigneeId: first, content: '' }] : []);
    modalActions.setShowTaskModal(true);
  }, [activeConversation, currentUserRole, groupMembers, modalActions]);

  const openEditTaskFromGroupTask = useCallback(
    (taskId: string) => {
      const task = groupTasks.find((t) => String(t.taskId) === String(taskId));
      if (!task) {
        toast.error('Không tìm thấy công việc');
        return;
      }
      if (String((task as GroupTask).creatorId ?? '') !== String(currentUserId)) {
        toast.error('Chỉ người tạo mới chỉnh sửa được');
        return;
      }
      modalActions.setEditingTaskId(String(task.taskId));
      modalActions.setTaskTitle(String(task.title ?? ''));
      modalActions.setTaskNote(String(task.description ?? ''));
      modalActions.setTaskDeadline(isoToDatetimeLocalValue(task.dueDate ?? null));
      const assignToAll = Boolean(
        task.assignToAll || task.broadcast || !(Array.isArray(task.assignees) && task.assignees.length > 0),
      );
      modalActions.setTaskAssignToAll(assignToAll);
      modalActions.setTaskAssignees(Array.isArray(task.assignees) ? task.assignees.map(String) : []);
      const subs = Array.isArray(task.subtasks) ? task.subtasks : [];
      const first = groupMembers[0]?.userId ?? '';
      if (subs.length > 0) {
        setTaskSubtaskRows(
          subs.map((s) => ({
            assigneeId: String(s.assigneeId ?? first),
            content: String(s.content ?? ''),
          })),
        );
      } else {
        setTaskSubtaskRows(first ? [{ assigneeId: first, content: '' }] : []);
      }
      modalActions.setShowTaskModal(true);
    },
    [currentUserId, groupMembers, groupTasks, modalActions],
  );

  const handleDeleteGroupTask = useCallback(
    async (taskId: string, opts?: { skipConfirm?: boolean }) => {
      if (!activeConversationId) return;
      const tid = String(taskId);
      const titleFromBoard = String(groupTasks.find((t) => String(t.taskId) === tid)?.title ?? '').trim();
      const titleFromEditor =
        modalState.editingTaskId && String(modalState.editingTaskId) === tid
          ? modalState.taskTitle.trim()
          : '';
      const displayTitle = (titleFromEditor || titleFromBoard || 'Công việc').trim();

      if (!opts?.skipConfirm) {
        modalActions.setTaskDeleteConfirm({ taskId: tid, title: displayTitle });
        return;
      }

      setActionBusy('updateTask', true);
      try {
        await apiClient.delete(`/chat/groups/${activeConversationId}/tasks/${tid}`);
        setGroupTasks((prev) => prev.filter((t) => String(t.taskId) !== tid));
        modalActions.setTaskDeleteConfirm(null);
        if (modalState.editingTaskId && String(modalState.editingTaskId) === tid) {
          modalActions.closeTaskModal();
        }
        toast.success(
          titleFromBoard || titleFromEditor
            ? `Đã hủy công việc "${(titleFromBoard || titleFromEditor).trim()}"`
            : 'Đã hủy công việc',
        );
        await fetchGroupTasks(activeConversationId);
      } catch (err) {
        const st = (err as any)?.response?.status;
        toast.error(st === 403 ? 'Bạn không có quyền hủy công việc này' : 'Không thể hủy công việc');
        console.error('Failed to delete task:', err);
        await fetchGroupTasks(activeConversationId);
      } finally {
        setActionBusy('updateTask', false);
      }
    },
    [
      activeConversationId,
      fetchGroupTasks,
      groupTasks,
      modalActions,
      modalState.editingTaskId,
      modalState.taskTitle,
      setActionBusy,
      setGroupTasks,
    ],
  );

  const handleConfirmDeleteTask = useCallback(() => {
    const c = modalState.taskDeleteConfirm;
    if (!c?.taskId) return;
    void handleDeleteGroupTask(c.taskId, { skipConfirm: true });
  }, [handleDeleteGroupTask, modalState.taskDeleteConfirm]);

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
            payload.muteFor === '1m'
              ? 'Đã tắt thông báo trong 1 phút'
              : payload.muteFor === '5m'
                ? 'Đã tắt thông báo trong 5 phút'
                : 'Đã tắt thông báo trong 10 phút',
          );
        } else if (payload.kind === 'untilIso') {
          await updateConversationPreferences({
            conversationId: activeConversationId,
            isMuted: false,
            notificationsMutedUntil: payload.notificationsMutedUntil,
          }).unwrap();
          const refEight = new Date(nextLocalEightAmIsoString()).getTime();
          const picked = new Date(payload.notificationsMutedUntil).getTime();
          const nearEightAm = Number.isFinite(picked) && Math.abs(picked - refEight) < 120_000;
          toast.success(
            nearEightAm ? 'Đã tắt thông báo đến 8:00 sáng' : 'Đã cập nhật nhắc tắt thông báo',
          );
        } else if (payload.kind === 'clearScheduledMute') {
          await updateConversationPreferences({
            conversationId: activeConversationId,
            notificationsMutedUntil: null,
          }).unwrap();
          toast.success('Đã hủy lịch tắt thông báo');
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
        modalActions.setShowContactsManagement(false);
        void navigate(`/chat/${existingConversation.conversationId}`);
      } catch {
        void directActions.handleFriendClick(friendId, friendName);
      }
    },
    [conversations, navigate, modalActions, directActions],
  );

  const handleOpenProfile = useCallback(() => {
    modalActions.setShowProfileModal(true);
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

  const handleTransferGroupOwner = useCallback(
    async (newOwnerUserId: string) => {
      if (!activeConversationId) return;
      const currentRole = groupMembers.find((m) => m.userId === currentUserId)?.role;
      if (currentRole !== 'owner') {
        toast.error('Chỉ trưởng nhóm mới có thể chuyển quyền');
        return;
      }
      if (!newOwnerUserId?.trim()) return;
      if (window.confirm('Chuyển quyền trưởng nhóm? Bạn sẽ trở thành phó nhóm sau khi chuyển.')) {
        setActionBusy('changeRole', true);
        const before = groupMembers;
        // optimistic: new owner -> owner, current owner -> admin
        setGroupMembers((prev) =>
          prev.map((m) => {
            if (m.userId === newOwnerUserId) return { ...m, role: 'owner' as const };
            if (m.userId === currentUserId) return { ...m, role: 'admin' as const };
            return m;
          }),
        );
        try {
          await apiClient.put(`/chat/groups/${activeConversationId}/members/${newOwnerUserId}/role`, {
            role: 'owner',
          });
          await apiClient.put(`/chat/groups/${activeConversationId}/members/${currentUserId}/role`, {
            role: 'admin',
          });
          toast.success('Trưởng nhóm mới đã được cập nhật');
          void fetchGroupMembers(activeConversationId);
          void refetchConversations();
        } catch (err) {
          setGroupMembers(before);
          toast.error('Không thể chuyển quyền. Thử lại hoặc kiểm tra quyền trên máy chủ');
          console.error('Failed to transfer group owner:', err);
          throw err;
        } finally {
          setActionBusy('changeRole', false);
        }
      }
    },
    [
      activeConversationId,
      groupMembers,
      currentUserId,
      setActionBusy,
      fetchGroupMembers,
      refetchConversations,
      setGroupMembers,
    ],
  );

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

  const handleTaskJoined = useCallback(
    async (taskId: string) => {
      if (!activeConversationId) return;
      const tid = String(taskId);
      const taskRow = groupTasks.find((t) => String(t.taskId) === tid);
      if (taskRow?.dueDate != null && String(taskRow.dueDate).trim() !== '') {
        const dueMs = new Date(String(taskRow.dueDate)).getTime();
        if (Number.isFinite(dueMs) && Date.now() > dueMs) {
          toast.error('Đã quá hạn, không thể xác nhận tham gia');
          return;
        }
      }
      let joinedNow = false;
      let joinedTaskTitle = '';
      setGroupTasks((prev) =>
        prev.map((t) => {
          if (String(t.taskId) !== String(taskId)) return t;
          joinedTaskTitle = String(t.title ?? '');
          const p = Array.isArray(t.participants) ? t.participants : [];
          if (p.includes(currentUserId)) return t;
          joinedNow = true;
          return { ...t, participants: [...p, currentUserId] };
        }),
      );
      if (!joinedNow) return;
      try {
        await apiClient.post(`/chat/groups/${activeConversationId}/tasks/${String(taskId)}/join`);
      } catch (err) {
        setGroupTasks((prev) =>
          prev.map((t) => {
            if (String(t.taskId) !== String(taskId)) return t;
            const p = Array.isArray(t.participants) ? t.participants : [];
            return { ...t, participants: p.filter((id) => String(id) !== String(currentUserId)) };
          }),
        );
        const st = (err as any)?.response?.status;
        const msg = String((err as any)?.response?.data?.message ?? '').trim();
        toast.error(
          st === 403 && msg
            ? msg
            : st === 403
              ? 'Bạn không thể xác nhận tham gia công việc này'
              : 'Không thể tham gia công việc',
        );
        return;
      }
      toast.success(
        joinedTaskTitle
          ? `Đã xác nhận tham gia: «${joinedTaskTitle}»`
          : 'Đã xác nhận tham gia công việc',
      );
    },
    [activeConversationId, currentUserId, groupTasks],
  );

  const handleOpenAddFriend = useCallback(() => {
    modalActions.setShowAddFriendModal(true);
  }, [modalActions]);

  const handleToggleShowInfo = useCallback(() => {
    modalActions.setShowInfo((v) => !v);
  }, [modalActions]);

  const handleCloseInfo = useCallback(() => {
    modalActions.setShowInfo(false);
  }, [modalActions]);

  useEffect(() => {
    if (!isDesktop && modalState.showInfo) {
      modalActions.setShowInfo(false);
    }
  }, [isDesktop, modalState.showInfo, modalActions]);

  const handleStartEdit = useCallback(
    (msg: IMessage) => {
      if (msg.type !== 'text') return;
      modalActions.setEditingMessage(msg);
      modalActions.setEditDraft(msg.content);
    },
    [modalActions],
  );

  const openCreateGroupModal = modalActions.openCreateGroupModal;

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
    onOpenCreateGroup: openCreateGroupModal,
    onOpenMarkRead: handleOpenMarkRead,
    onOpenAddFriend: handleOpenAddFriend,
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

  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [focusTaskNonce, setFocusTaskNonce] = useState(0);

  const { cancelTaskReminders, snoozeTask } = useTaskReminderScheduler({
    conversationId: activeConversationId,
    tasks: groupTasks as any[],
    members: groupMembers.map((m) => ({ userId: m.userId, displayName: m.displayName })),
    currentUserId,
  });

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
          onOpenProfile={handleOpenProfile}
          showContactsManagement={modalState.showContactsManagement}
          onToggleContacts={handleToggleContacts}
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
              groupMembers={groupMembers.map((m) => ({ userId: m.userId, displayName: m.displayName }))}
              onTaskJoined={handleTaskJoined}
              // Deprecated flows: completion/snooze are not part of current UX.
              onOpenPollVote={(pollId) => openPollVoteModal(pollId)}
              shareTargetConversations={conversations}
              onForwardMediaMessage={handleForwardMediaMessage}
              onEditGroupTask={openEditTaskFromGroupTask}
              onDeleteGroupTask={(id) => void handleDeleteGroupTask(id)}
            />

            {chatFrameNotice && activeConversationId ? (
              (() => {
                const v = chatFrameNotice.variant ?? 'task_assigned';
                const isClickable = Boolean(chatFrameNotice.onClick);
                const theme =
                  v === 'task_joined'
                    ? {
                        wrap: 'bg-emerald-50/90 dark:bg-emerald-900/20 border-emerald-200/70 dark:border-emerald-800/60',
                        text: 'text-emerald-900 dark:text-emerald-50',
                        sub: 'text-emerald-900/60 dark:text-emerald-50/70',
                        icon: <CheckCircle2 className="w-4 h-4" />,
                      }
                    : v === 'poll'
                      ? {
                          wrap: 'bg-orange-50/90 dark:bg-orange-900/20 border-orange-200/70 dark:border-orange-800/60',
                          text: 'text-orange-950 dark:text-orange-50',
                          sub: 'text-orange-950/60 dark:text-orange-50/70',
                          icon: <BarChart2 className="w-4 h-4" />,
                        }
                      : {
                          wrap: 'bg-blue-50/90 dark:bg-blue-900/20 border-blue-200/70 dark:border-blue-800/60',
                          text: 'text-blue-950 dark:text-blue-50',
                          sub: 'text-blue-950/60 dark:text-blue-50/70',
                          icon: <ClipboardList className="w-4 h-4" />,
                        };

                const timeLabel = (() => {
                  const ms = new Date(chatFrameNotice.atIso).getTime();
                  if (!Number.isFinite(ms)) return '';
                  return new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                })();

                return (
                  <div
                    className={`relative w-full shrink-0 border-t px-3 py-2 ${theme.wrap}`}
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-[1px] ${theme.text}`}>{theme.icon}</div>
                      <button
                        type="button"
                        onClick={() => chatFrameNotice.onClick?.()}
                        disabled={!isClickable}
                        className={`min-w-0 flex-1 text-left text-[12px] font-semibold leading-[18px] ${theme.text} ${
                          isClickable ? 'cursor-pointer hover:underline' : 'cursor-default'
                        }`}
                      >
                        {chatFrameNotice.text}
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatFrameNotice(null)}
                        className={`shrink-0 rounded-md p-1 ${theme.sub} hover:bg-black/5 dark:hover:bg-white/10`}
                        title="Đóng"
                        aria-label="Đóng thông báo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {timeLabel ? (
                      <div className={`mt-0.5 pl-6 text-[11px] font-semibold ${theme.sub}`}>{timeLabel}</div>
                    ) : null}
                  </div>
                );
              })()
            ) : null}

            <ChatComposer
              activeConversation={activeConversation}
              activeConversationId={activeConversationId}
              currentUserRole={currentUserRole}
              onOpenPoll={() => modalActions.setShowPollModal(true)}
              onOpenTask={openCreateTaskModal}
            />
          </>
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
            onToggleShowInfo={handleToggleShowInfo}
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
            onBack={!isTabletOrDesktop ? handleBackToList : undefined}
          />
        )}

        {/* ── Side Info Rail ───────────────────────────────────────────
             Desktop: animated sidebar; Mobile/Tablet: Sheet overlay     */}
        <ChatSideInfoRail
          showInfo={modalState.showInfo}
          showContactsManagement={modalState.showContactsManagement}
          onClose={handleCloseInfo}
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
          onTaskJoined={handleTaskJoined}
          onOpenPollModalFromPanel={
            activeConversation?.type === 'group' ? () => modalActions.setShowPollModal(true) : undefined
          }
          onOpenTaskModalFromPanel={activeConversation?.type === 'group' ? openCreateTaskModal : undefined}
          onEditTaskFromBulletin={(t) => openEditTaskFromGroupTask(String(t.taskId))}
          onDeleteTaskFromBulletin={(id) => void handleDeleteGroupTask(id)}
          taskActionBusy={groupActionLoading.createTask || groupActionLoading.updateTask}
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
          onTransferGroupOwner={handleTransferGroupOwner}
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
          focusTaskId={focusTaskId}
          focusTaskNonce={focusTaskNonce}
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
      <ConfirmModal
        open={modalState.taskDeleteConfirm !== null}
        title="Hủy công việc?"
        description={
          modalState.taskDeleteConfirm ? (
            <>
              Bạn sắp hủy công việc{' '}
              <span className="font-bold text-foreground">«{modalState.taskDeleteConfirm.title}»</span>.
              <br />
              <br />
              Thẻ giao việc sẽ được thu hồi cho toàn bộ nhóm (không còn hiển thị). Mọi người vẫn thấy dòng nhật ký hủy
              việc trong khung chat.
            </>
          ) : undefined
        }
        confirmLabel="Hủy công việc"
        variant="danger"
        isConfirming={groupActionLoading.updateTask}
        onClose={() => {
          if (!groupActionLoading.updateTask) modalActions.setTaskDeleteConfirm(null);
        }}
        onConfirm={() => void handleConfirmDeleteTask()}
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
        subtaskRows={taskSubtaskRows}
        onSubtaskRowsChange={setTaskSubtaskRows}
        onSubmitTask={handleSubmitTask}
        isEditing={Boolean(modalState.editingTaskId)}
        submitBusy={groupActionLoading.createTask || groupActionLoading.updateTask}
        onDeleteTask={
          modalState.editingTaskId
            ? () => {
                void handleDeleteGroupTask(modalState.editingTaskId as string);
              }
            : undefined
        }
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
