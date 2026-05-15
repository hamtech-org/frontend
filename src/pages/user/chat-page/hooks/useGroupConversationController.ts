import { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { chatApi } from '@/store/api/chatApi';
import { socketService } from '@/services/socket';
import { groupApi } from '@/services/chat/groupApi';
import { apiClient } from '@/services/api';
import type { IMessage, IConversation } from '@/types/chat.types';
import {
  canUserCreatePollInGroup,
  canUserCreateTaskInGroup,
} from '@/utils/groupConversationPermissions';
import type {
  GroupActionLoading,
  GroupMember,
  GroupPoll,
  GroupTask,
} from '@/types/chat.group.types';
import type { AppDispatch } from '@/store/store';
import { messageReceived } from '@/store/slices/chatSlice';
import {
  applyMessageHiddenForMe,
  patchTaskAssignedSystemMessages,
  hideTaskAssignedCardsForTaskId,
} from '@/store/applyMessageHiddenForMe';
import { isTaskJoinDeadlinePassed } from '@/utils/chatUtils';
import {
  isoUtcToVietnamLocalDatetimeValue,
  parseVietnamLocalDeadlineInput,
} from '@/utils/vietnamDeadline';
import { buildClientMediaDownloadUrl } from '@/utils/mediaUrls';

function deadlineLocalInputToJsonValue(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const d = parseVietnamLocalDeadlineInput(input);
  return d ? d.toISOString() : null;
}

interface UseGroupConversationControllerParams {
  activeConversationId: string | null;
  activeConversation?: IConversation;
  currentUserId: string;
  currentUserDisplayName?: string;
  currentUserRole?: 'owner' | 'admin' | 'member';
  dispatch: AppDispatch;
  uploadMedia: (payload: {
    file: File;
    mediaType: 'image';
    deliveryScope?: 'chat' | 'general';
  }) => {
    unwrap: () => Promise<{ data: { url?: string; mediaId?: string } }>;
  };
  groupState: {
    groupMembers: GroupMember[];
    groupRequests: Array<{ userId: string; avatar?: string; name?: string; requestedAt?: string }>;
    groupPolls: GroupPoll[];
    groupTasks: GroupTask[];
    groupJoinRequested: boolean;
  };
  groupSetters: {
    setGroupMembers: Dispatch<SetStateAction<GroupMember[]>>;
    setGroupRequests: Dispatch<
      SetStateAction<UseGroupConversationControllerParams['groupState']['groupRequests']>
    >;
    setGroupPolls: Dispatch<SetStateAction<GroupPoll[]>>;
    setGroupTasks: Dispatch<SetStateAction<GroupTask[]>>;
    setGroupJoinRequested: Dispatch<SetStateAction<boolean>>;
  };
  groupFetchers: {
    fetchGroupMembers: (groupId: string) => Promise<void>;
    fetchGroupRequests: (groupId: string) => Promise<void>;
    fetchGroupPolls: (groupId: string) => Promise<void>;
    fetchGroupTasks: (groupId: string) => Promise<void>;
  };
  refetchConversations?: () => void;
  modalState: {
    editGroupAvatarPreview: string | null;
    editGroupName: string;
    editGroupAvatarFile: File | null;
    taskTitle: string;
    taskNote: string;
    taskAssignees: string[];
    taskAssignToAll: boolean;
    taskDeadline: string;
    pollQuestion: string;
    pollOptions: string[];
    pollMultipleChoice: boolean;
    selectedAddMembers: string[];
    editingTaskId: string | null;
    taskSubtaskRows: Array<{ assigneeId: string; content: string }>;
    taskDeleteConfirm: { taskId: string; title: string } | null;
  };
  modalActions: {
    setEditGroupName: (value: string) => void;
    setEditGroupAvatarFile: (file: File | null) => void;
    setEditGroupAvatarPreview: (value: string | null) => void;
    setShowEditGroupModal: (value: boolean) => void;
    setSelectedAddMembers: (updater: string[] | ((prev: string[]) => string[])) => void;
    setShowAddMembersModal: (value: boolean) => void;
    closeTaskModal: () => void;
    setShowAISummaryModal: (value: boolean) => void;
    setAiSummaryResult: (value: string) => void;
    setAiSummaryLoading: (value: boolean) => void;
    setShowPollModal: (value: boolean) => void;
    setPollQuestion: (value: string) => void;
    setPollOptions: (value: string[]) => void;
    setPollMultipleChoice: (value: boolean) => void;
    setTaskAssignToAll: (value: boolean) => void;
    setTaskAssignees: (value: string[]) => void;
    setActivePollId: (value: string) => void;
    setShowPollVoteModal: (value: boolean) => void;
    setShowTaskModal: (value: boolean) => void;
    setTaskTitle: (value: string) => void;
    setTaskNote: (value: string) => void;
    setTaskDeadline: (value: string) => void;
    setEditingTaskId: (value: string | null) => void;
    setTaskDeleteConfirm: (value: { taskId: string; title: string } | null) => void;
    setTaskSubtaskRows: (rows: Array<{ assigneeId: string; content: string }>) => void;
  };
  setActionBusy: (key: keyof GroupActionLoading, value: boolean) => void;
  navigate: (path: string, options?: { replace?: boolean }) => void;
}

export function useGroupConversationController({
  activeConversationId,
  activeConversation,
  currentUserId,
  currentUserDisplayName,
  currentUserRole,
  dispatch,
  uploadMedia,
  groupState,
  groupSetters,
  groupFetchers,
  refetchConversations,
  modalState,
  modalActions,
  setActionBusy,
  navigate,
}: UseGroupConversationControllerParams) {
  const { groupMembers, groupRequests, groupPolls, groupTasks, groupJoinRequested } = groupState;
  const { setGroupMembers, setGroupRequests, setGroupPolls, setGroupTasks, setGroupJoinRequested } =
    groupSetters;
  const { fetchGroupMembers, fetchGroupRequests, fetchGroupPolls, fetchGroupTasks } = groupFetchers;
  const {
    editGroupAvatarPreview,
    editGroupName,
    editGroupAvatarFile,
    taskTitle,
    taskNote,
    taskAssignees,
    taskAssignToAll,
    taskDeadline,
    pollQuestion,
    pollOptions,
    pollMultipleChoice,
    editingTaskId,
    taskSubtaskRows,
    taskDeleteConfirm,
  } = modalState;

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
    modalActions.setEditGroupName(activeConversation.name ?? '');
    modalActions.setEditGroupAvatarFile(null);
    modalActions.setEditGroupAvatarPreview(activeConversation.avatar ?? null);
    modalActions.setShowEditGroupModal(true);
  }, [activeConversation, editGroupAvatarPreview, modalActions]);

  const handleEditGroupAvatarFileChange = useCallback(
    (file: File | null) => {
      modalActions.setEditGroupAvatarFile(file);
      if (editGroupAvatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(editGroupAvatarPreview);
      }
      if (file) {
        modalActions.setEditGroupAvatarPreview(URL.createObjectURL(file));
        return;
      }
      modalActions.setEditGroupAvatarPreview(activeConversation?.avatar ?? null);
    },
    [activeConversation?.avatar, editGroupAvatarPreview, modalActions],
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
      try {
        const uploadResult = await uploadMedia({
          file: editGroupAvatarFile,
          mediaType: 'image',
          deliveryScope: 'general',
        }).unwrap();
        const mid = uploadResult.data.mediaId?.trim();
        nextAvatar = mid
          ? buildClientMediaDownloadUrl(mid)
          : (uploadResult.data.url ?? previousAvatar);
      } catch (err) {
        console.error('Avatar upload failed:', err);
        toast.error('Không thể tải lên ảnh đại diện mới');
      }
    }

    dispatch(
      chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
        const conv = draft?.data?.find((item) => item.conversationId === activeConversationId);
        if (!conv) return;
        conv.name = nextName;
        if (nextAvatar) conv.avatar = nextAvatar;
      }),
    );

    try {
      await groupApi.updateGroup(activeConversationId, {
        name: nextName,
        avatar: nextAvatar ?? undefined,
      });
      modalActions.setShowEditGroupModal(false);
      modalActions.setEditGroupAvatarFile(null);
      toast.success('Cập nhật nhóm thành công');
      const now = new Date();
      const content =
        previousName && previousName !== nextName
          ? `Tên nhóm đã đổi từ '${previousName}' thành '${nextName}'`
          : `${currentUserDisplayName || 'Bạn'} đã đổi tên nhóm thành '${nextName}'`;
      const systemMsg: IMessage = {
        messageId: `system-${Date.now()}`,
        conversationId: activeConversationId,
        senderId: 'system',
        senderDisplayName: 'Hệ thống',
        type: 'system' as IMessage['type'],
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
      dispatch(
        chatApi.util.updateQueryData(
          'getMessages',
          { conversationId: activeConversationId },
          (draft) => {
            if (!draft.data) draft.data = [];
            draft.data.push(systemMsg);
          },
        ),
      );
      socketService.emit('message:new', systemMsg);
    } catch (error) {
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          const conv = draft?.data?.find((item) => item.conversationId === activeConversationId);
          if (!conv) return;
          conv.name = previousName ?? conv.name;
          conv.avatar = previousAvatar;
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
    uploadMedia,
    dispatch,
    currentUserDisplayName,
    modalActions,
    setActionBusy,
  ]);

  const handleDeleteGroup = useCallback(async () => {
    if (!activeConversationId) return;
    // Hard guard: only OWNER can disband group.
    const roleFromMembers = groupMembers.find((m) => m.userId === currentUserId)?.role;
    const effectiveRole = (currentUserRole ?? roleFromMembers ?? 'member') as
      | 'owner'
      | 'admin'
      | 'member';
    if (effectiveRole !== 'owner') {
      toast.error('Bạn không có quyền giải tán nhóm');
      return;
    }
    if (!window.confirm('Giải tán nhóm?')) return;
    setActionBusy('deleteGroup', true);
    try {
      await groupApi.deleteGroup(activeConversationId);
      toast.success('Giải tán nhóm thành công');
      void navigate('/chat', { replace: true });
    } catch (error) {
      toast.error('Không thể giải tán nhóm');
      console.error('Failed to delete group:', error);
    } finally {
      setActionBusy('deleteGroup', false);
    }
  }, [activeConversationId, currentUserId, currentUserRole, groupMembers, navigate, setActionBusy]);

  const handleLeaveGroup = useCallback(async () => {
    if (!activeConversationId) return;
    if (!window.confirm('Bạn chắc chắn muốn rời nhóm?')) return;
    setActionBusy('leaveGroup', true);
    try {
      await groupApi.leaveGroup(activeConversationId);
      toast.success('Đã rời nhóm');
      void navigate('/chat', { replace: true });
    } catch (error) {
      toast.error('Không thể rời nhóm');
      console.error('Failed to leave group:', error);
    } finally {
      setActionBusy('leaveGroup', false);
    }
  }, [activeConversationId, navigate, setActionBusy]);

  const openAddMembersModal = useCallback(() => {
    modalActions.setSelectedAddMembers([]);
    if (activeConversationId) void fetchGroupMembers(activeConversationId);
    modalActions.setShowAddMembersModal(true);
  }, [activeConversationId, fetchGroupMembers, modalActions]);

  const handleToggleAddMember = useCallback(
    (userId: string, checked: boolean) => {
      modalActions.setSelectedAddMembers((prev) =>
        checked ? [...prev, userId] : prev.filter((id) => id !== userId),
      );
    },
    [modalActions],
  );

  const handleAddMembers = useCallback(
    async (memberIds: string[]) => {
      if (!activeConversationId || memberIds.length === 0) return;
      setActionBusy('addMembers', true);
      try {
        await groupApi.addMembers(activeConversationId, memberIds);
        toast.success('Đã gửi lời mời vào nhóm');
        await fetchGroupRequests(activeConversationId);
        modalActions.setSelectedAddMembers([]);
        modalActions.setShowAddMembersModal(false);
      } catch (error) {
        const status = (error as Record<string, unknown> & { response?: { status?: number } })
          ?.response?.status;
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
    [activeConversationId, fetchGroupRequests, modalActions, setActionBusy],
  );

  const handleSubmitTask = useCallback(async () => {
    if (!activeConversationId) return;
    if (!taskTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề công việc');
      return;
    }
    if (!taskDeadline?.trim()) {
      toast.error('Vui lòng chọn thời hạn công việc');
      return;
    }
    const isGroupOptIn = Boolean(taskAssignToAll);
    const cleanSubtaskRows = taskSubtaskRows
      .map((r) => ({
        assigneeId: String(r.assigneeId ?? ''),
        content: String(r.content ?? '').trim(),
      }))
      .filter((r) => r.assigneeId && r.content);
    if (!isGroupOptIn && taskAssignees.length === 0) {
      toast.error('Vui lòng chọn người được giao (hoặc chọn “Giao cho cả nhóm”)');
      return;
    }
    const editingId = editingTaskId ? String(editingTaskId) : null;

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
        const prevTaskRow = groupTasks.find((t) => String(t.taskId) === String(editingId)) ?? null;
        const prevDue = String(prevTaskRow?.dueDate ?? '').trim();
        const prevTitle = String(prevTaskRow?.title ?? '').trim();
        const prevDesc = String(prevTaskRow?.description ?? '').trim();
        const dueDateIso = deadlineLocalInputToJsonValue(taskDeadline) ?? undefined;
        await groupApi.patchTask(activeConversationId, editingId, {
          title: taskTitle.trim(),
          description: taskNote.trim(),
          assignees: isGroupOptIn ? [] : taskAssignees,
          assignToAll: isGroupOptIn,
          dueDate: dueDateIso,
          subtasks: cleanSubtaskRows,
        });
        await fetchGroupTasks(activeConversationId);
        const byId = new Map(
          groupMembers.map((m) => [m.userId, m.displayName ?? m.name ?? m.userId]),
        );
        const assigneeLabel =
          cleanSubtaskRows.length > 0
            ? cleanSubtaskRows.map((r) => String(byId.get(r.assigneeId) ?? r.assigneeId)).join(', ')
            : isGroupOptIn
              ? 'Cả nhóm'
              : taskAssignees.map((id) => String(byId.get(id) ?? id)).join(', ') || 'cả nhóm';
        const assigneeUserIds =
          cleanSubtaskRows.length > 0
            ? cleanSubtaskRows.map((r) => String(r.assigneeId))
            : isGroupOptIn
              ? []
              : taskAssignees.map((id) => String(id));
        const assigneesCount = isGroupOptIn ? groupMembers.length : assigneeUserIds.length;
        patchTaskAssignedSystemMessages(dispatch, activeConversationId, editingId, {
          title: taskTitle.trim(),
          dueDate: deadlineLocalInputToJsonValue(taskDeadline),
          note: taskNote.trim() ? taskNote.trim() : null,
          assigneeLabel,
          assignToAll: isGroupOptIn,
          broadcast: isGroupOptIn,
          assigneeUserIds,
          assigneesCount,
        });
        const nextDue = String(dueDateIso ?? '').trim();
        const nextTitle = taskTitle.trim();
        const nextDesc = taskNote.trim();
        const focus =
          prevDue !== nextDue
            ? 'dueDate'
            : prevTitle !== nextTitle
              ? 'title'
              : prevDesc !== nextDesc
                ? 'note'
                : 'card';
        // Server sẽ bắn system message `task_updated`. Tránh bơm local để khỏi bị lặp.
        // `focus` vẫn được dùng để highlight đúng phần khi user bấm “Xem” (đọc từ system payload).
        void focus;
        toast.success('Đã lưu thay đổi');
        modalActions.closeTaskModal();
      } catch (err) {
        const st = (err as Record<string, unknown> & { response?: { status?: number } })?.response
          ?.status;
        toast.error(
          st === 403 ? 'Bạn không có quyền sửa công việc này' : 'Không thể lưu công việc',
        );
        console.error('Failed to patch task:', err);
      } finally {
        setActionBusy('updateTask', false);
      }
      return;
    }

    setActionBusy('createTask', true);
    const dueDateIso = deadlineLocalInputToJsonValue(taskDeadline) ?? undefined;
    const optimisticTask: GroupTask = {
      taskId: `tmp-${Date.now()}`,
      title: taskTitle.trim(),
      description: taskNote.trim(),
      assignees: isGroupOptIn ? [] : taskAssignees,
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
      dueDate: dueDateIso,
      createdAt: new Date().toISOString(),
      creatorId: currentUserId,
      creatorDisplayName: currentUserDisplayName?.trim() ?? null,
    };
    setGroupTasks((prev) => [optimisticTask, ...prev]);
    try {
      const createRes = await groupApi.createTask(activeConversationId, {
        title: taskTitle.trim(),
        description: taskNote.trim(),
        assignees: isGroupOptIn ? [] : taskAssignees,
        assignToAll: isGroupOptIn,
        dueDate: dueDateIso,
        subtasks: cleanSubtaskRows.length > 0 ? cleanSubtaskRows : undefined,
      });
      const ax = createRes as { data?: { data?: { taskId?: string }; taskId?: string } };
      const createdTaskId = ax?.data?.data?.taskId ?? ax?.data?.taskId ?? null;
      toast.success('Đã tạo công việc');
      await fetchGroupTasks(activeConversationId);
      applyMessageHiddenForMe(
        dispatch,
        activeConversationId,
        `local-task-card:${activeConversationId}:${optimisticTask.taskId}`,
      );

      const byId = new Map(
        groupMembers.map((m) => [m.userId, m.displayName ?? m.name ?? m.userId]),
      );
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
            : taskAssignees.map((id) => String(byId.get(id) ?? id)).join(', ') || 'cả nhóm';
      const assigneeUserIds =
        subtasks.length > 0
          ? subtasks.map((s) => String(s.assigneeId))
          : isGroupOptIn
            ? []
            : taskAssignees.map((id) => String(id));
      const assigneesCount = isGroupOptIn ? groupMembers.length : assigneeUserIds.length;
      const content = JSON.stringify({
        kind: 'task_assigned',
        actor: { userId: currentUserId, name: currentUserDisplayName?.trim() ?? 'Bạn' },
        task: {
          taskId: createdTaskId ? String(createdTaskId) : optimisticTask.taskId,
          title: optimisticTask.title,
          dueDate: optimisticTask.dueDate ?? null,
          note: optimisticTask.description?.trim() ? optimisticTask.description.trim() : null,
          assigneeLabel,
          assignToAll: isGroupOptIn,
          broadcast: isGroupOptIn,
          assigneesCount,
          assigneeUserIds,
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
      };
      dispatch(
        chatApi.util.updateQueryData(
          'getMessages',
          { conversationId: activeConversationId },
          (draft) => {
            if (!draft.data) draft.data = [];
            if (!draft.data.some((m) => String(m.messageId) === String(systemMsg.messageId))) {
              draft.data.push(systemMsg);
            }
          },
        ),
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
    taskTitle,
    taskNote,
    taskAssignees,
    taskAssignToAll,
    taskDeadline,
    editingTaskId,
    modalActions,
    fetchGroupTasks,
    setActionBusy,
    dispatch,
    currentUserId,
    currentUserDisplayName,
    groupMembers,
    taskSubtaskRows,
    setGroupTasks,
  ]);

  const handleDeleteGroupTask = useCallback(
    async (taskId: string, opts?: { skipConfirm?: boolean }) => {
      if (!activeConversationId) return;
      const tid = String(taskId);
      const taskRow = groupTasks.find((t) => String(t.taskId) === tid) ?? null;
      const creatorId = String(taskRow?.creatorId ?? '').trim();
      const isCreator = Boolean(currentUserId && creatorId && creatorId === String(currentUserId));
      if (creatorId && !isCreator) {
        toast.error('Chỉ người tạo mới được hủy công việc này');
        return;
      }
      const titleFromBoard = String(taskRow?.title ?? '').trim();
      const titleFromEditor =
        editingTaskId && String(editingTaskId) === tid ? taskTitle.trim() : '';
      const displayTitle = (titleFromEditor || titleFromBoard || 'Công việc').trim();

      if (!opts?.skipConfirm) {
        modalActions.setTaskDeleteConfirm({ taskId: tid, title: displayTitle });
        return;
      }

      setActionBusy('updateTask', true);
      try {
        await groupApi.deleteTask(activeConversationId, tid);
        setGroupTasks((prev) => prev.filter((t) => String(t.taskId) !== tid));
        modalActions.setTaskDeleteConfirm(null);
        if (editingTaskId && String(editingTaskId) === tid) {
          modalActions.closeTaskModal();
        }
        hideTaskAssignedCardsForTaskId(dispatch, activeConversationId, tid);
        // Không toast: chỉ hiển thị system message trong khung chat (task_deleted).
        await fetchGroupTasks(activeConversationId);
      } catch (err) {
        const st = (err as Record<string, unknown> & { response?: { status?: number } })?.response
          ?.status;
        toast.error(
          st === 403 ? 'Bạn không có quyền hủy công việc này' : 'Không thể hủy công việc',
        );
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
      currentUserId,
      modalActions,
      editingTaskId,
      taskTitle,
      setActionBusy,
      setGroupTasks,
      dispatch,
    ],
  );

  const handleConfirmDeleteTask = useCallback(() => {
    const c = taskDeleteConfirm;
    if (!c?.taskId) return;
    void handleDeleteGroupTask(c.taskId, { skipConfirm: true });
  }, [handleDeleteGroupTask, taskDeleteConfirm]);

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
    modalActions.setTaskSubtaskRows(first ? [{ assigneeId: first, content: '' }] : []);
    modalActions.setShowTaskModal(true);
  }, [activeConversation, currentUserRole, groupMembers, modalActions]);

  const openEditTaskFromGroupTask = useCallback(
    (taskId: string) => {
      const task = groupTasks.find((t) => String(t.taskId) === String(taskId));
      if (!task) {
        toast.error('Không tìm thấy công việc');
        return;
      }
      if (String(task.creatorId ?? '') !== String(currentUserId)) {
        toast.error('Chỉ người tạo mới chỉnh sửa được');
        return;
      }
      modalActions.setEditingTaskId(String(task.taskId));
      modalActions.setTaskTitle(String(task.title ?? ''));
      modalActions.setTaskNote(String(task.description ?? ''));
      modalActions.setTaskDeadline(isoUtcToVietnamLocalDatetimeValue(task.dueDate ?? null));
      const assignToAll = Boolean(
        task.assignToAll ||
        task.broadcast ||
        !(Array.isArray(task.assignees) && task.assignees.length > 0),
      );
      modalActions.setTaskAssignToAll(assignToAll);
      modalActions.setTaskAssignees(
        Array.isArray(task.assignees) ? task.assignees.map(String) : [],
      );
      const subs = Array.isArray(task.subtasks) ? task.subtasks : [];
      const first = groupMembers[0]?.userId ?? '';
      if (subs.length > 0) {
        modalActions.setTaskSubtaskRows(
          subs.map((s) => ({
            assigneeId: String(s.assigneeId ?? first),
            content: String(s.content ?? ''),
          })),
        );
      } else {
        modalActions.setTaskSubtaskRows(first ? [{ assigneeId: first, content: '' }] : []);
      }
      modalActions.setShowTaskModal(true);
    },
    [currentUserId, groupMembers, groupTasks, modalActions],
  );

  const handleTaskJoined = useCallback(
    async (taskId: string) => {
      if (!activeConversationId) return;
      const tid = String(taskId);
      const taskRow = groupTasks.find((t) => String(t.taskId) === tid);
      if (taskRow?.dueDate != null && String(taskRow.dueDate).trim() !== '') {
        if (isTaskJoinDeadlinePassed(String(taskRow.dueDate))) {
          toast.error('Đã quá hạn, không thể xác nhận tham gia');
          return;
        }
      }
      const p0 = Array.isArray(taskRow?.participants) ? taskRow!.participants! : [];
      if (p0.map(String).includes(String(currentUserId))) return;

      let didOptimistic = false;
      if (taskRow) {
        didOptimistic = true;
        setGroupTasks((prev) =>
          prev.map((t) => {
            if (String(t.taskId) !== String(taskId)) return t;
            const p = Array.isArray(t.participants) ? t.participants : [];
            if (p.map(String).includes(String(currentUserId))) return t;
            return { ...t, participants: [...p.map(String), String(currentUserId)] };
          }),
        );
      }

      try {
        const res = await groupApi.joinTask(activeConversationId, String(taskId));
        const payload = (res as { data?: { data?: unknown } })?.data?.data as
          | Record<string, unknown>
          | undefined;
        const joinNoticeRaw = payload?.joinNotice as IMessage | undefined;
        const serverParticipants = (() => {
          if (!payload || typeof payload !== 'object') return null;
          const { joinNotice: _jn, ...rest } = payload as Record<string, unknown> & {
            joinNotice?: unknown;
          };
          const id = String((rest as { taskId?: string }).taskId ?? '');
          const sp = (rest as { participants?: unknown }).participants;
          if (id !== tid || !Array.isArray(sp)) return null;
          return sp.map(String);
        })();

        if (serverParticipants) {
          setGroupTasks((prev) =>
            prev.map((t) => {
              if (String(t.taskId) !== tid) return t;
              return { ...t, participants: serverParticipants };
            }),
          );
        }

        const joinNotice = joinNoticeRaw;
        if (
          joinNotice &&
          typeof joinNotice === 'object' &&
          String(joinNotice.messageId ?? '').trim()
        ) {
          const normalized: IMessage = {
            ...joinNotice,
            conversationId: String(activeConversationId),
            type: (joinNotice.type ?? 'system') as IMessage['type'],
          };
          dispatch(
            chatApi.util.updateQueryData(
              'getMessages',
              { conversationId: activeConversationId },
              (draft) => {
                if (!draft.data) draft.data = [];
                const mid = String(normalized.messageId ?? '');
                if (mid && !draft.data.some((m) => String(m.messageId) === mid)) {
                  draft.data.push(normalized);
                }
              },
            ),
          );
          dispatch(messageReceived(normalized));
        }
      } catch (err) {
        if (didOptimistic) {
          setGroupTasks((prev) =>
            prev.map((t) => {
              if (String(t.taskId) !== String(taskId)) return t;
              const p = Array.isArray(t.participants) ? t.participants : [];
              return {
                ...t,
                participants: p.map(String).filter((id) => id !== String(currentUserId)),
              };
            }),
          );
        }
        const st = (err as Record<string, unknown> & { response?: { status?: number } })?.response
          ?.status;
        const msg = String(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '',
        ).trim();
        toast.error(
          st === 403 && msg
            ? msg
            : st === 403
              ? 'Bạn không thể xác nhận tham gia công việc này'
              : 'Không thể tham gia công việc',
        );
        return;
      }

      try {
        await fetchGroupTasks(activeConversationId);
      } catch {
        /* ignore */
      }
    },
    [activeConversationId, currentUserId, dispatch, fetchGroupTasks, groupTasks, setGroupTasks],
  );

  const handleTransferGroupOwner = useCallback(
    async (newOwnerUserId: string) => {
      if (!activeConversationId) return;
      const currentRole = groupMembers.find((m) => m.userId === currentUserId)?.role;
      if (currentRole !== 'owner') {
        toast.error('Chỉ trưởng nhóm mới có thể chuyển quyền');
        return;
      }
      if (!newOwnerUserId?.trim()) return;
      setActionBusy('changeRole', true);
      const before = groupMembers;
      setGroupMembers((prev) =>
        prev.map((m) => {
          // Ensure only ONE owner after transfer.
          if (String(m.userId) === String(newOwnerUserId)) return { ...m, role: 'owner' as const };
          // Demote any existing owners (usually the current owner) to admin.
          if (m.role === 'owner') return { ...m, role: 'admin' as const };
          // Keep others as-is.
          return m;
        }),
      );
      try {
        await groupApi.transferGroupOwnership(activeConversationId, newOwnerUserId, currentUserId);
        toast.success('Trưởng nhóm mới đã được cập nhật');
        void fetchGroupMembers(activeConversationId);
        void refetchConversations?.();
      } catch (err) {
        setGroupMembers(before);
        toast.error('Không thể chuyển quyền. Thử lại hoặc kiểm tra quyền trên máy chủ');
        console.error('Failed to transfer group owner:', err);
        throw err;
      } finally {
        setActionBusy('changeRole', false);
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

  const handleDemoteAdminToMember = useCallback(
    async (userId: string) => {
      if (!activeConversationId) return;
      const currentRole = groupMembers.find((m) => m.userId === currentUserId)?.role;
      if (currentRole !== 'owner') {
        toast.error('Chỉ trưởng nhóm mới có thể đổi vai trò');
        return;
      }
      if (!userId?.trim()) return;
      const target = groupMembers.find((m) => m.userId === userId);
      if (!target) return;
      if (target.role !== 'admin') {
        toast.info('Người này không phải phó nhóm');
        return;
      }

      setActionBusy('changeRole', true);
      const before = groupMembers;
      setGroupMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: 'member' as const } : m)),
      );
      try {
        await groupApi.changeMemberRole(activeConversationId, userId, 'member');
        toast.success('Đã hạ phó nhóm xuống thành viên');
        void fetchGroupMembers(activeConversationId);
        void refetchConversations?.();
      } catch (err) {
        setGroupMembers(before);
        toast.error('Không thể đổi vai trò. Thử lại sau.');
        console.error('Failed to demote admin:', err);
        throw err;
      } finally {
        setActionBusy('changeRole', false);
      }
    },
    [
      activeConversationId,
      groupMembers,
      currentUserId,
      setActionBusy,
      setGroupMembers,
      fetchGroupMembers,
      refetchConversations,
    ],
  );

  const openAISummaryFromPanel = useCallback(async () => {
    modalActions.setShowAISummaryModal(true);
    modalActions.setAiSummaryResult('');
    modalActions.setAiSummaryLoading(true);
    try {
      if (!activeConversationId) return;
      const result = await apiClient.post<{
        success: boolean;
        data: { summary: string; highlights: string[]; model: string; tokensUsed: number };
      }>('/ai/group-summary', {
        conversationId: activeConversationId,
        limit: 40,
      });
      const summary = String(result.data?.data?.summary ?? '').trim();
      const highlights = Array.isArray(result.data?.data?.highlights)
        ? result.data.data.highlights
        : [];

      const summaryBlock = summary
        ? `Tóm tắt\n${summary
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l) => (l.startsWith('-') || l.startsWith('•') ? l : `• ${l}`))
            .join('\n')}`
        : 'Tóm tắt\n• (Chưa có)';

      const highlightsBlock =
        highlights.length > 0
          ? `Điểm nổi bật\n${highlights.map((h) => `• ${String(h).trim()}`).join('\n')}`
          : 'Điểm nổi bật\n• (Không có)';

      modalActions.setAiSummaryResult([summaryBlock, highlightsBlock].join('\n\n'));
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      modalActions.setAiSummaryResult('Không thể tạo tóm tắt vào lúc này.');
    } finally {
      modalActions.setAiSummaryLoading(false);
    }
  }, [activeConversationId, modalActions]);

  const handleRerunAISummary = useCallback(async () => {
    if (!activeConversationId) return;
    modalActions.setAiSummaryResult('');
    modalActions.setAiSummaryLoading(true);
    try {
      const result = await apiClient.post<{
        success: boolean;
        data: { summary: string; highlights: string[]; model: string; tokensUsed: number };
      }>('/ai/group-summary', {
        conversationId: activeConversationId,
        limit: 40,
      });
      const summary = String(result.data?.data?.summary ?? '').trim();
      const highlights = Array.isArray(result.data?.data?.highlights)
        ? result.data.data.highlights
        : [];

      const summaryBlock = summary
        ? `Tóm tắt\n${summary
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l) => (l.startsWith('-') || l.startsWith('•') ? l : `• ${l}`))
            .join('\n')}`
        : 'Tóm tắt\n• (Chưa có)';

      const highlightsBlock =
        highlights.length > 0
          ? `Điểm nổi bật\n${highlights.map((h) => `• ${String(h).trim()}`).join('\n')}`
          : 'Điểm nổi bật\n• (Không có)';

      modalActions.setAiSummaryResult([summaryBlock, highlightsBlock].join('\n\n'));
      toast.success('Đã tạo tóm tắt AI');
    } catch (error) {
      console.error('Failed to rerun AI summary:', error);
      modalActions.setAiSummaryResult('Không thể làm mới tóm tắt.');
      toast.error('Không thể tạo tóm tắt AI');
    } finally {
      modalActions.setAiSummaryLoading(false);
    }
  }, [activeConversationId, modalActions]);

  const handleCreatePoll = useCallback(async () => {
    if (!activeConversationId || !pollQuestion.trim()) return;
    if (
      !canUserCreatePollInGroup({
        conversation: activeConversation,
        userRole: currentUserRole,
      })
    ) {
      toast.error('Nhóm không cho phép thành viên tạo bình chọn.');
      return;
    }
    setActionBusy('createPoll', true);
    const optimisticPoll: GroupPoll = {
      pollId: `tmp-${Date.now()}`,
      question: pollQuestion.trim(),
      options: pollOptions.filter((o) => o.trim()).map((text) => ({ text, voters: [] })),
      createdAt: new Date().toISOString(),
      isClosed: false,
      isMultipleChoice: pollMultipleChoice,
    };
    setGroupPolls((prev) => [optimisticPoll, ...prev]);
    try {
      await groupApi.createPoll(activeConversationId, {
        question: pollQuestion.trim(),
        options: pollOptions.filter((o) => !!o.trim()),
        isMultipleChoice: pollMultipleChoice,
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
    activeConversation,
    activeConversationId,
    currentUserRole,
    pollQuestion,
    pollOptions,
    pollMultipleChoice,
    fetchGroupPolls,
    modalActions,
    setActionBusy,
    setGroupPolls,
  ]);

  const handleRequestJoin = useCallback(async () => {
    if (!activeConversationId || groupJoinRequested) return;
    setActionBusy('requestJoin', true);
    setGroupJoinRequested(true);
    try {
      await groupApi.requestJoin(activeConversationId);
      toast.success('Đã gửi yêu cầu tham gia');
    } catch (error) {
      setGroupJoinRequested(false);
      toast.error('Không thể gửi yêu cầu tham gia');
      console.error('Failed to request join:', error);
    } finally {
      setActionBusy('requestJoin', false);
    }
  }, [activeConversationId, groupJoinRequested, setActionBusy, setGroupJoinRequested]);

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
        await groupApi.addPollOption(activeConversationId, pollId, optionText.trim());
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
    [activeConversationId, groupPolls, fetchGroupPolls, setActionBusy, setGroupPolls],
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
        await groupApi.closePoll(activeConversationId, pollId);
        toast.success('Đã đóng bình chọn');
      } catch (error) {
        setGroupPolls(before);
        toast.error('Không thể đóng bình chọn');
        console.error('Failed to close poll:', error);
      } finally {
        setActionBusy('closePoll', false);
      }
    },
    [activeConversationId, groupPolls, setActionBusy, setGroupPolls],
  );

  const handleApproveRequest = useCallback(
    async (userId: string) => {
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
        await groupApi.approveRequest(activeConversationId, userId);
        toast.success('Đã duyệt yêu cầu');
      } catch (err) {
        setGroupRequests(beforeRequests);
        setGroupMembers(beforeMembers);
        toast.error('Không thể duyệt yêu cầu');
        console.error('Failed to approve request:', err);
      } finally {
        setActionBusy('approveRequest', false);
      }
    },
    [
      activeConversationId,
      currentUserRole,
      groupRequests,
      groupMembers,
      setActionBusy,
      setGroupMembers,
      setGroupRequests,
    ],
  );

  const handleRejectRequest = useCallback(
    async (userId: string) => {
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
        await groupApi.rejectRequest(activeConversationId, userId);
        toast.success('Đã từ chối yêu cầu');
      } catch (err) {
        setGroupRequests(before);
        toast.error('Không thể từ chối yêu cầu');
        console.error('Failed to reject request:', err);
      } finally {
        setActionBusy('rejectRequest', false);
      }
    },
    [activeConversationId, currentUserRole, groupRequests, setActionBusy, setGroupRequests],
  );

  const handleKickMember = useCallback(
    async (userId: string) => {
      if (!activeConversationId) {
        throw Object.assign(new Error('No active conversation'), { response: { status: 400 } });
      }
      const roleFromMembers = groupMembers.find((m) => m.userId === currentUserId)?.role;
      const effectiveRole = (currentUserRole ?? roleFromMembers ?? 'member') as
        | 'owner'
        | 'admin'
        | 'member';
      if (effectiveRole !== 'owner') {
        throw Object.assign(new Error('Forbidden'), { response: { status: 403 } });
      }
      setActionBusy('removeMember', true);
      const before = groupMembers;
      setGroupMembers((prev) => prev.filter((m) => m.userId !== userId));
      try {
        await groupApi.removeMember(activeConversationId, userId);
      } catch (err) {
        setGroupMembers(before);
        console.error('Failed to kick member:', err);
        throw err;
      } finally {
        setActionBusy('removeMember', false);
      }
    },
    [
      activeConversationId,
      currentUserId,
      currentUserRole,
      groupMembers,
      setActionBusy,
      setGroupMembers,
    ],
  );

  const handleVotePoll = useCallback(
    async (pollId: string, optionIndex: number) => {
      if (!activeConversationId) return;
      setActionBusy('votePoll', true);
      const before = groupPolls;
      const pollBefore = groupPolls.find((p) => p.pollId === pollId);
      const hadVotedHereBefore =
        !!pollBefore?.options?.[optionIndex]?.voters?.includes(currentUserId);
      setGroupPolls((prev) =>
        prev.map((poll) => {
          if (poll.pollId !== pollId) return poll;
          const isMultiple = poll.isMultipleChoice === true;
          const nextOptions = poll.options.map((option, index) => {
            const currentVoters = option.voters ?? [];
            const hasVotedHere = currentVoters.includes(currentUserId);
            if (!isMultiple) {
              if (index === optionIndex) {
                return hasVotedHere
                  ? { ...option, voters: currentVoters.filter((id) => id !== currentUserId) }
                  : { ...option, voters: [...currentVoters, currentUserId] };
              }
              return { ...option, voters: currentVoters.filter((id) => id !== currentUserId) };
            }
            if (index === optionIndex) {
              return hasVotedHere
                ? { ...option, voters: currentVoters.filter((id) => id !== currentUserId) }
                : { ...option, voters: [...currentVoters, currentUserId] };
            }
            return option;
          });
          return { ...poll, options: nextOptions };
        }),
      );
      try {
        if (hadVotedHereBefore) {
          await groupApi.unvotePoll(activeConversationId, pollId, optionIndex);
        } else {
          await groupApi.votePoll(activeConversationId, pollId, optionIndex);
        }
      } catch (error) {
        setGroupPolls(before);
        toast.error('Không thể bình chọn');
        console.error('Failed to vote poll:', error);
      } finally {
        setActionBusy('votePoll', false);
      }
    },
    [activeConversationId, groupPolls, currentUserId, setActionBusy, setGroupPolls],
  );

  const openPollVoteModal = useCallback(
    (pollId: string) => {
      modalActions.setActivePollId(pollId);
      modalActions.setShowPollVoteModal(true);
    },
    [modalActions],
  );

  const handleToggleTaskStatus = useCallback(
    async (taskId: string) => {
      if (!activeConversationId) return;
      setActionBusy('updateTask', true);
      const before = groupTasks;
      const currentTask = groupTasks.find((task) => task.taskId === taskId);
      if (!currentTask) return;
      const nextStatus: GroupTask['status'] = currentTask.status === 'done' ? 'todo' : 'done';
      setGroupTasks((prev) =>
        prev.map((task) => (task.taskId === taskId ? { ...task, status: nextStatus } : task)),
      );
      try {
        await groupApi.updateTaskStatus(activeConversationId, taskId, nextStatus);

        // Fallback optimistic system message (in case socket misses).
        try {
          const nowIso = new Date().toISOString();
          const payload = {
            kind: 'task_updated',
            task: { taskId: String(taskId), title: String(currentTask.title ?? '').trim() },
            actor: {
              userId: currentUserId,
              name: String(currentUserDisplayName ?? 'Ai đó'),
            },
            createdAt: nowIso,
          };
          const systemMsg: IMessage = {
            messageId: `local-task-updated:${activeConversationId}:${taskId}:${Date.now()}`,
            conversationId: activeConversationId,
            senderId: currentUserId,
            senderDisplayName: currentUserDisplayName ?? null,
            type: 'system',
            content: JSON.stringify(payload),
            mediaUrl: null,
            thumbnailUrl: null,
            replyTo: null,
            isPinned: false,
            isEdited: false,
            isRecalled: false,
            reactions: {},
            createdAt: nowIso,
          } as any;

          dispatch(messageReceived(systemMsg));
          dispatch(
            chatApi.util.updateQueryData(
              'getMessages',
              { conversationId: activeConversationId },
              (draft) => {
                if (!draft?.data) return;
                if (draft.data.some((m) => String(m.messageId) === String(systemMsg.messageId)))
                  return;
                draft.data.push(systemMsg);
                draft.data.sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                );
              },
            ),
          );
        } catch {
          /* ignore */
        }
      } catch (error) {
        setGroupTasks(before);
        toast.error('Không thể cập nhật công việc');
        console.error('Failed to update task:', error);
      } finally {
        setActionBusy('updateTask', false);
      }
    },
    [
      activeConversationId,
      currentUserDisplayName,
      currentUserId,
      dispatch,
      groupTasks,
      setActionBusy,
      setGroupTasks,
    ],
  );

  return useMemo(
    () => ({
      openEditGroupModal,
      handleEditGroupAvatarFileChange,
      handleUpdateGroup,
      handleDeleteGroup,
      handleLeaveGroup,
      openAddMembersModal,
      handleToggleAddMember,
      handleAddMembers,
      handleSubmitTask,
      handleDeleteGroupTask,
      handleConfirmDeleteTask,
      openCreateTaskModal,
      openEditTaskFromGroupTask,
      handleTaskJoined,
      handleTransferGroupOwner,
      handleDemoteAdminToMember,
      openAISummaryFromPanel,
      handleRerunAISummary,
      handleCreatePoll,
      handleRequestJoin,
      handleAddPollOption,
      handleClosePoll,
      handleApproveRequest,
      handleRejectRequest,
      handleKickMember,
      handleVotePoll,
      openPollVoteModal,
      handleToggleTaskStatus,
    }),
    [
      openEditGroupModal,
      handleEditGroupAvatarFileChange,
      handleUpdateGroup,
      handleDeleteGroup,
      handleLeaveGroup,
      openAddMembersModal,
      handleToggleAddMember,
      handleAddMembers,
      handleSubmitTask,
      handleDeleteGroupTask,
      handleConfirmDeleteTask,
      openCreateTaskModal,
      openEditTaskFromGroupTask,
      handleTaskJoined,
      handleTransferGroupOwner,
      handleDemoteAdminToMember,
      openAISummaryFromPanel,
      handleRerunAISummary,
      handleCreatePoll,
      handleRequestJoin,
      handleAddPollOption,
      handleClosePoll,
      handleApproveRequest,
      handleRejectRequest,
      handleKickMember,
      handleVotePoll,
      openPollVoteModal,
      handleToggleTaskStatus,
    ],
  );
}
