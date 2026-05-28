import { useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { chatApi } from '@/store/api/chatApi';
import type { AppDispatch } from '@/store/store';
import type { IConversation } from '@/types/chat.types';

type GroupTaskLike = {
  taskId: string;
  title: string;
  status?: 'todo' | 'in_progress' | 'done';
  dueDate?: string | null;
  assignees?: string[];
  assignToAll?: boolean;
  subtasks?: Array<{ assigneeId: string; done?: boolean }>;
};

function isTaskRelevantToUser(task: GroupTaskLike, currentUserId: string): boolean {
  const uid = String(currentUserId);
  const assignees = Array.isArray(task.assignees) ? task.assignees.map(String) : [];
  const assignToAll = Boolean(task.assignToAll) || assignees.length === 0;
  const subs = Array.isArray(task.subtasks) ? task.subtasks : [];

  if (subs.length > 0) {
    const ids = Array.from(new Set(subs.map((s) => String(s.assigneeId ?? '')).filter(Boolean)));
    return ids.includes(uid);
  }
  return assignToAll ? true : assignees.includes(uid);
}

export function useDueTaskNotifications({
  conversations,
  currentUserId,
  pollIntervalMs = 30_000,
}: {
  conversations: IConversation[];
  currentUserId: string;
  pollIntervalMs?: number;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const inFlightRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());

  const groupIds = useMemo(
    () =>
      (conversations ?? [])
        .filter((c) => c.type === 'group')
        .map((c) => String(c.conversationId))
        .filter(Boolean),
    [conversations],
  );

  useEffect(() => {
    if (!currentUserId) return;
    if (!groupIds || groupIds.length === 0) return;

    const tick = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const now = Date.now();

        for (const gid of groupIds) {
          const res = await dispatch(
            chatApi.endpoints.getTasks.initiate(gid, { subscribe: false, forceRefetch: false }),
          );
          const data = (res as any)?.data?.data as GroupTaskLike[] | undefined;
          if (!Array.isArray(data) || data.length === 0) continue;

          for (const task of data) {
            if (!task?.taskId) continue;
            if (task.status === 'done') continue;
            if (!isTaskRelevantToUser(task, currentUserId)) continue;

            const dueRaw = String(task.dueDate ?? '').trim();
            const dueMs = dueRaw ? new Date(dueRaw).getTime() : NaN;
            if (!Number.isFinite(dueMs)) continue;

            // Fire when due (within the polling window).
            const delta = now - dueMs;
            if (delta < 0 || delta > pollIntervalMs + 5_000) continue;

            const toastKey = `task_due:${gid}:${String(task.taskId)}`;
            const persistedKey = `reminder_sent:${toastKey}`;
            if (seenRef.current.has(toastKey)) continue;
            if (
              typeof window !== 'undefined' &&
              window.localStorage.getItem(persistedKey) === '1'
            ) {
              seenRef.current.add(toastKey);
              continue;
            }

            // Ask backend to broadcast a system message into the chat (idempotent).
            try {
              await dispatch(
                chatApi.endpoints.triggerTaskDueReminder.initiate({
                  groupId: gid,
                  taskId: String(task.taskId),
                }),
              );
            } catch {
              /* ignore */
            }

            seenRef.current.add(toastKey);
            try {
              window.localStorage.setItem(persistedKey, '1');
            } catch {
              /* ignore */
            }
          }
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    const t = window.setInterval(() => void tick(), Math.max(10_000, pollIntervalMs));
    void tick();
    return () => window.clearInterval(t);
  }, [currentUserId, dispatch, groupIds, pollIntervalMs]);
}
