import { AnimatePresence, motion } from 'motion/react';
import { BarChart2, Check, Lock, Pin, X } from 'lucide-react';

type PollOption = { text: string; voters?: string[] };

export type PollVoteModalPoll = {
  pollId: string;
  question: string;
  options: PollOption[];
  isClosed?: boolean;
  isMultipleChoice?: boolean;
  isPinned?: boolean;
};

type PollVoteModalProps = {
  open: boolean;
  onClose: () => void;
  poll: PollVoteModalPoll | null;
  currentUserId: string;
  onToggleVote: (pollId: string, optionIndex: number) => void;
  onClosePoll?: (pollId: string) => void;
  onTogglePinPoll?: (pollId: string) => void;
};

export function PollVoteModal({
  open,
  onClose,
  poll,
  currentUserId,
  onToggleVote,
  onClosePoll,
  onTogglePinPoll,
}: PollVoteModalProps) {
  const total = poll?.options?.reduce((sum, option) => sum + (option.voters?.length ?? 0), 0) ?? 0;
  const userVotedIndexes = new Set<number>();
  if (poll?.options) {
    poll.options.forEach((opt, idx) => {
      if ((opt.voters ?? []).includes(currentUserId)) userVotedIndexes.add(idx);
    });
  }

  return (
    <AnimatePresence>
      {open && poll && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[480px] w-full shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden max-h-[88vh]"
          >
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-bold text-[17px] text-black dark:text-white">Bình chọn</h3>
              </div>
              <div className="flex items-center gap-2">
                {onTogglePinPoll ? (
                  <button
                    type="button"
                    title={poll.isPinned ? 'Gỡ ghim bình chọn' : 'Ghim bình chọn'}
                    onClick={() => onTogglePinPoll(poll.pollId)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border ${
                      poll.isPinned
                        ? 'bg-blue-600/10 border-blue-600/30 text-blue-600 hover:bg-blue-600/15'
                        : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                ) : null}
                {onClosePoll && !poll.isClosed ? (
                  <button
                    type="button"
                    title="Khóa bình chọn"
                    onClick={() => onClosePoll(poll.pollId)}
                    className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar space-y-4">
              <div className="rounded-xl bg-black/5 dark:bg-white/5 p-4">
                <p className="text-[14px] font-extrabold text-black dark:text-white">
                  {poll.question}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {poll.isMultipleChoice ? 'Chọn nhiều đáp án' : 'Chọn một đáp án'} • {total} lượt
                  bình chọn
                </p>
              </div>

              <div className="space-y-2">
                {poll.options.map((option, idx) => {
                  const votes = option.voters?.length ?? 0;
                  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
                  const checked = userVotedIndexes.has(idx);
                  const disabled = !!poll.isClosed;
                  return (
                    <button
                      key={`${poll.pollId}-${idx}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggleVote(poll.pollId, idx)}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                        disabled
                          ? 'opacity-60 cursor-not-allowed border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5'
                          : checked
                            ? 'border-blue-600/40 bg-blue-600/10 hover:bg-blue-600/15'
                            : 'border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border ${
                              checked
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-black/20 dark:border-white/20'
                            }`}
                          >
                            {checked ? <Check className="w-3.5 h-3.5 text-white" /> : null}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-black dark:text-white">
                              {option.text}
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {votes} lượt ({pct}%)
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 shrink-0 flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">
                {poll.isClosed ? 'Bình chọn đã đóng' : 'Bấm để bình chọn'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-bold text-[13px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
