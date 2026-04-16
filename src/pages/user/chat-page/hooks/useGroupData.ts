import { useCallback, useEffect, useState } from 'react';
import { socketService } from '@/services/socket';
import { groupApi } from '@/services/chat/groupApi';
import type { AIRecap, GroupActionLoading, GroupMember, GroupPoll, GroupRequest, GroupTask } from '@/types/chat.group.types';

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
}

export function useGroupData({
  activeConversationId,
  activeConversationType,
  refetchConversations,
}: UseGroupDataParams) {
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupRequests, setGroupRequests] = useState<GroupRequest[]>([]);
  const [groupPolls, setGroupPolls] = useState<GroupPoll[]>([]);
  const [groupTasks, setGroupTasks] = useState<GroupTask[]>([]);
  const [latestRecap, setLatestRecap] = useState<AIRecap | null>(null);
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

  const fetchGroupMembers = useCallback(async (groupId: string) => {
    setGroupLoading((prev) => ({ ...prev, members: true }));
    try {
      const res = await groupApi.getMembers(groupId);
      setGroupMembers(res.data.data ?? []);
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
      const res = await groupApi.getLatestRecap(groupId);
      setLatestRecap(res.data.data ?? null);
    } catch {
      setLatestRecap(null);
    } finally {
      setGroupLoading((prev) => ({ ...prev, recap: false }));
    }
  }, []);

  useEffect(() => {
    if (!activeConversationId || activeConversationType !== 'group') {
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
    activeConversationType,
    fetchGroupMembers,
    fetchGroupRequests,
    fetchGroupPolls,
    fetchGroupTasks,
    fetchLatestRecap,
  ]);

  useEffect(() => {
    if (!activeConversationId || activeConversationType !== 'group') return;

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
    activeConversationType,
    fetchGroupMembers,
    fetchGroupPolls,
    fetchGroupRequests,
    fetchGroupTasks,
    fetchLatestRecap,
    refetchConversations,
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
    fetchLatestRecap,
  };
}
