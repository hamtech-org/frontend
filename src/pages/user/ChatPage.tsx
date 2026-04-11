import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
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
} from '@/store/api/chatApi';
import {
  setActiveConversation,
  messageEdited,
  messageRecalled,
  messageDeleted,
  messagePinUpdated,
  resetUnread,
} from '@/store/slices/chatSlice';
import { socketService } from '@/services/socket';
import type { AppDispatch, RootState } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import { formatTime } from '@/utils/formatDate';
import { decodeJwtUserId } from '@/utils/chatUtils';
import { ChatNavRail } from '@/components/chat/ChatNavRail';
import { ConversationListPanel, type ContactsTabId } from '@/components/chat/ConversationListPanel';
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

type MessageConfirmState =
  | null
  | { kind: 'recall'; msg: IMessage }
  | { kind: 'delete'; msg: IMessage };

const CHAT_NEAR_BOTTOM_PX = 80;

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
  const socketMessages = useSelector((state: RootState) =>
    activeConversationId ? (state.chat.messages[activeConversationId] ?? []) : [],
  );
  const typingUsers = useSelector((state: RootState) =>
    activeConversationId ? (state.chat.typingUsers[activeConversationId] ?? []) : [],
  );

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
  const [createConversation] = useCreateConversationMutation();
  const [editMessage, { isLoading: isEditing }] = useEditMessageMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [recallMessage] = useRecallMessageMutation();
  const [markAsRead] = useMarkAsReadMutation();
  const [pinMessage] = usePinMessageMutation();
  const [unpinMessage] = useUnpinMessageMutation();

  const activeConversation = conversations.find((c) => c.conversationId === activeConversationId);

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

  useEffect(() => {
    void refetchConversations();
  }, [activeConversationId, refetchConversations]);

  const [inputText, setInputText] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | null>(null);
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

  const handleSendMessage = useCallback(async () => {
    const content = inputText.trim();
    if (!content || !activeConversationId || isSending) return;
    setInputText('');
    try {
      await sendMessage({
        conversationId: activeConversationId,
        type: 'text',
        content,
      }).unwrap();
    } catch {
      setInputText(content);
    }
  }, [inputText, activeConversationId, isSending, sendMessage]);

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
      void navigate(`/chat/${result.data.conversationId}`);
    } catch {
      /* ignored */
    }
    setShowCreateGroupModal(false);
    setSelectedGroupMembers([]);
    setGroupName('');
  }, [selectedGroupMembers, groupName, createConversation, navigate]);

  const closeTaskModal = useCallback(() => {
    setShowTaskModal(false);
    setTaskTitle('');
    setTaskDeadline('');
    setTaskNote('');
    setTaskAssignees([]);
  }, []);

  const handleSubmitTask = useCallback(() => {
    closeTaskModal();
  }, [closeTaskModal]);

  const openAISummaryFromPanel = useCallback(() => {
    setShowAISummaryModal(true);
    setAiSummaryResult('');
    setAiSummaryLoading(true);
    window.setTimeout(() => {
      setAiSummaryLoading(false);
      setAiSummaryResult(
        '📌 **Chủ đề chính:** Nhóm đang thảo luận về tiến độ dự án HamTech UI và deadline thiết kế.\n\n🗣️ **Người hoạt động nhiều nhất:** Elena Vance (12 tin), Marcus Chen (8 tin).\n\n✅ **Kết luận đã đạt được:** Chốt họp chiều nay lúc 2h. Elena sẽ gửi bản mockup mới nhất.\n\n⚠️ **Việc cần làm:** Marcus cần review và phản hồi trước 5h chiều.',
      );
    }, 2000);
  }, []);

  const handleRerunAISummary = useCallback(() => {
    setAiSummaryResult('');
    setAiSummaryLoading(true);
    window.setTimeout(() => {
      setAiSummaryLoading(false);
      setAiSummaryResult(
        '📌 **Chủ đề chính:** Nhóm đang thảo luận về tiến độ dự án HamTech UI và deadline thiết kế.\n\n🗣️ **Người hoạt động nhiều nhất:** Elena Vance (12 tin), Marcus Chen (8 tin).\n\n✅ **Kết luận đã đạt được:** Chốt họp chiều nay lúc 2h. Elena sẽ gửi bản mockup mới nhất.\n\n⚠️ **Việc cần làm:** Marcus cần review và phản hồi trước 5h chiều.',
      );
    }, 2000);
  }, []);

  const openCreateGroupModal = useCallback(() => {
    setShowCreateGroupModal(true);
    setSelectedGroupMembers([]);
    setGroupName('');
  }, []);

  const handleAddFriendSubmit = useCallback(() => {
    if (!addFriendQuery.trim()) return;
    console.info('[chat] Gửi lời mời kết bạn (placeholder):', addFriendQuery.trim());
    setShowAddFriendModal(false);
    setAddFriendQuery('');
  }, [addFriendQuery]);

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
        <ChatHeader
          activeConversation={activeConversation}
          typingUsers={typingUsers}
          showInfo={showInfo}
          onToggleShowInfo={() => setShowInfo(!showInfo)}
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
          onOpenPoll={() => setShowPollModal(true)}
          onOpenTask={() => setShowTaskModal(true)}
        />
      </div>

      {showInfo && (
        <ConversationInfoPanel
          activeConversation={activeConversation}
          onOpenAISummaryFromPanel={openAISummaryFromPanel}
          onOpenMemberModal={(tab) => {
            setMemberTab(tab);
            setShowMemberModal(true);
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
      />
      <MemberManagementModal
        open={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        memberTab={memberTab}
        onMemberTabChange={setMemberTab}
      />
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
