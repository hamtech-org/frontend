import { useCallback, useEffect, useRef, useState } from 'react';
import { socketService } from '@/services/socket';
import type { IMessage } from '@/types/chat.types';

export type ChatFrameNoticeVariant = 'poll' | 'task_assigned' | 'task_joined';

export type ChatFrameNotice = {
  text: string;
  atIso: string;
  variant?: ChatFrameNoticeVariant;
  onClick?: () => void;
};

interface UseChatGroupFrameNoticesParams {
  isConnected: boolean;
  activeConversationId: string | null;
  fetchGroupMembers: (groupId: string) => Promise<void>;
  fetchGroupRequests: (groupId: string) => Promise<void>;
  fetchGroupPolls: (groupId: string) => Promise<void>;
  fetchGroupTasks: (groupId: string) => Promise<void>;
  setActivePollId: (id: string) => void;
  setShowPollVoteModal: (open: boolean) => void;
}

/**
 * Banner trong khung chat + lắng nghe socket nhóm bổ sung (HEAD):
 * thông báo poll/task khi đang mở đúng hội thoại, làm mới board nhóm theo sự kiện realtime.
 */
export function useChatGroupFrameNotices({
  isConnected,
  activeConversationId,
  fetchGroupMembers,
  fetchGroupRequests,
  fetchGroupPolls,
  fetchGroupTasks,
  setActivePollId,
  setShowPollVoteModal,
}: UseChatGroupFrameNoticesParams) {
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const [chatFrameNotice, setChatFrameNotice] = useState<ChatFrameNotice | null>(null);
  const chatFrameNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatFrameNoticeDedupeRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const showChatFrameNotice = useCallback(
    (
      text: string,
      opts?: {
        atIso?: string;
        onClick?: () => void;
        ttlMs?: number;
        variant?: ChatFrameNoticeVariant;
      },
    ) => {
      const atIso = opts?.atIso ?? new Date().toISOString();
      setChatFrameNotice({ text, atIso, onClick: opts?.onClick, variant: opts?.variant });
      if (chatFrameNoticeTimerRef.current) clearTimeout(chatFrameNoticeTimerRef.current);
      chatFrameNoticeTimerRef.current = setTimeout(
        () => setChatFrameNotice(null),
        opts?.ttlMs ?? 7000,
      );
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
        variant?: ChatFrameNoticeVariant;
        dedupeMs?: number;
      },
    ) => {
      const now = Date.now();
      const dedupeMs = opts?.dedupeMs ?? 2500;
      const last = chatFrameNoticeDedupeRef.current.get(key) ?? 0;
      if (now - last < dedupeMs) return;
      chatFrameNoticeDedupeRef.current.set(key, now);
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

  useEffect(() => {
    if (!isConnected) return;
    const onPollSystemMessage = (data: unknown) => {
      const msg = data as IMessage;
      try {
        if (
          msg.conversationId !== activeConversationIdRef.current ||
          (msg as { type?: string }).type !== 'system'
        ) {
          return;
        }
        const raw = String(msg.content ?? '').trim();
        if (!raw.startsWith('{')) return;
        const obj = JSON.parse(raw) as {
          kind?: string;
          poll?: { pollId?: string; question?: string };
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
              setActivePollId(pollId);
              setShowPollVoteModal(true);
            },
          });
          return;
        }

        if (
          kind === 'task_assigned' ||
          kind === 'task_joined' ||
          kind === 'task_updated' ||
          kind === 'task_deleted'
        ) {
          void fetchGroupTasks(msg.conversationId);
        }
      } catch {
        /* ignore */
      }
    };
    socketService.on('message:new', onPollSystemMessage);
    return () => {
      socketService.off('message:new', onPollSystemMessage);
    };
  }, [isConnected, showChatFrameNotice, fetchGroupTasks, setActivePollId, setShowPollVoteModal]);

  useEffect(() => {
    if (!isConnected) return;

    const isActive = (payload: unknown): boolean => {
      const p = payload as { conversationId?: string; groupId?: string };
      const cid = String(p?.conversationId ?? p?.groupId ?? '').trim();
      return Boolean(cid && cid === String(activeConversationIdRef.current ?? ''));
    };

    const onGroupUpdated = (data: unknown) => {
      if (!isActive(data)) return;
      const d = data as { name?: string };
      const name = String(d?.name ?? '').trim();
      dedupedNotice(
        `group:updated:${String(activeConversationIdRef.current)}`,
        name ? `Nhóm đã cập nhật: ${name}` : 'Nhóm đã cập nhật thông tin',
        { variant: 'task_assigned' },
      );
      void fetchGroupMembers(String(activeConversationIdRef.current));
    };

    const onSettingsUpdated = (data: unknown) => {
      if (!isActive(data)) return;
      dedupedNotice(
        `group:settings:${String(activeConversationIdRef.current)}`,
        'Cài đặt nhóm đã thay đổi',
        {
          variant: 'task_assigned',
        },
      );
    };

    const onRoleChanged = (data: unknown) => {
      if (!isActive(data)) return;
      const d = data as { userId?: string };
      dedupedNotice(`group:role:${String(d?.userId ?? '')}`, 'Vai trò thành viên đã thay đổi', {
        variant: 'task_assigned',
      });
      void fetchGroupMembers(String(activeConversationIdRef.current));
    };

    const onMemberJoined = (data: unknown) => {
      if (!isActive(data)) return;
      const d = data as { userId?: string };
      dedupedNotice(
        `group:member_joined:${String(d?.userId ?? '')}`,
        'Có thành viên mới tham gia nhóm',
        {
          variant: 'task_assigned',
        },
      );
      void fetchGroupMembers(String(activeConversationIdRef.current));
    };

    const onMemberLeft = (data: unknown) => {
      if (!isActive(data)) return;
      const d = data as { userId?: string };
      dedupedNotice(`group:member_left:${String(d?.userId ?? '')}`, 'Một thành viên vừa rời nhóm', {
        variant: 'task_assigned',
      });
      void fetchGroupMembers(String(activeConversationIdRef.current));
    };

    const onMemberRemoved = (data: unknown) => {
      if (!isActive(data)) return;
      const d = data as { userId?: string };
      dedupedNotice(
        `group:member_removed:${String(d?.userId ?? '')}`,
        'Một thành viên đã bị xóa khỏi nhóm',
        {
          variant: 'task_assigned',
        },
      );
      void fetchGroupMembers(String(activeConversationIdRef.current));
    };

    const onJoinRequestNew = (data: unknown) => {
      if (!isActive(data)) return;
      dedupedNotice(
        `group:join_req_new:${String(activeConversationIdRef.current)}`,
        'Có yêu cầu tham gia nhóm mới',
        {
          variant: 'task_assigned',
        },
      );
      void fetchGroupRequests(String(activeConversationIdRef.current));
    };

    const onJoinRequestUpdated = (data: unknown) => {
      if (!isActive(data)) return;
      dedupedNotice(
        `group:join_req_upd:${String(activeConversationIdRef.current)}`,
        'Danh sách yêu cầu tham gia đã cập nhật',
        { variant: 'task_assigned' },
      );
      void fetchGroupRequests(String(activeConversationIdRef.current));
    };

    const onPollNew = (data: unknown) => {
      if (!isActive(data)) return;
      dedupedNotice(
        `group:poll_new:${String(activeConversationIdRef.current)}`,
        'Có bình chọn mới trong nhóm',
        {
          variant: 'poll',
        },
      );
      void fetchGroupPolls(String(activeConversationIdRef.current));
    };

    const onPollUpdated = (data: unknown) => {
      if (!isActive(data)) return;
      const d = data as { pollId?: string };
      dedupedNotice(`group:poll_upd:${String(d?.pollId ?? '')}`, 'Bình chọn vừa được cập nhật', {
        variant: 'poll',
      });
      void fetchGroupPolls(String(activeConversationIdRef.current));
    };

    const onTaskNew = (data: unknown) => {
      if (!isActive(data)) return;
      void fetchGroupTasks(String(activeConversationIdRef.current));
    };

    const onTaskUpdated = (data: unknown) => {
      if (!isActive(data)) return;
      void fetchGroupTasks(String(activeConversationIdRef.current));
    };

    const onTaskDeleted = (data: unknown) => {
      if (!isActive(data)) return;
      void fetchGroupTasks(String(activeConversationIdRef.current));
    };

    const onGroupDisbanded = (data: unknown) => {
      if (!isActive(data)) return;
      dedupedNotice(
        `group:disbanded:${String(activeConversationIdRef.current)}`,
        'Nhóm đã bị giải tán',
        {
          variant: 'task_assigned',
          dedupeMs: 10_000,
        },
      );
    };

    const onGroupDeleted = (data: unknown) => {
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

  return { chatFrameNotice, setChatFrameNotice };
}
