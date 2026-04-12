import { AnimatePresence, motion } from 'motion/react';
import { BarChart2, X } from 'lucide-react';

type PollModalProps = {
  open: boolean;
  onClose: () => void;
  pollQuestion: string;
  onPollQuestionChange: (value: string) => void;
  pollOptions: string[];
  onPollOptionsChange: (options: string[]) => void;
  onCreatePoll: () => void;
};

export function PollModal({
  open,
  onClose,
  pollQuestion,
  onPollQuestionChange,
  pollOptions,
  onPollOptionsChange,
  onCreatePoll,
}: PollModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[460px] w-full shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden max-h-[88vh]"
          >
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-bold text-[17px] text-black dark:text-white">Tạo bình chọn</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar space-y-5">
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Câu hỏi bình chọn
                </label>
                <textarea
                  rows={2}
                  placeholder="Nhập câu hỏi của bạn..."
                  value={pollQuestion}
                  onChange={(e) => onPollQuestionChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none border border-transparent focus:border-orange-500/50 dark:focus:bg-black/40 resize-none text-[14px] font-medium transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Các lựa chọn
                </label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[12px] font-bold text-muted-foreground shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <input
                      type="text"
                      placeholder={`Lựa chọn ${String.fromCharCode(65 + idx)}...`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[idx] = e.target.value;
                        onPollOptionsChange(next);
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 outline-none border border-transparent focus:border-orange-500/50 text-[14px] font-medium transition-all"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onPollOptionsChange(pollOptions.filter((_, i) => i !== idx))}
                        className="w-7 h-7 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={() => onPollOptionsChange([...pollOptions, ''])}
                    className="flex items-center gap-2 text-[13px] font-bold text-blue-600 hover:text-blue-700 p-2 -mx-2 rounded-xl hover:bg-blue-600/5 transition-colors mt-1"
                  >
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-blue-600/50 flex items-center justify-center">
                      <span className="text-lg leading-none">+</span>
                    </div>
                    Thêm lựa chọn
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-[13px] font-semibold">Cho phép chọn nhiều đáp án</span>
                <div className="w-10 h-6 rounded-full bg-blue-600 flex items-center justify-end pr-1 cursor-pointer shadow-inner">
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 shrink-0 flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl font-bold text-[14px] bg-black/5 dark:bg-white/10 text-black dark:text-white hover:bg-black/10 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
                onClick={onCreatePoll}
                className={`flex-1 py-2.5 rounded-xl font-bold text-[14px] text-white transition-all flex items-center justify-center gap-2 ${
                  pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2
                    ? 'bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20 hover:-translate-y-0.5'
                    : 'bg-black/10 dark:bg-white/10 text-black/40 dark:text-white/40 cursor-not-allowed'
                }`}
              >
                <BarChart2 className="w-4 h-4" /> Gửi bình chọn
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
