import { AnimatePresence, motion } from 'motion/react';
import { Search, UserPlus, X } from 'lucide-react';

type AddFriendModalProps = {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  /** Gọi khi bấm gửi lời mời (chưa có API thì parent có thể no-op). */
  onSubmit: () => void;
};

export function AddFriendModal({ open, query, onQueryChange, onClose, onSubmit }: AddFriendModalProps) {
  const trimmed = query.trim();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-friend-title"
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[480px] w-full shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden max-h-[88vh]"
          >
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 id="add-friend-title" className="font-bold text-[17px] text-black dark:text-white">
                  Thêm bạn bè
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Email hoặc số điện thoại..."
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none border border-transparent focus:bg-white dark:focus:bg-black focus:border-blue-600/50 shadow-sm text-[14px] font-medium transition-all text-black dark:text-white"
                />
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Gửi lời mời kết bạn qua email hoặc số điện thoại. API tìm kiếm / gửi lời mời sẽ được nối khi backend sẵn sàng.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={!trimmed}
                  onClick={() => onSubmit()}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Gửi lời mời
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
