import { useCallback, useState, useMemo } from 'react';
import type { IMessage } from '@/types/chat.types';
import type { MessageConfirmState } from '@/types/chat.group.types';
import type { ContactsTabId } from '@/components/chat/ConversationListPanel';

export interface ChatModalState {
  showInfo: boolean;
  showOtherPinnedPanel: boolean;
  showMarkReadModal: boolean;
  showCreateGroupModal: boolean;
  selectedGroupMembers: string[];
  groupName: string;
  showPollModal: boolean;
  pollQuestion: string;
  pollOptions: string[];
  pollMultipleChoice: boolean;
  showPollVoteModal: boolean;
  activePollId: string | null;
  showAddMembersModal: boolean;
  showEditGroupModal: boolean;
  editGroupName: string;
  editGroupAvatarFile: File | null;
  editGroupAvatarPreview: string | null;
  selectedAddMembers: string[];
  showAISummaryModal: boolean;
  showTaskModal: boolean;
  taskTitle: string;
  taskDeadline: string;
  taskNote: string;
  taskAssignees: string[];
  taskAssignToAll: boolean;
  /** Khi có giá trị: modal công việc ở chế độ chỉnh sửa (PATCH). */
  editingTaskId: string | null;
  aiSummaryLoading: boolean;
  aiSummaryResult: string;
  showContactsManagement: boolean;
  contactsTab: ContactsTabId;
  showAddFriendModal: boolean;
  addFriendQuery: string;
  editingMessage: IMessage | null;
  editDraft: string;
  actionMenuMsgId: string | null;
  messageConfirm: MessageConfirmState;
  messageConfirmSubmitting: boolean;
  /** Xác nhận hủy công việc nhóm (thay window.confirm). */
  taskDeleteConfirm: { taskId: string; title: string } | null;
  /** Hàng subtask trong TaskModal (assigneeId + nội dung). */
  taskSubtaskRows: Array<{ assigneeId: string; content: string }>;
}

export function useChatModalController() {
  const [showInfo, setShowInfo] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024,
  );
  const [showOtherPinnedPanel, setShowOtherPinnedPanel] = useState(false);
  const [showMarkReadModal, setShowMarkReadModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollMultipleChoice, setPollMultipleChoice] = useState(false);
  const [showPollVoteModal, setShowPollVoteModal] = useState(false);
  const [activePollId, setActivePollId] = useState<string | null>(null);
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
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryResult, setAiSummaryResult] = useState('');
  const [showContactsManagement, setShowContactsManagement] = useState(false);
  const [contactsTab, setContactsTab] = useState<ContactsTabId>('friends');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const [editingMessage, setEditingMessage] = useState<IMessage | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [actionMenuMsgId, setActionMenuMsgId] = useState<string | null>(null);
  const [messageConfirm, setMessageConfirm] = useState<MessageConfirmState>(null);
  const [messageConfirmSubmitting, setMessageConfirmSubmitting] = useState(false);
  const [taskDeleteConfirm, setTaskDeleteConfirm] = useState<{
    taskId: string;
    title: string;
  } | null>(null);
  const [taskSubtaskRows, setTaskSubtaskRows] = useState<
    Array<{ assigneeId: string; content: string }>
  >([]);

  const openCreateGroupModal = useCallback(() => {
    setShowCreateGroupModal(true);
    setSelectedGroupMembers([]);
    setGroupName('');
  }, []);

  const closeTaskModal = useCallback(() => {
    setShowTaskModal(false);
    setTaskTitle('');
    setTaskDeadline('');
    setTaskNote('');
    setTaskAssignees([]);
    setTaskSubtaskRows([]);
    setTaskAssignToAll(false);
    setEditingTaskId(null);
    setTaskDeleteConfirm(null);
  }, []);

  const state: ChatModalState = {
    showInfo,
    showOtherPinnedPanel,
    showMarkReadModal,
    showCreateGroupModal,
    selectedGroupMembers,
    groupName,
    showPollModal,
    pollQuestion,
    pollOptions,
    pollMultipleChoice,
    showPollVoteModal,
    activePollId,
    showAddMembersModal,
    showEditGroupModal,
    editGroupName,
    editGroupAvatarFile,
    editGroupAvatarPreview,
    selectedAddMembers,
    showAISummaryModal,
    showTaskModal,
    taskTitle,
    taskDeadline,
    taskNote,
    taskAssignees,
    taskAssignToAll,
    editingTaskId,
    aiSummaryLoading,
    aiSummaryResult,
    showContactsManagement,
    contactsTab,
    showAddFriendModal,
    addFriendQuery,
    editingMessage,
    editDraft,
    actionMenuMsgId,
    taskSubtaskRows,
    messageConfirm,
    messageConfirmSubmitting,
    taskDeleteConfirm,
  };

  const actions = useMemo(
    () => ({
      setShowInfo,
      setShowOtherPinnedPanel,
      setShowMarkReadModal,
      setShowCreateGroupModal,
      setSelectedGroupMembers,
      setGroupName,
      setShowPollModal,
      setPollQuestion,
      setPollOptions,
      setPollMultipleChoice,
      setShowPollVoteModal,
      setActivePollId,
      setShowAddMembersModal,
      setShowEditGroupModal,
      setEditGroupName,
      setEditGroupAvatarFile,
      setEditGroupAvatarPreview,
      setSelectedAddMembers,
      setShowAISummaryModal,
      setShowTaskModal,
      setTaskTitle,
      setTaskDeadline,
      setTaskNote,
      setTaskAssignees,
      setTaskAssignToAll,
      setEditingTaskId,
      setAiSummaryLoading,
      setAiSummaryResult,
      setShowContactsManagement,
      setContactsTab,
      setShowAddFriendModal,
      setAddFriendQuery,
      setEditingMessage,
      setEditDraft,
      setActionMenuMsgId,
      setTaskSubtaskRows,
      setMessageConfirm,
      setMessageConfirmSubmitting,
      setTaskDeleteConfirm,
      openCreateGroupModal,
      closeTaskModal,
    }),
    [openCreateGroupModal, closeTaskModal],
  );

  return { state, actions };
}
