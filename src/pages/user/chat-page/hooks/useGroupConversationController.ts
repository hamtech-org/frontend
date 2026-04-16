import { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { chatApi } from '@/store/api/chatApi';
import { socketService } from '@/services/socket';
import { groupApi } from '@/services/chat/groupApi';
import type { IMessage, IConversation } from '@/types/chat.types';
import type { AIRecap, GroupActionLoading, GroupPoll, GroupTask } from '@/types/chat.group.types';
import type { AppDispatch } from '@/store/store';

interface UseGroupConversationControllerParams {
  activeConversationId: string | null;
  activeConversation?: IConversation;
  currentUserId: string;
  currentUserDisplayName?: string;
  currentUserRole?: 'owner' | 'admin' | 'member';
  dispatch: AppDispatch;
  uploadMedia: (payload: { file: File; mediaType: 'image' }) => { unwrap: () => Promise<{ data: { url?: string } }> };
  groupState: {
    groupMembers: Array<{ userId: string; name?: string; avatar?: string; role: 'owner' | 'admin' | 'member'; joinedAt?: string }>;
    groupRequests: Array<{ userId: string; avatar?: string; name?: string; requestedAt?: string }>;
    groupPolls: GroupPoll[];
    groupTasks: GroupTask[];
    groupJoinRequested: boolean;
    latestRecap: AIRecap | null;
  };
  groupSetters: {
    setGroupMembers: Dispatch<SetStateAction<UseGroupConversationControllerParams['groupState']['groupMembers']>>;
    setGroupRequests: Dispatch<SetStateAction<UseGroupConversationControllerParams['groupState']['groupRequests']>>;
    setGroupPolls: Dispatch<SetStateAction<GroupPoll[]>>;
    setGroupTasks: Dispatch<SetStateAction<GroupTask[]>>;
    setGroupJoinRequested: Dispatch<SetStateAction<boolean>>;
    setLatestRecap: Dispatch<SetStateAction<AIRecap | null>>;
  };
  groupFetchers: {
    fetchGroupMembers: (groupId: string) => Promise<void>;
    fetchGroupRequests: (groupId: string) => Promise<void>;
    fetchGroupPolls: (groupId: string) => Promise<void>;
    fetchGroupTasks: (groupId: string) => Promise<void>;
  };
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
  modalState,
  modalActions,
  setActionBusy,
  navigate,
}: UseGroupConversationControllerParams) {
  const {
    groupMembers,
    groupRequests,
    groupPolls,
    groupTasks,
    groupJoinRequested,
    latestRecap,
  } = groupState;
  const { setGroupMembers, setGroupRequests, setGroupPolls, setGroupTasks, setGroupJoinRequested, setLatestRecap } = groupSetters;
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

  const handleEditGroupAvatarFileChange = useCallback((file: File | null) => {
    modalActions.setEditGroupAvatarFile(file);
    if (editGroupAvatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(editGroupAvatarPreview);
    }
    if (file) {
      modalActions.setEditGroupAvatarPreview(URL.createObjectURL(file));
      return;
    }
    modalActions.setEditGroupAvatarPreview(activeConversation?.avatar ?? null);
  }, [activeConversation?.avatar, editGroupAvatarPreview, modalActions]);

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
        const uploadResult = await uploadMedia({ file: editGroupAvatarFile, mediaType: 'image' }).unwrap();
        nextAvatar = uploadResult.data.url ?? previousAvatar;
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
      await groupApi.updateGroup(activeConversationId, { name: nextName, avatar: nextAvatar ?? undefined });
      modalActions.setShowEditGroupModal(false);
      modalActions.setEditGroupAvatarFile(null);
      toast.success('Cập nhật nhóm thành công');
      const now = new Date();
      const content = previousName && previousName !== nextName
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
        chatApi.util.updateQueryData('getMessages', { conversationId: activeConversationId }, (draft) => {
          if (!draft.data) draft.data = [];
          draft.data.push(systemMsg);
        }),
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
    if (currentUserRole !== 'owner') {
      toast.error('Chỉ Trưởng nhóm mới có quyền giải tán nhóm');
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
  }, [activeConversationId, currentUserRole, navigate, setActionBusy]);

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

  const handleToggleAddMember = useCallback((userId: string, checked: boolean) => {
    modalActions.setSelectedAddMembers((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)));
  }, [modalActions]);

  const handleAddMembers = useCallback(async (memberIds: string[]) => {
    if (!activeConversationId || memberIds.length === 0) return;
    setActionBusy('addMembers', true);
    try {
      await groupApi.addMembers(activeConversationId, memberIds);
      toast.success('Đã gửi lời mời vào nhóm');
      await fetchGroupRequests(activeConversationId);
      modalActions.setSelectedAddMembers([]);
      modalActions.setShowAddMembersModal(false);
    } catch (error) {
      const status = (error as Record<string, unknown> & { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        toast.error('Bạn không có quyền mời thành viên');
      } else {
        toast.error('Không thể gửi lời mời');
      }
      console.error('Failed to add members:', error);
    } finally {
      setActionBusy('addMembers', false);
    }
  }, [activeConversationId, fetchGroupRequests, modalActions, setActionBusy]);

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
      await groupApi.createTask(activeConversationId, {
        title: taskTitle.trim(),
        description: taskNote.trim(),
        assignees: taskAssignees,
        assignToAll: taskAssignToAll,
        dueDate: taskDeadline || undefined,
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
    taskTitle,
    taskNote,
    taskAssignees,
    taskAssignToAll,
    taskDeadline,
    fetchGroupTasks,
    modalActions,
    setActionBusy,
    setGroupTasks,
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
      const result = await groupApi.generateRecap(activeConversationId);
      setLatestRecap(result.data.data);
      modalActions.setAiSummaryResult(result.data.data?.content ?? '');
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      modalActions.setAiSummaryResult('Không thể tạo tóm tắt vào lúc này.');
    } finally {
      modalActions.setAiSummaryLoading(false);
    }
  }, [activeConversationId, latestRecap, modalActions, setLatestRecap]);

  const handleRerunAISummary = useCallback(async () => {
    if (!activeConversationId) return;
    modalActions.setAiSummaryResult('');
    modalActions.setAiSummaryLoading(true);
    try {
      const result = await groupApi.generateRecap(activeConversationId);
      setLatestRecap(result.data.data);
      modalActions.setAiSummaryResult(result.data.data?.content ?? '');
      toast.success('Đã tạo AI recap');
    } catch (error) {
      console.error('Failed to rerun AI summary:', error);
      modalActions.setAiSummaryResult('Không thể làm mới tóm tắt.');
      toast.error('Không thể tạo AI recap');
    } finally {
      modalActions.setAiSummaryLoading(false);
    }
  }, [activeConversationId, modalActions, setLatestRecap]);

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
    activeConversationId,
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

  const handleAddPollOption = useCallback(async (pollId: string) => {
    if (!activeConversationId) return;
    const optionText = window.prompt('Nhập lựa chọn mới');
    if (!optionText?.trim()) return;
    setActionBusy('addPollOption', true);
    const before = groupPolls;
    setGroupPolls((prev) =>
      prev.map((poll) =>
        poll.pollId === pollId ? { ...poll, options: [...poll.options, { text: optionText.trim(), voters: [] }] } : poll,
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
  }, [activeConversationId, groupPolls, fetchGroupPolls, setActionBusy, setGroupPolls]);

  const handleClosePoll = useCallback(async (pollId: string) => {
    if (!activeConversationId) return;
    setActionBusy('closePoll', true);
    const before = groupPolls;
    setGroupPolls((prev) => prev.map((poll) => (poll.pollId === pollId ? { ...poll, isClosed: true } : poll)));
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
  }, [activeConversationId, groupPolls, setActionBusy, setGroupPolls]);

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
      setGroupMembers((prev) => [...prev, { userId: targetRequest.userId, name: targetRequest.name, avatar: targetRequest.avatar, role: 'member', joinedAt: new Date().toISOString() }]);
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
  }, [activeConversationId, currentUserRole, groupRequests, groupMembers, setActionBusy, setGroupMembers, setGroupRequests]);

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
      await groupApi.rejectRequest(activeConversationId, userId);
      toast.success('Đã từ chối yêu cầu');
    } catch (err) {
      setGroupRequests(before);
      toast.error('Không thể từ chối yêu cầu');
      console.error('Failed to reject request:', err);
    } finally {
      setActionBusy('rejectRequest', false);
    }
  }, [activeConversationId, currentUserRole, groupRequests, setActionBusy, setGroupRequests]);

  const handleKickMember = useCallback(async (userId: string) => {
    if (!activeConversationId) return;
    const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';
    if (!isAdminOrOwner) {
      toast.error('Bạn không có quyền mời thành viên ra khỏi nhóm');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn mời người này ra khỏi nhóm?')) return;
    setActionBusy('removeMember', true);
    const before = groupMembers;
    setGroupMembers((prev) => prev.filter((m) => m.userId !== userId));
    try {
      await groupApi.removeMember(activeConversationId, userId);
      toast.success('Đã xóa thành viên');
    } catch (err) {
      setGroupMembers(before);
      toast.error('Không thể xóa thành viên');
      console.error('Failed to kick member:', err);
    } finally {
      setActionBusy('removeMember', false);
    }
  }, [activeConversationId, currentUserRole, groupMembers, setActionBusy, setGroupMembers]);

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
  }, [activeConversationId, groupPolls, currentUserId, setActionBusy, setGroupPolls]);

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
      await groupApi.updateTaskStatus(activeConversationId, taskId, nextStatus);
    } catch (error) {
      setGroupTasks(before);
      toast.error('Không thể cập nhật công việc');
      console.error('Failed to update task:', error);
    } finally {
      setActionBusy('updateTask', false);
    }
  }, [activeConversationId, groupTasks, setActionBusy, setGroupTasks]);

  return useMemo(() => ({
    openEditGroupModal,
    handleEditGroupAvatarFileChange,
    handleUpdateGroup,
    handleDeleteGroup,
    handleLeaveGroup,
    openAddMembersModal,
    handleToggleAddMember,
    handleAddMembers,
    handleSubmitTask,
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
  }), [
    openEditGroupModal,
    handleEditGroupAvatarFileChange,
    handleUpdateGroup,
    handleDeleteGroup,
    handleLeaveGroup,
    openAddMembersModal,
    handleToggleAddMember,
    handleAddMembers,
    handleSubmitTask,
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
  ]);
}
