import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

type Member = { userId: string; displayName: string };

type Subtask = {
  id: string;
  assigneeId: string;
  assigneeName: string;
  content: string;
  done: boolean;
  completedAt: string | null;
};

type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  createdBy: { userId: string; displayName: string };
  note: string;
  subtasks: Subtask[];
  status: 'pending' | 'done';
  // single in-place reminder card state (no spam)
  reminderStage: null | 'soon' | 'due' | 'overdue';
  snoozeUntil: string | null;
};

type DraftSubtask = { assigneeId: string; content: string };

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
}

function deadlineTone(
  nowMs: number,
  dueIso: string | null,
): {
  label: string;
  icon: string;
  toneClass: string;
  cardBorderClass: string;
  isOverdue: boolean;
} {
  if (!dueIso) {
    return {
      label: 'Chưa đặt deadline',
      icon: '🕒',
      toneClass: 'text-muted-foreground',
      cardBorderClass: 'border-black/5 dark:border-white/10',
      isOverdue: false,
    };
  }
  const dueMs = new Date(dueIso).getTime();
  if (!Number.isFinite(dueMs)) {
    return {
      label: 'Deadline',
      icon: '🕒',
      toneClass: 'text-muted-foreground',
      cardBorderClass: 'border-black/5 dark:border-white/10',
      isOverdue: false,
    };
  }
  const msLeft = dueMs - nowMs;
  if (msLeft < 0) {
    return {
      label: 'Quá hạn',
      icon: '🔴',
      toneClass: 'text-red-700 dark:text-red-300',
      cardBorderClass: 'border-red-500/35',
      isOverdue: true,
    };
  }
  if (msLeft <= 10 * 60_000) {
    return {
      label: 'Sắp đến hạn',
      icon: '🟠',
      toneClass: 'text-orange-700 dark:text-orange-300',
      cardBorderClass: 'border-orange-500/25',
      isOverdue: false,
    };
  }
  return {
    label: 'Deadline',
    icon: '🕒',
    toneClass: 'text-muted-foreground',
    cardBorderClass: 'border-black/5 dark:border-white/10',
    isOverdue: false,
  };
}

function CreateTaskForm({
  members,
  createdBy,
  onCreate,
}: {
  members: Member[];
  createdBy: Member;
  onCreate: (task: Omit<Task, 'id'>) => void;
}) {
  const [title, setTitle] = useState('Chuẩn bị release v1');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 60_000);
    // local datetime input expects "YYYY-MM-DDTHH:mm"
    const pad = (n: number) => String(n).padStart(2, '0');
    const v = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return v;
  });
  const [note, setNote] = useState('Ghi chú: ưu tiên xong trước 18:00');
  const [drafts, setDrafts] = useState<DraftSubtask[]>([
    { assigneeId: members[0]?.userId ?? 'u1', content: 'Thiết kế UI' },
    { assigneeId: members[1]?.userId ?? 'u2', content: 'Test API' },
    { assigneeId: members[2]?.userId ?? 'u3', content: 'Viết document' },
  ]);

  const addRow = () =>
    setDrafts((p) => [...p, { assigneeId: members[0]?.userId ?? 'u1', content: '' }]);
  const updateRow = (idx: number, next: Partial<DraftSubtask>) =>
    setDrafts((p) => p.map((x, i) => (i === idx ? { ...x, ...next } : x)));
  const removeRow = (idx: number) => setDrafts((p) => p.filter((_, i) => i !== idx));

  const submit = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const isoDue = dueDate ? new Date(dueDate).toISOString() : null;
    const subtasks: Subtask[] = drafts
      .map((d) => {
        const mem = members.find((m) => m.userId === d.assigneeId);
        return {
          id: uid('sub'),
          assigneeId: d.assigneeId,
          assigneeName: mem?.displayName ?? 'Ai đó',
          content: String(d.content ?? '').trim(),
          done: false,
          completedAt: null,
        };
      })
      .filter((s) => Boolean(s.content));

    onCreate({
      title: cleanTitle,
      dueDate: isoDue,
      createdBy: { userId: createdBy.userId, displayName: createdBy.displayName },
      note: note.trim(),
      subtasks,
      status: 'pending',
      reminderStage: null,
      snoozeUntil: null,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label>Tiêu đề</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Deadline</Label>
        <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Ghi chú (optional)</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Công việc (subtasks)</Label>
        <div className="space-y-2">
          {drafts.map((d, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="w-[180px]">
                <Select
                  value={d.assigneeId}
                  onValueChange={(v) => updateRow(idx, { assigneeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Nội dung công việc"
                value={d.content}
                onChange={(e) => updateRow(idx, { content: e.target.value })}
              />
              <Button variant="outline" size="sm" onClick={() => removeRow(idx)}>
                X
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            + Thêm công việc
          </Button>
          <Button size="sm" onClick={submit}>
            Tạo task
          </Button>
        </div>
      </div>
    </div>
  );
}

function SubTaskItem({
  sub,
  canComplete,
  onComplete,
}: {
  sub: Subtask;
  canComplete: boolean;
  onComplete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div
          className={`text-[13px] font-semibold ${sub.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}
        >
          {sub.done ? '✓' : '•'} {sub.assigneeName} — {sub.content}
        </div>
        {sub.done && sub.completedAt ? (
          <div className="text-[11px] text-muted-foreground">
            Hoàn thành lúc {fmtTime(sub.completedAt)}
          </div>
        ) : null}
      </div>
      {canComplete ? (
        <Button size="sm" disabled={sub.done} onClick={onComplete}>
          {sub.done ? 'Đã xong' : 'Hoàn thành'}
        </Button>
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
  nowMs,
  viewer,
  onCompleteSubtask,
}: {
  task: Task;
  nowMs: number;
  viewer: Member;
  onCompleteSubtask: (taskId: string, subId: string) => void;
}) {
  const tone = deadlineTone(nowMs, task.dueDate);
  const allDone = task.subtasks.length > 0 && task.subtasks.every((s) => s.done);
  const notDoneForViewer = task.subtasks.filter((s) => !s.done && s.assigneeId === viewer.userId);
  const mentionLines = notDoneForViewer.map((s) => `@${viewer.displayName} — ${s.content}`);

  return (
    <div className="w-full max-w-[520px] mx-auto">
      <div className="text-center text-[11px] font-semibold text-muted-foreground mb-2">
        {new Date().toLocaleTimeString('vi-VN')}
      </div>
      <div className="rounded-2xl bg-muted/60 border border-border/40 px-4 py-3">
        <div className="text-center text-[12px] font-bold text-foreground mb-1.5">Giao việc</div>
        <div className={`rounded-xl bg-background/70 border px-3 py-2 ${tone.cardBorderClass}`}>
          <div className="text-center text-[14px] font-extrabold text-foreground">{task.title}</div>
          <div className={`mt-2 text-center text-[12px] font-semibold ${tone.toneClass}`}>
            <span aria-hidden>{tone.icon}</span> {tone.label}:{' '}
            {task.dueDate ? fmtTime(task.dueDate) : '—'}
          </div>
          {task.note ? (
            <div className="mt-2 text-center text-[12px] text-muted-foreground">{task.note}</div>
          ) : null}

          <div className="mt-3 space-y-2">
            {task.subtasks.map((s) => (
              <SubTaskItem
                key={s.id}
                sub={s}
                canComplete={s.assigneeId === viewer.userId}
                onComplete={() => onCompleteSubtask(task.id, s.id)}
              />
            ))}
          </div>

          {allDone ? (
            <div className="mt-3 text-center text-[12px] font-bold text-green-700 dark:text-green-400">
              ✅ Task hoàn thành
            </div>
          ) : null}
        </div>

        {/* Single in-place reminder area (no spam) */}
        {task.reminderStage ? (
          <div className="mt-3 rounded-xl bg-background/70 border border-border/40 px-3 py-2">
            <div className="text-center text-[12px] font-bold text-foreground">
              {task.reminderStage === 'due'
                ? '⏰ Nhắc việc'
                : task.reminderStage === 'soon'
                  ? '⏰ Sắp đến hạn'
                  : '🔴 Quá hạn'}
            </div>
            <div className="mt-1 text-center text-[13px] font-extrabold text-foreground">
              {task.title}
            </div>
            {mentionLines.length > 0 ? (
              <div className="mt-2 text-center text-[12px] font-semibold text-foreground whitespace-pre-line">
                {mentionLines.join('\n')}
              </div>
            ) : (
              <div className="mt-2 text-center text-[12px] text-muted-foreground">
                Không có việc nào của bạn cần nhắc lúc này.
              </div>
            )}
            {task.snoozeUntil ? (
              <div className="mt-2 text-center text-[12px] font-semibold text-blue-700 dark:text-blue-300">
                Đã snooze đến {fmtTime(task.snoozeUntil)}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SubtaskGroupTaskDemo() {
  const members: Member[] = useMemo(
    () => [
      { userId: 'u1', displayName: 'Huyền Trần' },
      { userId: 'u2', displayName: 'Phi Trường' },
      { userId: 'u3', displayName: 'Ngọc Ngà' },
      { userId: 'u4', displayName: 'Minh Anh' },
    ],
    [],
  );

  const [viewerId, setViewerId] = useState(members[0].userId);
  const viewer = useMemo(
    () => members.find((m) => m.userId === viewerId) ?? members[0],
    [members, viewerId],
  );

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const [tasks, setTasks] = useState<Task[]>([]);

  const timersRef = useRef<Map<string, number>>(new Map());
  const clearTimersForTask = useCallback((taskId: string) => {
    const keys = Array.from(timersRef.current.keys()).filter((k) => k.startsWith(`${taskId}:`));
    for (const k of keys) {
      const t = timersRef.current.get(k);
      if (t) window.clearTimeout(t);
      timersRef.current.delete(k);
    }
  }, []);

  const scheduleReminder = useCallback(
    (task: Task) => {
      clearTimersForTask(task.id);
      if (!task.dueDate) return;
      const dueMs = new Date(task.dueDate).getTime();
      if (!Number.isFinite(dueMs)) return;

      const scheduleAt = (stage: Task['reminderStage'], atMs: number) => {
        const delay = atMs - Date.now();
        if (delay <= 0) return;
        const key = `${task.id}:${stage}`;
        const t = window.setTimeout(() => {
          setTasks((prev) =>
            prev.map((x) =>
              x.id === task.id && x.status !== 'done'
                ? { ...x, reminderStage: stage, snoozeUntil: null }
                : x,
            ),
          );
        }, delay);
        timersRef.current.set(key, t);
      };

      scheduleAt('soon', dueMs - 10 * 60_000);
      scheduleAt('due', dueMs);
      scheduleAt('overdue', dueMs + 30 * 60_000);
    },
    [clearTimersForTask],
  );

  const createTask = useCallback(
    (payload: Omit<Task, 'id'>) => {
      const t: Task = { ...payload, id: uid('task') };
      setTasks((prev) => [t, ...prev]);
      scheduleReminder(t);
    },
    [scheduleReminder],
  );

  const completeSubtask = useCallback(
    (taskId: string, subId: string) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const nextSubs = t.subtasks.map((s) =>
            s.id === subId && !s.done
              ? { ...s, done: true, completedAt: new Date().toISOString() }
              : s,
          );
          const allDone = nextSubs.length > 0 && nextSubs.every((s) => s.done);
          if (allDone) {
            clearTimersForTask(taskId);
          }
          return { ...t, subtasks: nextSubs, status: allDone ? 'done' : 'pending' };
        }),
      );
    },
    [clearTimersForTask],
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="grid gap-1">
              <div className="text-sm font-bold">Viewer (giả lập người đang xem)</div>
              <div className="text-xs text-muted-foreground">
                Đổi viewer để thấy nút “Hoàn thành” chỉ hiện ở subtask của mình và nhắc việc mention
                đúng phần việc chưa xong.
              </div>
            </div>
            <div className="w-[220px]">
              <Select value={viewerId} onValueChange={setViewerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <CreateTaskForm members={members} createdBy={viewer} onCreate={createTask} />
        </div>
      </Card>

      <div className="space-y-6">
        {tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Chưa có task nào. Hãy tạo một task để xem card + reminder realtime.
          </div>
        ) : null}
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            nowMs={nowMs}
            viewer={viewer}
            onCompleteSubtask={completeSubtask}
          />
        ))}
      </div>
    </div>
  );
}
