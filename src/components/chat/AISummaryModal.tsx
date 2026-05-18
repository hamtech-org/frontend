import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';

type AISummaryModalProps = {
  open: boolean;
  onClose: () => void;
  conversationName: string | null | undefined;
  aiSummaryLoading: boolean;
  aiSummaryResult: string;
  onRerunSummary: () => void;
};

export function AISummaryModal({
  open,
  onClose,
  conversationName,
  aiSummaryLoading,
  aiSummaryResult,
  onRerunSummary,
}: AISummaryModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[520px] w-full shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden max-h-[88vh]"
          >
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0068ff] to-[#8c52ff] flex items-center justify-center shadow-md">
                  <Sparkles className="w-[18px] h-[18px] text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-black dark:text-white leading-tight">
                    AI Tóm tắt tin nhắn nhóm
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {conversationName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
              {aiSummaryLoading ? (
                <div className="flex flex-col items-center justify-center gap-5 py-12">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0068ff] to-[#8c52ff] flex items-center justify-center shadow-xl shadow-purple-600/20 animate-pulse">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="font-bold text-[15px] text-black dark:text-white">
                      AI đang phân tích...
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      Đang tổng hợp hội thoại gần đây và phần chưa đọc
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/5 to-purple-600/5 border border-blue-600/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="text-[12px] font-bold text-purple-600 uppercase tracking-wider">
                        Kết quả phân tích AI
                      </span>
                    </div>
                    <div className="space-y-3">
                      {aiSummaryResult
                        .split('\n\n')
                        .filter(Boolean)
                        .map((para, i) => (
                          <p
                            key={i}
                            className="whitespace-pre-line text-[14px] text-black dark:text-white/90 leading-relaxed font-medium"
                          >
                            {para}
                          </p>
                        ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onRerunSummary}
                    className="w-full py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[13px] font-bold text-muted-foreground flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-[14px] h-[14px]" /> Phân tích lại
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
