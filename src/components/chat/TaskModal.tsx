import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCheck, CheckSquare, Trash2, Users, X } from 'lucide-react';
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
  const labelFor = (id: string, name: string) => {
    if (currentUserId && id === currentUserId) return 'Bạn';
    return name;
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
  const canSubmit =
    taskTitle.trim().length > 0 && hasDeadline && hasAssignees && (hasSubtasks || hasAssignees);

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
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[480px] w-full shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden max-h-[90vh]"
          >
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-bold text-[17px] text-black dark:text-white">
                  {isEditing ? 'Chỉnh sửa công việc' : 'Giao việc & Nhắc hẹn'}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {isEditing && onDeleteTask ? (
                  <button
                    type="button"
                    onClick={() => void onDeleteTask()}
                    disabled={submitBusy}
                    className="w-8 h-8 rounded-full bg-red-500/10 dark:bg-red-500/15 flex items-center justify-center hover:bg-red-500/20 transition-colors disabled:opacity-40"
                    title="Hủy công việc"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={resetAndClose}
                  disabled={submitBusy}
                  className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar space-y-5">
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Tiêu đề công việc
                </label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề công việc..."
                  value={taskTitle}
                  onChange={(e) => onTaskTitleChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none border border-transparent focus:border-green-500/50 text-[14px] font-medium transition-all"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Thời hạn
                </label>
                <input
                  type="datetime-local"
                  value={taskDeadline}
                  onChange={(e) => onTaskDeadlineChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none border border-transparent focus:border-green-500/50 text-[14px] font-medium transition-all text-black dark:text-white"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Giao cho
                </label>
                <button
                  type="button"
                  onClick={() => onAssignToAllChange?.(!assignToAll)}
                  className={`w-full mb-3 flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors ${
                    assignToAll
                      ? 'border-green-500/40 bg-green-500/10'
                      : 'border-black/5 dark:border-white/10 bg-white dark:bg-black/20 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-foreground">Giao cho cả nhóm</p>
                      <p className="text-[11px] text-muted-foreground">
                        Tự động áp dụng cho tất cả thành viên hiện tại
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                      assignToAll ? 'bg-green-500' : 'bg-black/15 dark:bg-white/15'
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        assignToAll ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>
                <div className="border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-black/5 dark:divide-white/5 bg-white dark:bg-black/20">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className={`flex items-center gap-3.5 px-4 py-2.5 transition-colors group ${
                        assignToAll
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
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
                          className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 focus:ring-0 cursor-pointer appearance-none checked:bg-green-500 checked:border-green-500 transition-colors"
                        />
                        {taskAssignees.includes(member.id) && (
                          <CheckCheck className="absolute w-3 h-3 text-white pointer-events-none" />
                        )}
                      </div>
                      <ZaloStyleAvatar
                        userId={member.id}
                        displayName={member.name ?? member.id}
                        avatarUrl={member.avatar}
                        className="w-9 h-9"
                      />
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-[14px] text-black dark:text-white truncate group-hover:text-green-600 transition-colors">
                          {labelFor(member.id, member.name)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{member.role}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Ghi chú thêm
                </label>
                <textarea
                  rows={5}
                  placeholder="Nhập mô tả hoặc ghi chú..."
                  value={taskNote}
                  onChange={(e) => onTaskNoteChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none border border-transparent focus:border-green-500/50 resize-y text-[14px] font-medium transition-all"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Công việc cụ thể theo từng người
                </label>
                <div className="border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-black/5 dark:divide-white/5 bg-white dark:bg-black/20">
                  {!assignToAll && eligibleMembers.length === 0 ? (
                    <div className="px-4 py-3 text-[12px] font-semibold text-muted-foreground">
                      Hãy chọn người ở mục{' '}
                      <span className="font-extrabold text-foreground/80">GIAO CHO</span> để thêm
                      công việc cụ thể.
                    </div>
                  ) : (
                    (assignToAll ? members : eligibleMembers).map((m) => {
                      const existing = subtaskRows.find(
                        (r) => String(r.assigneeId) === String(m.id),
                      );
                      const value = String(existing?.content ?? '');
                      return (
                        <div key={m.id} className="px-4 py-3">
                          <div className="mb-2 text-[13px] font-extrabold text-foreground">
                            {labelFor(m.id, m.name)}
                          </div>
                          <textarea
                            rows={3}
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
                            placeholder="Nội dung công việc"
                            className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-green-500/40 outline-none text-sm resize-y leading-5 min-h-[76px]"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 shrink-0 flex gap-2.5">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={submitBusy}
                className="px-4 py-2.5 rounded-xl font-bold text-[14px] bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 transition-colors disabled:opacity-40"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!canSubmit || submitBusy}
                onClick={() => void onSubmitTask()}
                className={`flex-1 py-2.5 rounded-xl font-bold text-[14px] text-white transition-all flex items-center justify-center gap-2 ${
                  canSubmit && !submitBusy
                    ? 'bg-green-500 hover:bg-green-600 shadow-md shadow-green-500/20 hover:-translate-y-0.5'
                    : 'bg-black/10 dark:bg-white/10 text-black/40 dark:text-white/40 cursor-not-allowed'
                }`}
              >
                <CheckSquare className="w-4 h-4" /> {isEditing ? 'Lưu thay đổi' : 'Giao việc'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
