import { AnimatePresence, motion } from 'motion/react';
import { CheckCheck, CheckSquare, X } from 'lucide-react';
import { mockMembers } from './chatMocks';

type TaskModalProps = {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
  onTaskTitleChange: (value: string) => void;
  taskDeadline: string;
  onTaskDeadlineChange: (value: string) => void;
  taskNote: string;
  onTaskNoteChange: (value: string) => void;
  taskAssignees: string[];
  onTaskAssigneesChange: (ids: string[]) => void;
  onSubmitTask: () => void;
};

export function TaskModal({
  open,
  onClose,
  taskTitle,
  onTaskTitleChange,
  taskDeadline,
  onTaskDeadlineChange,
  taskNote,
  onTaskNoteChange,
  taskAssignees,
  onTaskAssigneesChange,
  onSubmitTask,
}: TaskModalProps) {
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
                <h3 className="font-bold text-[17px] text-black dark:text-white">Giao việc / Nhắc hẹn</h3>
              </div>
              <button
                type="button"
                onClick={resetAndClose}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
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
                  Thời hạn (Deadline)
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
                <div className="border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-black/5 dark:divide-white/5 bg-white dark:bg-black/20">
                  {mockMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3.5 px-4 py-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                    >
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={taskAssignees.includes(member.id)}
                          onChange={(e) => {
                            if (e.target.checked) onTaskAssigneesChange([...taskAssignees, member.id]);
                            else onTaskAssigneesChange(taskAssignees.filter((id) => id !== member.id));
                          }}
                          className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 focus:ring-0 cursor-pointer appearance-none checked:bg-green-500 checked:border-green-500 transition-colors"
                        />
                        {taskAssignees.includes(member.id) && (
                          <CheckCheck className="absolute w-3 h-3 text-white pointer-events-none" />
                        )}
                      </div>
                      <img
                        src={member.avatar}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                        alt=""
                      />
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-[14px] text-black dark:text-white truncate group-hover:text-green-600 transition-colors">
                          {member.name}
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
                  rows={3}
                  placeholder="Nhập mô tả hoặc ghi chú..."
                  value={taskNote}
                  onChange={(e) => onTaskNoteChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none border border-transparent focus:border-green-500/50 resize-none text-[14px] font-medium transition-all"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 shrink-0 flex gap-2.5">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2.5 rounded-xl font-bold text-[14px] bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!taskTitle.trim() || taskAssignees.length === 0}
                onClick={() => void onSubmitTask()}
                className={`flex-1 py-2.5 rounded-xl font-bold text-[14px] text-white transition-all flex items-center justify-center gap-2 ${taskTitle.trim() && taskAssignees.length > 0 ? 'bg-green-500 hover:bg-green-600 shadow-md shadow-green-500/20 hover:-translate-y-0.5' : 'bg-black/10 dark:bg-white/10 text-black/40 dark:text-white/40 cursor-not-allowed'}`}
              >
                <CheckSquare className="w-4 h-4" /> Giao việc
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
