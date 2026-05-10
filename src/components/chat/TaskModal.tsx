import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CheckCheck, CheckSquare, Trash2, Users, X } from 'lucide-react';
import { ZaloStyleAvatar } from '@/components/chat/ZaloStyleAvatar';

type TaskModalProps = {
  open: boolean;
  onClose: () => void;
  members: Array<{ id: string; name: string; avatar?: string | null; role: string }>;
  currentUserId?: string;
  assignToAll?: boolean;
  onAssignToAllChange?: (value: boolean) => void;
  taskTitle: string;
  onTaskTitleChange: (value: string) => void;
  taskDeadline: string;
  onTaskDeadlineChange: (value: string) => void;
  taskNote: string;
  onTaskNoteChange: (value: string) => void;
  taskAssignees: string[];
  onTaskAssigneesChange: (ids: string[]) => void;
  subtaskRows?: Array<{ assigneeId: string; content: string }>;
  onSubtaskRowsChange?: (rows: Array<{ assigneeId: string; content: string }>) => void;
  onSubmitTask: () => void;
  /** true: đang sửa công việc có sẵn (nút Lưu + tùy chọn hủy công việc). */
  isEditing?: boolean;
  onDeleteTask?: () => void;
  submitBusy?: boolean;
};

export function TaskModal({
  open,
  onClose,
  members,
  currentUserId,
  assignToAll = false,
  onAssignToAllChange,
  taskTitle,
  onTaskTitleChange,
  taskDeadline,
  onTaskDeadlineChange,
  taskNote,
  onTaskNoteChange,
  taskAssignees,
  onTaskAssigneesChange,
  subtaskRows = [],
  onSubtaskRowsChange,
  onSubmitTask,
  isEditing = false,
  onDeleteTask,
  submitBusy = false,
}: TaskModalProps) {
  const getMinDeadlineNow = () => {
    // datetime-local has minute precision. Lock to current minute (no past minutes/hours).
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  };

  const isPastDeadline = (raw: string) => {
    const s = String(raw ?? '').trim();
    if (!s) return false;
    const picked = new Date(s);
    if (Number.isNaN(picked.getTime())) return false;
    return picked.getTime() < getMinDeadlineNow().getTime();
  };

  const labelFor = (id: string, name: string) => {
    if (currentUserId && id === currentUserId) return 'Bạn';
    return name;
  };
  const roleLabel = (role?: string) => {
    if (role === 'owner') return 'Trưởng nhóm';
    if (role === 'admin') return 'Phó nhóm';
    return 'Thành viên';
  };

  const eligibleMembers = assignToAll
    ? members
    : members.filter((m) => taskAssignees.includes(m.id));
  const eligibleIdSet = new Set(eligibleMembers.map((m) => m.id));

  useEffect(() => {
    if (assignToAll) return;
    if (!onSubtaskRowsChange) return;
    const next = subtaskRows.filter((r) => eligibleIdSet.has(String(r.assigneeId ?? '')));
    if (next.length !== subtaskRows.length) onSubtaskRowsChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignToAll, taskAssignees.join('|')]);

  const hasSubtasks = subtaskRows.some((r) => r.assigneeId && r.content.trim());
  const hasAssignees = assignToAll || taskAssignees.length > 0;
  const hasDeadline = Boolean(taskDeadline?.trim());
  const deadlineOk = hasDeadline && !isPastDeadline(taskDeadline);
  const canSubmit =
    taskTitle.trim().length > 0 && deadlineOk && hasAssignees && (hasSubtasks || hasAssignees);

  const todayDateStr = useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const formatHm = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [nowTimeStr, setNowTimeStr] = useState<string>(() => formatHm(getMinDeadlineNow()));

  // Keep "now" ticking so min time for today is always correct.
  useEffect(() => {
    if (!open) return;
    const tick = () => setNowTimeStr(formatHm(getMinDeadlineNow()));
    tick();
    const t = window.setInterval(tick, 15_000);
    return () => window.clearInterval(t);
  }, [open]);

  const parseDeadlineParts = (raw: string) => {
    const s = String(raw ?? '').trim();
    if (!s) return { date: '', time: '' };
    const [date, time] = s.split('T');
    return { date: date ?? '', time: (time ?? '').slice(0, 5) };
  };

  const buildDeadline = (date: string, time: string) => {
    const d = String(date ?? '').trim();
    const t = String(time ?? '').trim();
    if (!d) return '';
    if (!t) return `${d}T${nowTimeStr}`;
    return `${d}T${t}`;
  };

  const parts = parseDeadlineParts(taskDeadline);
  const selectedDate = parts.date || '';
  const selectedTime = parts.time || '';
  const minDate = todayDateStr;
  const minTimeForSelectedDate = selectedDate === todayDateStr ? nowTimeStr : '00:00';

  // Khi mở modal tạo mới: set deadline mặc định = hôm nay + giờ hiện tại.
  // Nếu đang mở mà deadline lỡ ở quá khứ: auto kéo lên min hợp lệ.
  useEffect(() => {
    if (!open) return;
    const hasValue = Boolean(taskDeadline && taskDeadline.trim());
    if (!hasValue && !isEditing) {
      onTaskDeadlineChange(buildDeadline(todayDateStr, nowTimeStr));
      return;
    }
    if (hasValue && isPastDeadline(taskDeadline)) {
      onTaskDeadlineChange(buildDeadline(todayDateStr, nowTimeStr));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetAndClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 350, damping: 25 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl max-w-[540px] w-full shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden max-h-[90vh]"
          >
            <div className="px-6 py-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                  <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-extrabold text-[18px] text-foreground">
                  {isEditing ? 'Chỉnh sửa công việc' : 'Giao việc & Nhắc hẹn'}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={resetAndClose}
                  disabled={submitBusy}
                  className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 transition-colors disabled:opacity-40 text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-6">
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">
                  Tiêu đề công việc
                </label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề công việc..."
                  value={taskTitle}
                  onChange={(e) => onTaskTitleChange(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 outline-none border border-black/5 dark:border-white/5 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-zinc-800 text-[15px] font-semibold transition-all placeholder:font-medium placeholder:text-muted-foreground/70"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">
                  Thời hạn
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="mb-1.5 text-[12px] font-bold text-muted-foreground">Ngày</div>
                    <input
                      type="date"
                      value={selectedDate}
                      min={minDate}
                      onChange={(e) => {
                        const nextDate = e.target.value;
                        const nextTime =
                          nextDate === todayDateStr && selectedTime && selectedTime < nowTimeStr
                            ? nowTimeStr
                            : selectedTime || nowTimeStr;
                        onTaskDeadlineChange(buildDeadline(nextDate, nextTime));
                      }}
                      className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 outline-none border border-black/5 dark:border-white/5 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-zinc-800 text-[14px] font-semibold transition-all text-foreground"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-[12px] font-bold text-muted-foreground">
                      Thời gian
                    </div>
                    <input
                      type="time"
                      value={selectedTime}
                      min={minTimeForSelectedDate}
                      onChange={(e) => {
                        const nextTime = e.target.value;
                        const fixedTime =
                          selectedDate === todayDateStr && nextTime < nowTimeStr
                            ? nowTimeStr
                            : nextTime;
                        onTaskDeadlineChange(
                          buildDeadline(selectedDate || todayDateStr, fixedTime),
                        );
                      }}
                      className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 outline-none border border-black/5 dark:border-white/5 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-zinc-800 text-[14px] font-semibold transition-all text-foreground"
                    />
                  </div>
                </div>
                {taskDeadline && isPastDeadline(taskDeadline) ? (
                  <div className="mt-2 text-[12px] font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <span aria-hidden>⚠️</span> Thời hạn phải lớn hơn thời gian hiện tại.
                  </div>
                ) : null}
              </div>
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">
                  Giao cho
                </label>
                <button
                  type="button"
                  onClick={() => onAssignToAllChange?.(!assignToAll)}
                  className={`w-full mb-3 flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all ${
                    assignToAll
                      ? 'border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm'
                      : 'border-black/5 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${assignToAll ? 'bg-indigo-200 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' : 'bg-black/5 dark:bg-white/10 text-muted-foreground'}`}
                    >
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p
                        className={`text-sm font-bold ${assignToAll ? 'text-indigo-900 dark:text-indigo-300' : 'text-foreground'}`}
                      >
                        Giao cho cả nhóm
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        Tự động áp dụng cho tất cả thành viên
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-12 h-6.5 rounded-full p-1 transition-colors flex items-center ${
                      assignToAll ? 'bg-indigo-500' : 'bg-black/15 dark:bg-white/15'
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        assignToAll ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>
                <div className="border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-black/5 dark:divide-white/5 bg-slate-50 dark:bg-zinc-800/50 shadow-sm">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className={`flex items-center gap-3.5 px-4 py-3 transition-colors group ${
                        assignToAll
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        <input
                          type="checkbox"
                          checked={taskAssignees.includes(member.id)}
                          onChange={(e) => {
                            if (assignToAll) return;
                            if (e.target.checked)
                              onTaskAssigneesChange([...taskAssignees, member.id]);
                            else
                              onTaskAssigneesChange(taskAssignees.filter((id) => id !== member.id));
                          }}
                          disabled={assignToAll}
                          className="w-5 h-5 rounded-[6px] border-2 border-slate-300 dark:border-slate-600 focus:ring-0 cursor-pointer appearance-none checked:bg-indigo-500 checked:border-indigo-500 transition-colors"
                        />
                        {taskAssignees.includes(member.id) && (
                          <Check
                            className="absolute w-3.5 h-3.5 text-white pointer-events-none"
                            strokeWidth={3}
                          />
                        )}
                      </div>
                      <ZaloStyleAvatar
                        userId={member.id}
                        displayName={member.name ?? member.id}
                        avatarUrl={member.avatar}
                        className="w-10 h-10 shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[14px] text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {labelFor(member.id, member.name)}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {roleLabel(member.role)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">
                  Ghi chú thêm
                </label>
                <textarea
                  rows={4}
                  placeholder="Nhập mô tả hoặc ghi chú cho công việc..."
                  value={taskNote}
                  onChange={(e) => onTaskNoteChange(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 outline-none border border-black/5 dark:border-white/5 focus:border-indigo-500/50 focus:bg-white dark:focus:bg-zinc-800 resize-y text-[14px] font-medium transition-all placeholder:text-muted-foreground/70"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block flex items-center justify-between">
                  <span>Công việc chi tiết từng người</span>
                  {!assignToAll && eligibleMembers.length > 0 && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 px-2 py-0.5 rounded-full lowercase normal-case tracking-normal">
                      Tùy chọn
                    </span>
                  )}
                </label>
                <div className="border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-black/5 dark:divide-white/5 bg-slate-50 dark:bg-zinc-800/50 shadow-sm">
                  {!assignToAll && eligibleMembers.length === 0 ? (
                    <div className="px-5 py-6 text-center text-[13px] font-semibold text-muted-foreground">
                      Vui lòng chọn người ở mục{' '}
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">
                        Giao Cho
                      </span>{' '}
                      để thêm công việc chi tiết.
                    </div>
                  ) : (
                    (assignToAll ? members : eligibleMembers).map((m) => {
                      const existing = subtaskRows.find(
                        (r) => String(r.assigneeId) === String(m.id),
                      );
                      const value = String(existing?.content ?? '');
                      return (
                        <div key={m.id} className="p-4 bg-white dark:bg-zinc-900/50">
                          <div className="flex items-center gap-2.5 mb-3">
                            <ZaloStyleAvatar
                              userId={m.id}
                              displayName={m.name ?? m.id}
                              avatarUrl={m.avatar}
                              className="w-6 h-6"
                            />
                            <div className="text-[13px] font-extrabold text-foreground">
                              {labelFor(m.id, m.name)}
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            value={value}
                            onChange={(e) => {
                              const nextText = e.target.value;
                              const id = String(m.id);
                              const has = subtaskRows.some((r) => String(r.assigneeId) === id);
                              if (!nextText.trim()) {
                                if (has) {
                                  onSubtaskRowsChange?.(
                                    subtaskRows.filter((r) => String(r.assigneeId) !== id),
                                  );
                                }
                                return;
                              }
                              if (has) {
                                onSubtaskRowsChange?.(
                                  subtaskRows.map((r) =>
                                    String(r.assigneeId) === id ? { ...r, content: nextText } : r,
                                  ),
                                );
                              } else {
                                onSubtaskRowsChange?.([
                                  ...subtaskRows,
                                  { assigneeId: id, content: nextText },
                                ]);
                              }
                            }}
                            placeholder="Nhập nội dung chi tiết..."
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 focus:border-indigo-500/40 outline-none text-[13px] font-medium resize-y leading-relaxed min-h-[60px] transition-colors"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-5 border-t border-black/5 dark:border-white/5 shrink-0 flex items-center justify-between gap-3 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
              <div className="flex items-center">
                {isEditing && onDeleteTask ? (
                  <button
                    type="button"
                    onClick={() => void onDeleteTask()}
                    disabled={submitBusy}
                    className="px-5 py-3 rounded-xl font-bold text-[14px] bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-40 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Hủy việc
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-3 flex-1 justify-end">
                <button
                  type="button"
                  onClick={resetAndClose}
                  disabled={submitBusy}
                  className="px-5 py-3 rounded-xl font-bold text-[14px] bg-slate-100 dark:bg-zinc-800 text-foreground hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || submitBusy}
                  onClick={() => {
                    if (!canSubmit || submitBusy) return;
                    void onSubmitTask();
                  }}
                  className={`px-8 py-3 rounded-xl font-bold text-[14px] text-white transition-all flex items-center justify-center gap-2 ${
                    canSubmit && !submitBusy
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5'
                      : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />{' '}
                  {isEditing ? 'Lưu thay đổi' : 'Giao việc ngay'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
