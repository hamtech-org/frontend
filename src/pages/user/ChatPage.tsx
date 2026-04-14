import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  chatApi,
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useCreateConversationMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useRecallMessageMutation,
  useMarkAsReadMutation,
  usePinMessageMutation,
  useUnpinMessageMutation,
  useReactMessageMutation,
} from '@/store/api/chatApi';
import { useUploadMediaMutation, useUploadMediaMultiMutation, type MediaUploadResult } from '@/store/api/mediaApi';
import { useSocketContext } from '@/contexts/SocketContext';
import type { PendingAttachment } from '@/components/chat/ChatComposer';
import {
  setActiveConversation,
  messageReceived,
  messageEdited,
  messageRecalled,
  messageDeleted,
  messagePinUpdated,
  messageReacted,
  typingStarted,
  typingStopped,
  resetUnread,
  setReplyingTo,
  clearReplyingTo,
} from '@/store/slices/chatSlice';
import { socketService } from '@/services/socket';
import type { AppDispatch, RootState } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import { formatTime } from '@/utils/formatDate';
import { decodeJwtUserId } from '@/utils/chatUtils';
import { ChatNavRail } from '@/components/chat/ChatNavRail';
import { ConversationListPanel, type ContactsTabId } from '@/components/chat/ConversationListPanel';
import { FriendsListView } from '@/components/chat/FriendsListView';
import { AddFriendModal } from '@/components/chat/AddFriendModal';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { PinnedMessagesBar } from '@/components/chat/PinnedMessagesBar';
import { ConversationInfoPanel } from '@/components/chat/ConversationInfoPanel';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { EditMessageDialog } from '@/components/chat/EditMessageDialog';
import { MarkReadModal } from '@/components/chat/MarkReadModal';
import { ConfirmModal } from '@/components/chat/ConfirmModal';
import { ProfileModal } from '@/components/chat/ProfileModal';
import { CreateGroupModal } from '@/components/chat/CreateGroupModal';
import { PollModal } from '@/components/chat/PollModal';
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
};

type GroupTask = {
  taskId: string;
  title: string;
  description?: string;
  assignees: string[];
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
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
  const conversations = conversationsData?.data ?? [];

  const activeConversationId = useSelector((state: RootState) => state.chat.activeConversationId);
  const socketMessages = useSelector((state: RootState) => {
    if (!activeConversationId) return EMPTY_ARRAY;
    return state.chat.messages[activeConversationId] ?? EMPTY_ARRAY;
  });

  const typingUsers = useSelector((state: RootState) => {
    if (!activeConversationId) return EMPTY_ARRAY;
    return state.chat.typingUsers[activeConversationId] ?? EMPTY_ARRAY;
  });
  const replyingTo = useSelector((state: RootState) => state.chat.replyingTo);

  const { data: messagesData } = useGetMessagesQuery(
    { conversationId: activeConversationId! },
    { skip: !activeConversationId },
  );

  const allMessages = useMemo(() => {
    const apiMessages = messagesData?.data ?? [];
    const merged: IMessage[] = [...apiMessages];
    socketMessages.forEach((sm) => {
      if (!merged.some((m) => m.messageId === sm.messageId)) {
        merged.push(sm);
      }
    });
    merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return merged;
  }, [messagesData, socketMessages]);

  const { primaryPinnedMessage, otherPinnedMessages } = useMemo(() => {
    const pinnedSorted = allMessages.filter((m) => m.isPinned);
    const primary = pinnedSorted.length > 0 ? pinnedSorted[pinnedSorted.length - 1] : null;
    const other = pinnedSorted.length > 1 ? pinnedSorted.slice(0, -1) : [];
    return { primaryPinnedMessage: primary, otherPinnedMessages: other };
  }, [allMessages]);

  const latestMessageIdForRead =
    allMessages.length > 0 ? allMessages[allMessages.length - 1].messageId : undefined;

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [uploadMedia] = useUploadMediaMutation();
  const [uploadMediaMulti] = useUploadMediaMultiMutation();
  const [mediaUploading, setMediaUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [createConversation] = useCreateConversationMutation();
  const [editMessage, { isLoading: isEditing }] = useEditMessageMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [recallMessage] = useRecallMessageMutation();
  const [markAsRead] = useMarkAsReadMutation();
  const [pinMessage] = usePinMessageMutation();
  const [unpinMessage] = useUnpinMessageMutation();
  const [reactMessage] = useReactMessageMutation();

  const activeConversation = conversations.find((c) => c.conversationId === activeConversationId);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupRequests, setGroupRequests] = useState<GroupRequest[]>([]);
  const [groupPolls, setGroupPolls] = useState<GroupPoll[]>([]);
  const [groupTasks, setGroupTasks] = useState<GroupTask[]>([]);
  const [latestRecap, setLatestRecap] = useState<AIRecap | null>(null);
  const [groupJoinRequested, setGroupJoinRequested] = useState(false);
  const [groupLoading, setGroupLoading] = useState({
    members: false,
    requests: false,
    polls: false,
    tasks: false,
    recap: false,
  });
  const [groupActionLoading, setGroupActionLoading] = useState<GroupActionLoading>({
    updateGroup: false,
    deleteGroup: false,
    leaveGroup: false,
    addMembers: false,
    removeMember: false,
    changeRole: false,
    requestJoin: false,
    approveRequest: false,
    rejectRequest: false,
    createPoll: false,
    votePoll: false,
    addPollOption: false,
    closePoll: false,
    createTask: false,
    updateTask: false,
    generateRecap: false,
  });

  const { initiateCall } = useCallContext();
  const { isConnected } = useSocketContext();

  const handleAudioCall = useCallback(() => {
    if (activeConversation?.type !== 'direct' || !activeConversation.otherUserId) return;
    // CallContext sẽ lưu returnTo = location.pathname (đang là /chat/:conversationId)
    initiateCall(activeConversation.otherUserId, 'audio');
  }, [activeConversation, initiateCall]);

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
  const lastMarkReadKeyRef = useRef<string>('');

  const patchMessageInCache = useCallback(
    (conversationId: string, messageId: string, patch: Partial<IMessage>) => {
      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
          if (!draft.data) return;
          const m = draft.data.find((x) => x.messageId === messageId);
          if (m) Object.assign(m, patch);
        }),
      );
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
        // Socket or invalidation will handle the UI update, but optimistic update is better:
        // Already handled correctly by socket if we want to wait, or we can patch manually.
        // I will let socket handle it by default, or you can do optimistic updates here.
      } catch {
        /* ignore */
      }
    },
    [reactMessage],
  );

  useEffect(() => {
    void refetchConversations();
  }, [activeConversationId, refetchConversations]);

  // Lưu inputText theo conversationId
  const [inputTextMap, setInputTextMap] = useState<{ [convId: string]: string }>({});
  const inputText = activeConversationId ? inputTextMap[activeConversationId] || '' : '';
  const setInputText = (text: string) => {
    if (!activeConversationId) return;
    setInputTextMap((prev) => ({ ...prev, [activeConversationId]: text }));
  };

  const addPendingFiles = useCallback((files: File[]) => {
    setPendingAttachments((prev) => {
      if (prev.length >= MAX_PENDING_FILES) return prev;
      const next = [...prev];
      for (const file of files) {
        if (next.length >= MAX_PENDING_FILES) break;
        if (file.size > roughMaxBytesForFile(file)) continue;
        const previewUrl =
          file.type.startsWith('image/') || file.type.startsWith('video/')
            ? URL.createObjectURL(file)
            : null;
        next.push({ localId: crypto.randomUUID(), file, previewUrl });
      }
      return next;
    });
  }, []);

  const removePendingAttachment = useCallback((localId: string) => {
    setPendingAttachments((prev) => {
      const hit = prev.find((p) => p.localId === localId);
      if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  }, []);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [unreadIncomingCount, setUnreadIncomingCount] = useState(0);

  const [showInfo, setShowInfo] = useState(true);
  const [showOtherPinnedPanel, setShowOtherPinnedPanel] = useState(false);
  const [showMarkReadModal, setShowMarkReadModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
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
      if (activeConversationId) fetchGroupMembers(activeConversationId);
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
    fetchGroupRequests,
    fetchGroupPolls,
    fetchGroupTasks,
    fetchLatestRecap,
    refetchConversations,
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
              content: msg.content,
              senderId: msg.senderId,
              type: msg.type,
              createdAt: msg.createdAt,
              senderDisplayName: msg.senderDisplayName,
            };
          }
        })
      );
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
    };

    const handleDeletedMessage = (payload: { messageId: string; conversationId: string }) => {
      dispatch(messageDeleted(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, {
        isDeleted: true,
        content: '',
        isPinned: false,
      });
    };

    const handlePinUpdated = (payload: {
      messageId: string;
      conversationId: string;
      isPinned: boolean;
    }) => {
      dispatch(messagePinUpdated(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, { isPinned: payload.isPinned });
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
    socketService.on('group:updated', handleGroupUpdated);
    socketService.on('message:edited', handleEditedMessage);
    socketService.on('message:recalled', handleRecalledMessage);
    socketService.on('message:deleted', handleDeletedMessage);
    socketService.on('message:pin_updated', handlePinUpdated);
    socketService.on('message:reaction', handleReactionEvent);
    socketService.on('message:typing', handleTypingEvent);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('group:updated', handleGroupUpdated);
      socketService.off('message:edited', handleEditedMessage);
      socketService.off('message:recalled', handleRecalledMessage);
      socketService.off('message:deleted', handleDeletedMessage);
      socketService.off('message:pin_updated', handlePinUpdated);
      socketService.off('message:reaction', handleReactionEvent);
      socketService.off('message:typing', handleTypingEvent);
    };
  }, [dispatch, patchMessageInCache, fetchGroupMembers, isConnected]);

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
    setShowOtherPinnedPanel(false);
    setMessageConfirm(null);
  }, [activeConversationId]);

  useEffect(() => {
    setPendingAttachments((prev) => {
      prev.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      return [];
    });
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    socketService.emit('conversation:join', activeConversationId);
    dispatch(resetUnread(activeConversationId));
    return () => {
      socketService.emit('conversation:leave', activeConversationId);
    };
  }, [activeConversationId, dispatch]);

  useEffect(() => {
    if (!activeConversationId || !latestMessageIdForRead) return;
    const key = `${activeConversationId}:${latestMessageIdForRead}`;
    if (lastMarkReadKeyRef.current === key) return;
    lastMarkReadKeyRef.current = key;
    // Gửi sự kiện đã đọc qua socket để đồng bộ realtime unreadCount
    socketService.emit('message:read', {
      conversationId: activeConversationId,
      messageId: latestMessageIdForRead,
    });
    void markAsRead({ conversationId: activeConversationId, messageId: latestMessageIdForRead });
  }, [activeConversationId, latestMessageIdForRead, markAsRead]);

  useEffect(() => {
    prevLastMessageIdRef.current = null;
    setUnreadIncomingCount(0);
    lastMarkReadKeyRef.current = '';
  }, [activeConversationId]);

  useEffect(() => {
    if (!actionMenuMsgId) return;
    const close = () => setActionMenuMsgId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [actionMenuMsgId]);

  useEffect(() => {
    if (!activeConversationId || allMessages.length === 0) return;

    const latestMessage = allMessages[allMessages.length - 1];
    const previousMessageId = prevLastMessageIdRef.current;
    if (previousMessageId === null) {
      prevLastMessageIdRef.current = latestMessage.messageId;
      const scrollToEnd = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      };
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToEnd);
      });
      return;
    }
    if (latestMessage.messageId === previousMessageId) return;

    const isMyMessage = latestMessage.senderId === currentUserId;
    const container = messagesContainerRef.current;
    const distanceToBottom = container
      ? container.scrollHeight - container.scrollTop - container.clientHeight
      : 0;
    const isOverflowing = container ? container.scrollHeight > container.clientHeight + 1 : false;
    const isNearBottom = distanceToBottom < CHAT_NEAR_BOTTOM_PX;

    if (isMyMessage) {
      setUnreadIncomingCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (isNearBottom || !isOverflowing) {
      setUnreadIncomingCount(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      });
    } else {
      setUnreadIncomingCount((count) => count + 1);
    }

    prevLastMessageIdRef.current = latestMessage.messageId;
  }, [allMessages, activeConversationId, currentUserId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceToBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceToBottom < CHAT_NEAR_BOTTOM_PX) {
        setUnreadIncomingCount(0);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || typingUsers.length === 0) return;

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceToBottom < CHAT_NEAR_BOTTOM_PX;
    if (!isNearBottom) return;

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [typingUsers.length]);

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
        dispatch(messageDeleted({ messageId: msg.messageId, conversationId: msg.conversationId }));
        patchMessageInCache(msg.conversationId, msg.messageId, {
          isDeleted: true,
          content: '',
          isPinned: false,
        });
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
        if (msg.isPinned) {
          await unpinMessage({
            messageId: msg.messageId,
            conversationId: msg.conversationId,
            createdAt: msg.createdAt,
          }).unwrap();
          dispatch(
            messagePinUpdated({
              messageId: msg.messageId,
              conversationId: msg.conversationId,
              isPinned: false,
            }),
          );
          patchMessageInCache(msg.conversationId, msg.messageId, { isPinned: false });
        } else {
          await pinMessage({
            messageId: msg.messageId,
            conversationId: msg.conversationId,
            createdAt: msg.createdAt,
          }).unwrap();
          dispatch(
            messagePinUpdated({
              messageId: msg.messageId,
              conversationId: msg.conversationId,
              isPinned: true,
            }),
          );
          patchMessageInCache(msg.conversationId, msg.messageId, { isPinned: true });
        }
        setActionMenuMsgId(null);
      } catch {
        /* ignore */
      }
    },
    [pinMessage, unpinMessage, dispatch, patchMessageInCache],
  );

  const scrollToMessageBubble = useCallback((messageId: string) => {
    document.getElementById(`chat-msg-${messageId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    setShowOtherPinnedPanel(false);
  }, []);

  const formatMessageTime = (createdAt: string) => formatTime(createdAt);

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
    
    if (currentUserRole !== 'owner') {
      toast.error('Chỉ Trưởng nhóm mới có quyền giải tán nhóm');
      return;
    }

    if (!window.confirm('Giải tán nhóm?')) return;

    setActionBusy('deleteGroup', true);
    try {
      await apiClient.delete(`/chat/groups/${activeConversationId}`);
      toast.success('Giải tán nhóm thành công');
      void navigate('/chat', { replace: true });
    } catch (error) {
      toast.error('Không thể giải tán nhóm');
      console.error('Failed to delete group:', error);
    } finally {
      setActionBusy('deleteGroup', false);
    }
  }, [activeConversationId, navigate, setActionBusy]);

  const handleLeaveGroup = useCallback(async () => {
    if (!activeConversationId) return;
    if (!window.confirm('Bạn chắc chắn muốn rời nhóm?')) return;

    setActionBusy('leaveGroup', true);
    try {
      await apiClient.post(`/chat/groups/${activeConversationId}/leave`);
      toast.success('Đã rời nhóm');
      void navigate('/chat', { replace: true });
    } catch (error) {
      toast.error('Không thể rời nhóm');
      console.error('Failed to leave group:', error);
    } finally {
      setActionBusy('leaveGroup', false);
    }
  }, [activeConversationId, navigate, setActionBusy]);

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
    };
    setGroupTasks((prev) => [optimisticTask, ...prev]);
    try {
      await apiClient.post(`/chat/groups/${activeConversationId}/tasks`, {
        title: taskTitle.trim(),
        description: taskNote.trim(),
        assignees: taskAssignees,
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
    taskDeadline,
    closeTaskModal,
    fetchGroupTasks,
    setActionBusy,
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
    };
    setGroupPolls((prev) => [optimisticPoll, ...prev]);
    try {
      await apiClient.post(`/chat/groups/${activeConversationId}/polls`, {
        question: pollQuestion.trim(),
        options: pollOptions.filter((o) => !!o.trim()),
      });
      toast.success('Tạo bình chọn thành công');
      await fetchGroupPolls(activeConversationId);
      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
    } catch (err) {
      setGroupPolls((prev) => prev.filter((poll) => poll.pollId !== optimisticPoll.pollId));
      toast.error('Không thể tạo bình chọn');
      console.error('Failed to create poll:', err);
    } finally {
      setActionBusy('createPoll', false);
    }
  }, [activeConversationId, pollQuestion, pollOptions, fetchGroupPolls, setActionBusy]);

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
    } catch (err) {
      setGroupRequests(beforeRequests);
      setGroupMembers(beforeMembers);
      toast.error('Không thể duyệt yêu cầu');
      console.error('Failed to approve request:', err);
    } finally {
      setActionBusy('approveRequest', false);
    }
  }, [activeConversationId, groupRequests, groupMembers, setActionBusy]);

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
      setGroupMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } : m)));
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
    setGroupPolls((prev) =>
      prev.map((poll) => {
        if (poll.pollId !== pollId) return poll;
        const nextOptions = poll.options.map((option, index) => {
          const currentVoters = option.voters ?? [];
          if (index === optionIndex) {
            if (currentVoters.includes(currentUserId)) {
              return { ...option, voters: currentVoters.filter((id) => id !== currentUserId) };
            }
            return { ...option, voters: [...currentVoters, currentUserId] };
          }
          return option;
        });
        return { ...poll, options: nextOptions };
      })
    );
    try {
      await apiClient.post(`/chat/groups/${activeConversationId}/polls/${pollId}/vote`, { optionIndex });
    } catch (error) {
      setGroupPolls(before);
      toast.error('Không thể bình chọn');
      console.error('Failed to vote poll:', error);
    } finally {
      setActionBusy('votePoll', false);
    }
  }, [activeConversationId, groupPolls, currentUserId, setActionBusy]);

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
    <div className="absolute inset-0 w-full h-full flex overflow-hidden bg-ethereal-bg dark:bg-midnight-bg">
      <ChatNavRail
        navigate={navigate}
        onOpenProfile={() => setShowProfileModal(true)}
        showContactsManagement={showContactsManagement}
        onToggleContacts={() => {
          setShowContactsManagement((v) => !v);
          setContactsTab('friends');
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
        formatMessageTime={formatMessageTime}
        onOpenCreateGroup={openCreateGroupModal}
        onOpenMarkRead={() => setShowMarkReadModal(true)}
        onOpenAddFriend={() => setShowAddFriendModal(true)}
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
            />

            {activeConversationId && primaryPinnedMessage && (
              <PinnedMessagesBar
                primaryPinnedMessage={primaryPinnedMessage}
                otherPinnedMessages={otherPinnedMessages}
                showOtherPinnedPanel={showOtherPinnedPanel}
                onToggleOtherPinnedPanel={() => setShowOtherPinnedPanel((v) => !v)}
                onScrollToMessage={scrollToMessageBubble}
                onTogglePin={handleTogglePinMsg}
                formatMessageTime={formatMessageTime}
              />
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
              actionMenuMsgId={actionMenuMsgId}
              onActionMenuMsgIdChange={setActionMenuMsgId}
              onStartEdit={(msg) => {
                setEditingMessage(msg);
                setEditDraft(msg.content);
              }}
              onTogglePin={handleTogglePinMsg}
              onRecall={handleRecallMsg}
              onDelete={handleDeleteMsg}
              onReply={(msg) => dispatch(setReplyingTo(msg))}
              onReact={handleReactMessage}
              onJumpToLatest={handleJumpToLatest}
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
                replyingTo={replyingTo}
                onClearReply={() => dispatch(clearReplyingTo())}
                onOpenPoll={() => setShowPollModal(true)}
                onOpenTask={() => setShowTaskModal(true)} pendingAttachments={[]} onAddPendingFiles={function (files: File[]): void {
                  throw new Error('Function not implemented.');
                } } onRemovePendingAttachment={function (localId: string): void {
                  throw new Error('Function not implemented.');
                } }            />
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
          onRequestJoin={() => void handleRequestJoin()}
          onVotePoll={(pollId, optionIndex) => void handleVotePoll(pollId, optionIndex)}
          onAddPollOption={(pollId) => void handleAddPollOption(pollId)}
          onClosePoll={(pollId) => void handleClosePoll(pollId)}
          onToggleTask={(taskId) => void handleToggleTaskStatus(taskId)}
          polls={groupPolls}
          tasks={groupTasks}
          isJoinRequested={groupJoinRequested}
          loading={{
            polls: groupLoading.polls || groupActionLoading.votePoll,
            tasks: groupLoading.tasks || groupActionLoading.updateTask,
            recap: groupLoading.recap || groupActionLoading.generateRecap,
            requestJoin: groupActionLoading.requestJoin,
            updateGroup: groupActionLoading.updateGroup,
          }}
          onLeaveGroup={() => void handleLeaveGroup()}
          onDeleteGroup={() => void handleDeleteGroup()}
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
        />
      )}

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
            ? 'Xóa tin nhắn này?'
            : messageConfirm?.kind === 'recall'
              ? 'Thu hồi tin nhắn này cho mọi người?'
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
        members={groupMembers.map(m => ({
          id: m.userId,
          name: m.name ?? m.userId,
          avatar: m.avatar ?? 'https://via.placeholder.com/40',
          role: m.role
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
