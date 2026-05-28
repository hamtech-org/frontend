import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

/** `dangerSoft`: nút xác nhận nền đỏ nhạt chữ đỏ đậm (kiểu Zalo — giải tán nhóm). */
export type ConfirmModalVariant = 'primary' | 'danger' | 'dangerSoft';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Hủy',
  variant = 'primary',
  isConfirming = false,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
      : variant === 'dangerSoft'
        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/45 dark:text-red-200 dark:hover:bg-red-900/55'
        : 'bg-[#0068ff] text-white hover:bg-blue-700 shadow-sm';

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 shadow-2xl backdrop-blur-[2px]"
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-[400px] w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
              <h3 id="confirm-modal-title" className="font-bold text-[17px]">
                {title}
              </h3>
              <button
                type="button"
                disabled={isConfirming}
                onClick={onClose}
                className="text-muted-foreground hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6 stroke-[1.5]" />
              </button>
            </div>
            {description ? (
              <div className="px-6 py-5">
                <div className="text-[15px] text-muted-foreground leading-relaxed font-medium">
                  {description}
                </div>
              </div>
            ) : null}
            <div className="px-6 pb-5 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isConfirming}
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg font-bold text-[15px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-black dark:text-white disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => onConfirm()}
                className={`px-6 py-2.5 rounded-lg font-bold text-[15px] transition-colors disabled:opacity-50 ${confirmClass}`}
              >
                {isConfirming ? 'Đang xử lý…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
