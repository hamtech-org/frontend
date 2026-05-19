import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { socketService } from '@/services/socket';
import { groupApi } from '@/services/chat/groupApi';
import { resetRemovedGroupMembersRealtime } from '@/store/slices/chatSlice';
import type { AppDispatch } from '@/store/store';
import { filterGroupMembersExcludingRemoved } from '@/utils/groupMembersRealtime';
import { syncAssignToAllGroupTasksWithMembers } from '@/utils/syncAssignToAllGroupTasks';
import type {
  GroupActionLoading,
  GroupMember,
  GroupPoll,
  GroupRequest,
  GroupTask,
} from '@/types/chat.group.types';
import type { RootState } from '@/store/store';

type GroupLoadingState = {
  members: boolean;
  requests: boolean;
  polls: boolean;
  tasks: boolean;
  recap: boolean;
};

type GroupEventPayload = {
  groupId?: string;
  conversationId?: string;
};

interface UseGroupDataParams {
  activeConversationId: string | null;
  activeConversationType?: string;
  refetchConversations: () => Promise<unknown>;
  /** Khi false, không đăng ký socket (socketService.on bỏ qua nếu chưa connect — tránh mất listener). */
  isSocketReady?: boolean;
}

export function useGroupData({
  activeConversationId,
  activeConversationType,
  refetchConversations,
  isSocketReady = false,
}: UseGroupDataParams) {
  const dispatch = useDispatch<AppDispatch>();
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const groupMembersRef = useRef<GroupMember[]>([]);
  groupMembersRef.current = groupMembers;
  const [groupRequests, setGroupRequests] = useState<GroupRequest[]>([]);
  const [groupPolls, setGroupPolls] = useState<GroupPoll[]>([]);
  const [groupTasks, setGroupTasks] = useState<GroupTask[]>([]);
  const [groupJoinRequested, setGroupJoinRequested] = useState(false);
  const [groupLoading, setGroupLoading] = useState<GroupLoadingState>({
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

  const setActionBusy = useCallback((key: keyof GroupActionLoading, value: boolean) => {
    setGroupActionLoading((prev) => ({ ...prev, [key]: value }));
  }, []);

  const groupBoardTick = useSelector((state: RootState) =>
    activeConversationId
      ? (state.chat.groupBoardRefreshTickByConversationId[activeConversationId] ?? 0)
      : 0,
  );

  const removedMemberIdsForActive = useSelector((state: RootState) =>
    activeConversationId
      ? (state.chat.removedGroupMemberIdsByConversationId[activeConversationId] ?? [])
      : [],
  );

  const fetchGroupMembers = useCallback(
    async (groupId: string, _options?: { force?: boolean }): Promise<GroupMember[]> => {
      setGroupLoading((prev) => ({ ...prev, members: true }));
      try {
        const res = await groupApi.getMembers(groupId);
        const members = filterGroupMembersExcludingRemoved(groupId, res.data.data ?? []);
        setGroupMembers(members);
        return members;
      } catch (err) {
        console.error('[fetchGroupMembers] Error:', err);
        setGroupMembers([]);
        return [];
      } finally {
        setGroupLoading((prev) => ({ ...prev, members: false }));
      }
    },
    [],
  );

  const fetchGroupRequests = useCallback(async (groupId: string) => {
    setGroupLoading((prev) => ({ ...prev, requests: true }));
    try {
      const res = await groupApi.getRequests(groupId);
      setGroupRequests(res.data.data ?? []);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 403) {
        console.error('[fetchGroupRequests] Error:', err);
      }
      setGroupRequests([]);
    } finally {
      setGroupLoading((prev) => ({ ...prev, requests: false }));
    }
  }, []);

  const fetchGroupPolls = useCallback(async (groupId: string) => {
    setGroupLoading((prev) => ({ ...prev, polls: true }));
    try {
      const res = await groupApi.getPolls(groupId);
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
      const res = await groupApi.getTasks(groupId);
      const next = (res.data.data ?? []) as GroupTask[];
      setGroupTasks((prev) => {
        const prevById = new Map(prev.map((t) => [String(t.taskId), t]));
        const merged = next.map((t) => {
          const p = prevById.get(String(t.taskId));
          const serverAssignees = (t as { assignees?: string[] }).assignees;
          const assignees = Array.isArray(serverAssignees)
            ? serverAssignees.map(String)
            : Array.isArray(p?.assignees)
              ? p.assignees.map(String)
              : [];
          const serverParticipants = (t as { participants?: string[] }).participants;
          const participants = Array.isArray(serverParticipants)
            ? serverParticipants.map(String)
            : Array.isArray(p?.participants) && p.participants.length > 0
              ? p.participants.map(String)
              : [];
          const serverAssignToAll = Boolean((t as GroupTask).assignToAll);
          const serverBroadcast = Boolean((t as GroupTask).broadcast);
          return {
            ...t,
            assignees,
            assignToAll: serverAssignToAll,
            broadcast: serverBroadcast,
            ...(Array.isArray(participants) ? { participants } : {}),
            ...(p?.creatorId ? { creatorId: p.creatorId } : {}),
            ...(p?.creatorDisplayName ? { creatorDisplayName: p.creatorDisplayName } : {}),
            ...(p?.createdAt ? { createdAt: p.createdAt } : {}),
          };
        });
        return syncAssignToAllGroupTasksWithMembers(merged, groupMembersRef.current);
      });
    } catch (err) {
      console.error('[fetchGroupTasks] Error:', err);
      setGroupTasks([]);
    } finally {
      setGroupLoading((prev) => ({ ...prev, tasks: false }));
    }
  }, []);

  const fetchLatestRecap = useCallback(async (groupId: string) => {
    // Recap endpoint đã được chuyển sang `/api/v1/ai/group-summary` (module AI).
    // Giữ function để không vỡ call sites cũ, nhưng không fetch dữ liệu nữa.
    void groupId;
    setGroupLoading((prev) => ({ ...prev, recap: false }));
  }, []);

  useEffect(() => {
    if (!activeConversationId || activeConversationType !== 'group') {
      setGroupMembers([]);
      setGroupRequests([]);
      setGroupPolls([]);
      setGroupTasks([]);
      setGroupJoinRequested(false);
      return;
    }

    dispatch(resetRemovedGroupMembersRealtime(activeConversationId));

    void Promise.all([
      fetchGroupMembers(activeConversationId),
      fetchGroupRequests(activeConversationId),
      fetchGroupPolls(activeConversationId),
      fetchGroupTasks(activeConversationId),
    ]);
  }, [
    activeConversationId,
    activeConversationType,
    dispatch,
    fetchGroupMembers,
    fetchGroupRequests,
    fetchGroupPolls,
    fetchGroupTasks,
  ]);

  useEffect(() => {
    if (!activeConversationId || activeConversationType !== 'group') return;
    if (removedMemberIdsForActive.length === 0) return;
    setGroupMembers((prev) => filterGroupMembersExcludingRemoved(activeConversationId, prev));
  }, [activeConversationId, activeConversationType, removedMemberIdsForActive]);

  /** Task «giao cả nhóm» (kể cả task tạo từ đầu): đồng bộ assignees khi member đổi. */
  useEffect(() => {
    if (!activeConversationId || activeConversationType !== 'group') return;
    if (groupMembers.length === 0) return;
    setGroupTasks((prev) => syncAssignToAllGroupTasksWithMembers(prev, groupMembers));
  }, [groupMembers, activeConversationId, activeConversationType]);

  useEffect(() => {
    if (!activeConversationId || activeConversationType !== 'group') return;
    if (!isSocketReady) return;

    const handleGroupProfileUpdated = (data: unknown) => {
      const payload = data as GroupEventPayload & { memberCount?: number };
      if ((payload.groupId ?? payload.conversationId) !== activeConversationId) return;
      if (typeof payload.memberCount !== 'number') return;
      void fetchGroupMembers(activeConversationId);
      void fetchGroupTasks(activeConversationId);
    };

    const isCurrentGroup = (data: unknown): boolean => {
      const payload = data as GroupEventPayload;
      return (payload.groupId ?? payload.conversationId) === activeConversationId;
    };

    const refreshRequests = () => {
      void fetchGroupRequests(activeConversationId);
      void refetchConversations();
    };

    const handleMemberChanged = (data: unknown) => {
      if (!isCurrentGroup(data)) return;
      void fetchGroupMembers(activeConversationId);
      void fetchGroupTasks(activeConversationId);
    };

    const handleTaskChanged = (data: unknown) => {
      if (!isCurrentGroup(data)) return;
      void fetchGroupTasks(activeConversationId);
    };

    const handleRequestsChanged = (data: unknown) => {
      if (!isCurrentGroup(data)) return;
      refreshRequests();
    };

    const handlePollChanged = (data: unknown) => {
      if (!isCurrentGroup(data)) return;
      void fetchGroupPolls(activeConversationId);
    };

    const handleRecapChanged = (data: unknown) => {
      if (!isCurrentGroup(data)) return;
      void fetchLatestRecap(activeConversationId);
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
    socketService.on('group:task_deleted', handleTaskChanged);
    socketService.on('group:recap_new', handleRecapChanged);
    socketService.on('group:updated', handleGroupProfileUpdated);

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
      socketService.off('group:task_deleted', handleTaskChanged);
      socketService.off('group:recap_new', handleRecapChanged);
      socketService.off('group:updated', handleGroupProfileUpdated);
    };
  }, [
    activeConversationId,
    activeConversationType,
    isSocketReady,
    fetchGroupMembers,
    fetchGroupPolls,
    fetchGroupRequests,
    fetchGroupTasks,
    fetchLatestRecap,
    refetchConversations,
  ]);

  useEffect(() => {
    if (!activeConversationId || activeConversationType !== 'group') return;
    if (groupBoardTick <= 0) return;
    void Promise.all([
      fetchGroupMembers(activeConversationId),
      fetchGroupRequests(activeConversationId),
      fetchGroupPolls(activeConversationId),
      fetchGroupTasks(activeConversationId),
    ]);
  }, [
    groupBoardTick,
    activeConversationId,
    activeConversationType,
    fetchGroupMembers,
    fetchGroupRequests,
    fetchGroupPolls,
    fetchGroupTasks,
  ]);

  return {
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
    fetchLatestRecap,
  };
}
