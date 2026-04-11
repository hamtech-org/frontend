import { AnimatePresence, motion } from 'motion/react';
import { CheckCheck, X } from 'lucide-react';

type MarkReadModalProps = {
  open: boolean;
  onClose: () => void;
};

export function MarkReadModal({ open, onClose }: MarkReadModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 shadow-2xl backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-[400px] w-full overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
              <h3 className="font-bold text-[17px]">Xác nhận</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-black dark:hover:text-white transition-colors"
              >
                <X className="w-6 h-6 stroke-[1.5]" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-[15px] text-muted-foreground leading-relaxed font-medium mb-5">
                Toàn bộ tin nhắn trong khu vực này sẽ được đánh dấu đã đọc. Bạn có muốn tiếp tục?
              </p>
              <label className="flex items-center gap-2 cursor-pointer w-fit group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="w-[18px] h-[18px] rounded-[4px] border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-0 cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors"
                  />
                  <CheckCheck className="w-3 h-3 text-white absolute opacity-0 pointer-events-none group-has-[:checked]:opacity-100 transition-opacity" />
                </div>
                <span className="text-[15px] font-medium text-black/80 dark:text-white/80 select-none">
                  Không hiện lần tới
                </span>
              </label>
            </div>
            <div className="px-6 pb-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg font-bold text-[15px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-black dark:text-white"
              >
                Không
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg font-bold text-[15px] bg-[#0068ff] text-white hover:bg-blue-700 shadow-sm transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
