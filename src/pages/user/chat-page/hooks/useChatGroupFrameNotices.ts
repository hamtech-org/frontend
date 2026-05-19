import { useCallback, useEffect, useRef, useState } from 'react';
import { socketService } from '@/services/socket';
import type { IMessage } from '@/types/chat.types';
import { lastMessageLineFromSystemJson } from '@/utils/chatUtils';
import { groupUpdateNoticeText, type GroupUpdatedPayload } from '@/utils/groupProfileUpdateNotice';

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
  currentUserId?: string;
  fetchGroupMembers: (groupId: string, options?: { force?: boolean }) => Promise<unknown>;
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
  currentUserId,
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
    const onGroupSystemMessage = (data: unknown) => {
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
          task?: { taskId?: string; title?: string };
          createdAt?: string;
          actor?: { userId?: string; name?: string };
        };
        const kind = String(obj?.kind ?? '');
        if (kind === 'message_pinned' || kind === 'message_unpinned') {
          return;
        }
        // Đã có pill system trong khung chat — không banner trùng.
        if (
          kind === 'group_admin_promoted' ||
          kind === 'group_admin_demoted' ||
          kind === 'group_owner_transferred' ||
          kind === 'group_owner_assigned' ||
          kind === 'group_member_invited' ||
          kind === 'group_member_joined' ||
          kind === 'group_member_left' ||
          kind === 'group_member_removed'
        ) {
          return;
        }
        const atIso = String(obj?.createdAt ?? msg.createdAt ?? new Date().toISOString());

        // Human-friendly preview line (reuse the same wording as sidebar/system message renderer)
        const preview =
          lastMessageLineFromSystemJson(raw, {
            currentUserId: undefined,
            senderId: String((msg as { senderId?: string }).senderId ?? ''),
            senderDisplayName:
              (msg as { senderDisplayName?: string | null }).senderDisplayName ?? null,
          }) ?? 'Thông báo nhóm';

        const isPollKind = kind.startsWith('poll_');
        const isTaskKind = kind.startsWith('task_');

        if (isPollKind) {
          // Keep polls data fresh for info panel
          void fetchGroupPolls(msg.conversationId);

          // Make "poll_created" actionable
          const pollId = obj.poll?.pollId ? String(obj.poll.pollId) : '';
          const onClick =
            kind === 'poll_created' && pollId
              ? () => {
                  setActivePollId(pollId);
                  setShowPollVoteModal(true);
                }
              : undefined;

          dedupedNotice(`sys:${kind}:${pollId || msg.messageId}`, preview, {
            atIso,
            variant: 'poll',
            onClick,
            dedupeMs: 1500,
          });
          return;
        }

        if (isTaskKind) {
          void fetchGroupTasks(msg.conversationId);
          const taskId = obj.task?.taskId ? String(obj.task.taskId) : '';
          const actorId = String(obj.actor?.userId ?? '').trim();
          if (
            (kind === 'task_assigned' || kind === 'task_updated') &&
            actorId &&
            currentUserId &&
            actorId === currentUserId
          ) {
            return;
          }
          const dedupeMs = kind === 'task_reminder' || kind === 'task_due' ? 60_000 : 8_000;
          dedupedNotice(`sys:${kind}:${taskId || msg.messageId}`, preview, {
            atIso,
            variant: kind === 'task_joined' ? 'task_joined' : 'task_assigned',
            dedupeMs,
          });
          return;
        }

        // Fallback: still surface a notice for other system json kinds
        dedupedNotice(`sys:${kind}:${msg.messageId}`, preview, {
          atIso,
          variant: 'task_assigned',
          dedupeMs: 1500,
        });
      } catch {
        /* ignore */
      }
    };
    socketService.on('message:new', onGroupSystemMessage);
    return () => {
      socketService.off('message:new', onGroupSystemMessage);
    };
  }, [
    isConnected,
    dedupedNotice,
    fetchGroupPolls,
    fetchGroupTasks,
    setActivePollId,
    setShowPollVoteModal,
  ]);

  useEffect(() => {
    if (!isConnected) return;

    const isActive = (payload: unknown): boolean => {
      const p = payload as { conversationId?: string; groupId?: string };
      const cid = String(p?.conversationId ?? p?.groupId ?? '').trim();
      return Boolean(cid && cid === String(activeConversationIdRef.current ?? ''));
    };

    const onGroupUpdated = (data: unknown) => {
      if (!isActive(data)) return;
      const noticeText =
        groupUpdateNoticeText(data as GroupUpdatedPayload, currentUserId) ??
        'Nhóm đã cập nhật thông tin';
      dedupedNotice(`group:updated:${String(activeConversationIdRef.current)}`, noticeText, {
        variant: 'task_assigned',
      });
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
      void fetchGroupRequests(String(activeConversationIdRef.current));
      void fetchGroupTasks(String(activeConversationIdRef.current));
    };

    const onMemberLeft = (data: unknown) => {
      if (!isActive(data)) return;
      const d = data as { userId?: string };
      dedupedNotice(`group:member_left:${String(d?.userId ?? '')}`, 'Một thành viên vừa rời nhóm', {
        variant: 'task_assigned',
      });
      void fetchGroupMembers(String(activeConversationIdRef.current));
      void fetchGroupRequests(String(activeConversationIdRef.current));
      void fetchGroupTasks(String(activeConversationIdRef.current));
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
      void fetchGroupRequests(String(activeConversationIdRef.current));
      void fetchGroupTasks(String(activeConversationIdRef.current));
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
    currentUserId,
    dedupedNotice,
    fetchGroupMembers,
    fetchGroupRequests,
    fetchGroupPolls,
    fetchGroupTasks,
  ]);

  return { chatFrameNotice, setChatFrameNotice };
}
