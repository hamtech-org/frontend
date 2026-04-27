import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';

import type { IMessage } from '@/types/chat.types';
import { messageEdited, messageReceived } from '@/store/slices/chatSlice';

type GroupTaskLike = {
  taskId: string;
  title: string;
  status?: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
  assignees?: string[];
  participants?: string[];
  assignToAll?: boolean;
  broadcast?: boolean;
  subtasks?: Array<{
    id?: string;
    assigneeId: string;
    assigneeName?: string;
    content: string;
    done?: boolean;
  }>;
  creatorId?: string;
  creatorDisplayName?: string | null;
};

type MemberLike = { userId: string; displayName?: string | null };

type ReminderStage = 'soon' | 'due' | 'overdue' | 'snooze';

function safeIsoNow(): string {
  return new Date().toISOString();
}

function taskCardMessageId(conversationId: string, taskId: string): string {
  return `local-task-card:${conversationId}:${taskId}`;
}

function buildSystemMessage({
  conversationId,
  messageId,
  content,
}: {
  conversationId: string;
  messageId: string;
  content: string;
}): IMessage {
  const nowIso = safeIsoNow();
  return {
    messageId,
    conversationId,
    senderId: 'system',
    senderDisplayName: 'Hệ thống',
    type: 'system',
    content,
    mediaUrl: null,
    thumbnailUrl: null,
    replyTo: null,
    isPinned: false,
    isEdited: false,
    isRecalled: false,
    reactions: {},
    createdAt: nowIso,
  };
}

function stageTitle(stage: ReminderStage): { emoji: string; title: string } {
  if (stage === 'soon') return { emoji: '⏰', title: 'Sắp đến hạn' };
  if (stage === 'due') return { emoji: '⚠️', title: 'Đã đến hạn' };
  if (stage === 'snooze') return { emoji: '⏰', title: 'Nhắc lại' };
  return { emoji: '🔴', title: 'Đã quá hạn' };
}

function buildReminderPayload({
  stage,
  task,
  memberNameById,
  snoozeUntil,
}: {
  stage: ReminderStage;
  task: GroupTaskLike;
  memberNameById: Map<string, string>;
  snoozeUntil?: string | null;
}): string {
  const assignees = Array.isArray(task.assignees) ? task.assignees : [];
  const assignToAll = Boolean(task.assignToAll) || assignees.length === 0;
  const broadcast = Boolean(task.broadcast) || assignToAll;
  const recipients = (() => {
    const subs = Array.isArray(task.subtasks) ? task.subtasks : [];
    if (subs.length > 0) {
      const pending = subs.filter((s) => !s?.done);
      const ids = Array.from(
        new Set(pending.map((s) => String(s.assigneeId ?? '')).filter(Boolean)),
      );
      return ids;
    }
    return assignToAll ? (Array.isArray(task.participants) ? task.participants : []) : assignees;
  })();

  const names = recipients
    .map((id) => memberNameById.get(id))
    .filter((x): x is string => Boolean(x && x.trim()))
    .map((x) => x.trim());
  const mention = names.length > 0 ? names.map((n) => `@${n}`).join(' ') : '';
  const assigneeLabel = assignToAll
    ? `Cả nhóm (${memberNameById.size} người)`
    : names.length > 0
      ? names.join(', ')
      : 'cả nhóm';

  const dueDate = task.dueDate ?? null;
  const { emoji, title } = stageTitle(stage);
  const header =
    broadcast && stage === 'due' ? { emoji: '⏰', title: 'Nhắc cả nhóm' } : { emoji, title };

  return JSON.stringify({
    kind: 'task_reminder',
    stage,
    header,
    task: {
      taskId: String(task.taskId),
      title: String(task.title ?? ''),
      dueDate,
      assigneeLabel,
      mention,
      assignToAll,
      broadcast,
      snoozeUntil: snoozeUntil ?? null,
    },
  });
}

function buildTaskAssignedPayload({
  task,
  memberNameById,
}: {
  task: GroupTaskLike;
  memberNameById: Map<string, string>;
}): string {
  const assignees = Array.isArray(task.assignees) ? task.assignees : [];
  const assignToAll = Boolean(task.assignToAll) || assignees.length === 0;
  const broadcast = Boolean(task.broadcast) || assignToAll;
  const names = assignees
    .map((id) => memberNameById.get(id))
    .filter((x): x is string => Boolean(x && x.trim()))
    .map((x) => x.trim());
  const assigneeLabel = assignToAll
    ? `Cả nhóm (${memberNameById.size} người)`
    : names.length > 0
      ? names.join(', ')
      : 'cả nhóm';

  return JSON.stringify({
    kind: 'task_assigned',
    actor: { userId: task.creatorId ?? null, name: task.creatorDisplayName ?? 'Ai đó' },
    task: {
      taskId: String(task.taskId),
      title: String(task.title ?? ''),
      dueDate: task.dueDate ?? null,
      note: null,
      assigneeLabel,
      assignToAll,
      broadcast,
    },
  });
}

export function useTaskReminderScheduler({
  conversationId,
  tasks,
  members,
  currentUserId,
}: {
  conversationId: string | null;
  tasks: GroupTaskLike[];
  members: MemberLike[];
  currentUserId: string;
}) {
  const dispatch = useDispatch();

  const memberNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of members) {
      const name = u.displayName?.trim();
      if (u.userId && name) m.set(u.userId, name);
    }
    return m;
  }, [members]);

  /** `window.setTimeout` trả về `number` trên DOM; tránh lệch với kiểu NodeJS.Timeout. */
  const timersRef = useRef<Map<string, number>>(new Map());
  const sentRef = useRef<Set<string>>(new Set());
  const snoozeRef = useRef<Map<string, number>>(new Map());
  const createdRef = useRef<Set<string>>(new Set());

  const cancelTaskReminders = useCallback(
    (taskId: string) => {
      if (!conversationId) return;
      const stages: ReminderStage[] = ['soon', 'due', 'overdue', 'snooze'];
      for (const stage of stages) {
        const key = `${conversationId}:${taskId}:${stage}`;
        const t = timersRef.current.get(key);
        if (t) clearTimeout(t);
        timersRef.current.delete(key);
        sentRef.current.add(key);
      }
      const snoozeKey = `${conversationId}:${taskId}`;
      const st = snoozeRef.current.get(snoozeKey);
      if (st) clearTimeout(st);
      snoozeRef.current.delete(snoozeKey);
    },
    [conversationId],
  );

  const snoozeTask = useCallback(
    (taskId: string, minutes = 10) => {
      if (!conversationId) return;
      cancelTaskReminders(taskId);
      const snoozeKey = `${conversationId}:${taskId}`;
      const existing = snoozeRef.current.get(snoozeKey);
      if (existing) clearTimeout(existing);
      const delay = Math.max(1, minutes) * 60_000;
      const snoozeUntilIso = new Date(Date.now() + delay).toISOString();
      const t = window.setTimeout(() => {
        const latest = tasks.find((x) => x.taskId === taskId);
        if (!latest || latest.status === 'done') return;
        const latestAssignees = Array.isArray(latest.assignees) ? latest.assignees : [];
        const assignToAll = Boolean(latest.assignToAll) || latestAssignees.length === 0;
        const recipients = assignToAll
          ? Array.isArray(latest.participants)
            ? latest.participants
            : []
          : latestAssignees;
        if (!recipients.includes(currentUserId)) return;
        const unique = `${conversationId}:${taskId}:snooze`;
        if (sentRef.current.has(unique)) return;
        sentRef.current.add(unique);
        const payload = buildReminderPayload({
          stage: 'snooze',
          task: latest,
          memberNameById,
          snoozeUntil: snoozeUntilIso,
        });
        const messageId = taskCardMessageId(conversationId, taskId);
        // Ensure the card exists before editing (no spam: messageId is stable).
        dispatch(
          messageReceived(buildSystemMessage({ conversationId, messageId, content: payload })),
        );
        dispatch(messageEdited({ conversationId, messageId, content: payload }));
      }, delay);
      snoozeRef.current.set(snoozeKey, t);
    },
    [cancelTaskReminders, conversationId, currentUserId, dispatch, memberNameById, tasks],
  );

  useEffect(() => {
    // reset everything when conversation changes
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    snoozeRef.current.forEach((t) => clearTimeout(t));
    snoozeRef.current.clear();
    sentRef.current.clear();
    createdRef.current.clear();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    // Clear any existing timers (re-schedule on each tasks change).
    const timers = timersRef.current;
    timers.forEach((t) => clearTimeout(t));
    timers.clear();

    for (const task of tasks) {
      if (!task?.taskId) continue;
      if (task.status === 'done') continue;

      if (!createdRef.current.has(task.taskId)) {
        const payload = buildTaskAssignedPayload({ task, memberNameById });
        const messageId = taskCardMessageId(conversationId, task.taskId);
        dispatch(
          messageReceived(buildSystemMessage({ conversationId, messageId, content: payload })),
        );
        createdRef.current.add(task.taskId);
      }
    }

    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [conversationId, currentUserId, dispatch, memberNameById, tasks]);

  return { cancelTaskReminders, snoozeTask };
}
