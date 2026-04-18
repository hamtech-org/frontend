import { AnimatePresence, motion } from 'motion/react';
import { MessageSquare, X } from 'lucide-react';
import type { IMessage } from '@/types/chat.types';
import { PinnedRowPreview } from '@/components/chat/PinnedMessagesBar';

export const MAX_PINNED_PER_CONVERSATION = 3;

type PinLimitModalProps = {
  open: boolean;
  /** 3 tin đang ghim (thứ tự MRU: [mới … cũ]). */
  currentPinned: IMessage[];
  /** Tin sắp ghim thêm. */
  pendingPin: IMessage | null;
  /** Chỉ số tin trong `currentPinned` sẽ bị bỏ ghim (0…2), null = chưa chọn. */
  replaceIndex: number | null;
  onReplaceIndexChange: (index: number) => void;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function PinLimitModal({
  open,
  currentPinned,
  pendingPin,
  replaceIndex,
  onReplaceIndexChange,
  isSubmitting = false,
  onClose,
  onConfirm,
}: PinLimitModalProps) {
  const n = currentPinned.length;
  const canConfirm = replaceIndex !== null && n > 0 && replaceIndex >= 0 && replaceIndex < n;

  return (
    <AnimatePresence>
      {open && pendingPin && n > 0 && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pin-limit-title"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-[480px] w-full overflow-hidden shadow-2xl border border-black/5 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
              <h3 id="pin-limit-title" className="font-bold text-[17px] text-[#0a1629] dark:text-white">
                Cập nhật danh sách ghim
              </h3>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 p-1"
              >
                <X className="w-6 h-6 stroke-[1.5]" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Đã đạt giới hạn {MAX_PINNED_PER_CONVERSATION} ghim. Vui lòng chọn ghim cần bỏ để cập nhật ghim
                mới.
              </p>

              <div
                className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-zinc-900/50 overflow-hidden divide-y divide-slate-200 dark:divide-slate-600"
                role="radiogroup"
                aria-label="Chọn tin nhắn sẽ bỏ ghim"
              >
                {currentPinned.map((msg, index) => {
                  const id = `pin-limit-radio-${msg.messageId}`;
                  const checked = replaceIndex === index;
                  return (
                    <label
                      key={msg.messageId}
                      htmlFor={id}
                      className={`flex items-stretch gap-3 px-3 py-3 cursor-pointer transition-colors ${
                        checked
                          ? 'bg-blue-50/90 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-zinc-800/80'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#0068ff] flex items-center justify-center shrink-0 shadow-sm self-start mt-0.5">
                        <MessageSquare className="w-[18px] h-[18px] text-white" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Tin nhắn</p>
                        <div className="text-[13px] leading-snug mt-0.5">
                          <PinnedRowPreview msg={msg} />
                        </div>
                      </div>
                      <div className="flex items-center shrink-0 self-center">
                        <input
                          id={id}
                          type="radio"
                          name="pin-limit-replace"
                          checked={checked}
                          disabled={isSubmitting}
                          onChange={() => onReplaceIndexChange(index)}
                          className="w-[18px] h-[18px] accent-[#0068ff] cursor-pointer disabled:opacity-50"
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="px-5 pb-5 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg font-bold text-[15px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-foreground transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmitting || !canConfirm}
                onClick={() => void onConfirm()}
                className="px-5 py-2.5 rounded-lg font-bold text-[15px] bg-[#0068ff] text-white hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 min-w-[100px]"
              >
                {isSubmitting ? 'Đang xử lý…' : 'Cập nhật'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
