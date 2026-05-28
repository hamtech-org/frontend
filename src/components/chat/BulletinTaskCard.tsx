import { CheckSquare, Trash2, Users } from 'lucide-react';
import type { GroupTask } from '@/types/chat.group.types';
import { TaskDeadlineCalendar } from '@/components/chat/TaskDeadlineCalendar';
import { isTaskJoinDeadlinePassed } from '@/utils/chatUtils';

export type BulletinTaskCardProps = {
  task: GroupTask;
  creatorName: string;
  avatarUrl?: string;
  when: string;
  currentUserId?: string;
  onTaskJoined?: (taskId: string) => void | Promise<void>;
  onEdit?: (task: GroupTask) => void;
  onDelete?: (taskId: string) => void;
  taskMutating?: boolean;
  focusTaskId?: string | null;
  focusFlashNonce?: number;
};

const chipBase =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none';

export function BulletinTaskCard({
  task,
  creatorName,
  avatarUrl,
  when,
  currentUserId,
  onTaskJoined,
  onEdit,
  onDelete,
  taskMutating,
  focusTaskId,
  focusFlashNonce,
}: BulletinTaskCardProps) {
  const t = task;
  const desc = (t.description ?? '').trim();
  const due = t.dueDate ? String(t.dueDate) : '';
  const dueOk = Boolean(due && !Number.isNaN(new Date(due).getTime()));
  const assignees = Array.isArray(t.assignees) ? t.assignees : [];
  const participants = Array.isArray(t.participants) ? t.participants : [];
  const subs = Array.isArray(t.subtasks) ? t.subtasks : [];
  const subAssigneeIds = subs.map((s) => String(s.assigneeId ?? '').trim()).filter(Boolean);
  const assignToAll = Boolean(t.assignToAll) || Boolean(t.broadcast);
  const uid = String(currentUserId ?? '');
  const joined = uid ? participants.includes(uid) : false;
  const hasSubtasksAssignees = subAssigneeIds.length > 0;
  const isSubtaskAssignee = uid ? subAssigneeIds.includes(uid) : false;
  const isTopLevelAssignee = uid ? assignees.map(String).includes(uid) : false;
  const canJoin = hasSubtasksAssignees ? isSubtaskAssignee : assignToAll || isTopLevelAssignee;
  const joinDeadlinePassed = dueOk && isTaskJoinDeadlinePassed(due);
  const showJoinButton = Boolean(onTaskJoined) && !joined && canJoin && !joinDeadlinePassed;
  const isCreator = Boolean(t.creatorId && uid && String(t.creatorId) === uid);
  const isFocused = String(t.taskId) === String(focusTaskId ?? '');
  const initial = creatorName.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      id={`task-row-${t.taskId}`}
      data-focus-flash={isFocused ? (focusFlashNonce ?? 0) : undefined}
      className={`rounded-2xl border border-black/[0.06] bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#242424] ${isFocused ? 'ring-2 ring-blue-500/50' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">{creatorName}</p>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <CheckSquare className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span>Công việc</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 space-y-2">
        <p className="line-clamp-4 text-[13px] font-semibold leading-snug text-foreground">
          {t.title}
        </p>
        {desc ? (
          <p className="line-clamp-3 text-[12px] leading-snug text-muted-foreground">{desc}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {dueOk ? <TaskDeadlineCalendar dateIso={due} size="sm" /> : null}
          <span className={`${chipBase} bg-black/5 text-muted-foreground dark:bg-white/10`}>
            <Users className="h-3 w-3 shrink-0" />
            {participants.length > 0 ? `${participants.length} đã tham gia` : 'Chưa ai tham gia'}
          </span>
          {joined ? (
            <span
              className={`${chipBase} bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300`}
            >
              Bạn đã tham gia
            </span>
          ) : canJoin && joinDeadlinePassed ? (
            <span
              className={`${chipBase} bg-black/5 text-muted-foreground dark:bg-white/10`}
              title="Đã quá hạn công việc"
            >
              Chưa tham gia
            </span>
          ) : showJoinButton ? (
            <button
              type="button"
              disabled={taskMutating}
              onClick={() => void onTaskJoined?.(String(t.taskId))}
              className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold leading-none text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              Xác nhận tham gia
            </button>
          ) : null}
        </div>

        <div className="border-t border-black/[0.06] pt-2 dark:border-white/10">
          <p className="text-[11px] text-muted-foreground">{when || '—'}</p>
          {isCreator && (onEdit || onDelete) ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {onEdit ? (
                <button
                  type="button"
                  disabled={taskMutating}
                  onClick={() => onEdit(t)}
                  className="rounded-full bg-black/5 px-3 py-1.5 text-[11px] font-bold text-foreground hover:bg-black/10 disabled:opacity-40 dark:bg-white/10 dark:hover:bg-white/15"
                >
                  Sửa
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  disabled={taskMutating}
                  onClick={() => onDelete(String(t.taskId))}
                  className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-500/15 disabled:opacity-40 dark:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                  Hủy công việc
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
