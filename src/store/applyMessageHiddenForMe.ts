import type { AppDispatch } from '@/store/store';
import { store } from '@/store/store';
import { chatApi } from '@/store/api/chatApi';
import { messageEdited, messageHiddenForViewer } from '@/store/slices/chatSlice';

/** Xóa tin khỏi UI phía user hiện tại (đồng bộ với API ẩn-theo-user, không đụng người khác). */
export function applyMessageHiddenForMe(
  dispatch: AppDispatch,
  conversationId: string,
  messageId: string,
): void {
  dispatch(
    chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
      if (!draft.data) return;
      draft.data = draft.data.filter((m) => m.messageId !== messageId);
    }),
  );
  dispatch(messageHiddenForViewer({ conversationId, messageId }));
  dispatch(chatApi.util.invalidateTags(['Conversations']));
}

/** Gỡ mọi thẻ system `task_assigned` trùng taskId (sau khi hủy công việc). */
export function hideTaskAssignedCardsForTaskId(
  dispatch: AppDispatch,
  conversationId: string,
  taskId: string,
): void {
  const ids: string[] = [];
  dispatch(
    chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
      if (!draft.data) return;
      for (const m of draft.data) {
        if ((m as { type?: string }).type !== 'system' || typeof m.content !== 'string') continue;
        const c = m.content.trim();
        if (!c.startsWith('{')) continue;
        try {
          const obj = JSON.parse(c) as { kind?: string; task?: { taskId?: string } };
          if (obj?.kind === 'task_assigned' && String(obj?.task?.taskId ?? '') === String(taskId)) {
            ids.push(String(m.messageId));
          }
        } catch {
          /* */
        }
      }
      const remove = new Set(ids);
      draft.data = draft.data.filter((m) => !remove.has(String(m.messageId)));
    }),
  );
  for (const messageId of ids) {
    dispatch(messageHiddenForViewer({ conversationId, messageId }));
  }
  dispatch(chatApi.util.invalidateTags(['Conversations']));
}

type TaskAssignedPatchFields = {
  title: string;
  dueDate: string | null;
  note: string | null;
  assigneeLabel: string;
  assignToAll: boolean;
  broadcast: boolean;
};

function mergeTaskAssignedJsonString(
  rawContent: string,
  taskId: string,
  fields: TaskAssignedPatchFields,
): string | null {
  if (typeof rawContent !== 'string') return null;
  const c = rawContent.trim();
  if (!c.startsWith('{')) return null;
  try {
    const obj = JSON.parse(c) as {
      kind?: string;
      task?: Record<string, unknown>;
    };
    if (obj?.kind !== 'task_assigned' || String(obj?.task?.taskId ?? '') !== String(taskId)) return null;
    obj.task = {
      ...obj.task,
      title: fields.title,
      dueDate: fields.dueDate,
      note: fields.note,
      assigneeLabel: fields.assigneeLabel,
      assignToAll: fields.assignToAll,
      broadcast: fields.broadcast,
    };
    return JSON.stringify(obj);
  } catch {
    return null;
  }
}

/**
 * Cập nhật mọi tin JSON `task_assigned` trùng taskId trong cache getMessages
 * và đồng bộ buffer Redux (socket) — vì `messageReceived` không ghi đè tin đã tồn tại.
 */
export function patchTaskAssignedSystemMessages(
  dispatch: AppDispatch,
  conversationId: string,
  taskId: string,
  fields: TaskAssignedPatchFields,
): void {
  const rtkPatched = new Map<string, string>();

  dispatch(
    chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
      if (!draft.data) return;
      for (const m of draft.data) {
        if (typeof m.content !== 'string') continue;
        const next = mergeTaskAssignedJsonString(m.content, taskId, fields);
        if (!next || next === m.content) continue;
        m.content = next;
        rtkPatched.set(String(m.messageId), next);
      }
    }),
  );

  const pushEdited = (messageId: string, content: string) => {
    dispatch(messageEdited({ messageId, conversationId, content }));
  };

  for (const [id, content] of rtkPatched) {
    pushEdited(id, content);
  }

  const reduxMsgs = store.getState().chat.messages[conversationId] ?? [];
  for (const m of reduxMsgs) {
    const mid = String(m.messageId);
    if (typeof m.content !== 'string') continue;
    const next = mergeTaskAssignedJsonString(m.content, taskId, fields);
    if (!next || next === m.content) continue;
    pushEdited(mid, next);
  }
}
