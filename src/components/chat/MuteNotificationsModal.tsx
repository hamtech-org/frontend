import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

export type MuteNotificationsApplyPayload =
  | { kind: 'muteFor'; muteFor: '1h' | '4h' }
  | { kind: 'untilIso'; notificationsMutedUntil: string }
  | { kind: 'untilUserUnmutes' };

/** 8:00 sáng theo giờ máy — nếu đã qua hôm nay thì chuyển sang ngày mai. */
export function nextLocalEightAmIsoString(): string {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
  if (t.getTime() <= now.getTime()) {
    t.setDate(t.getDate() + 1);
  }
  return t.toISOString();
}

type MuteOptionId = '1h' | '4h' | '8am' | 'forever';

type MuteNotificationsModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: MuteNotificationsApplyPayload) => Promise<void>;
  isSubmitting?: boolean;
};

const OPTIONS: { id: MuteOptionId; label: string }[] = [
  { id: '1h', label: 'Trong 1 giờ' },
  { id: '4h', label: 'Trong 4 giờ' },
  { id: '8am', label: 'Cho đến 8:00 sáng' },
  { id: 'forever', label: 'Cho đến khi được mở lại' },
];

export function MuteNotificationsModal({
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
}: MuteNotificationsModalProps) {
  const [selected, setSelected] = useState<MuteOptionId>('1h');

  useEffect(() => {
    if (open) setSelected('1h');
  }, [open]);

  const handleConfirm = async () => {
    if (selected === 'forever') {
      await onConfirm({ kind: 'untilUserUnmutes' });
      return;
    }
    if (selected === '8am') {
      await onConfirm({ kind: 'untilIso', notificationsMutedUntil: nextLocalEightAmIsoString() });
      return;
    }
    await onConfirm({ kind: 'muteFor', muteFor: selected });
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => !isSubmitting && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mute-modal-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-xl max-w-[400px] w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
              <h3 id="mute-modal-title" className="font-bold text-[17px] text-foreground">
                Xác nhận
              </h3>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="text-muted-foreground hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6 stroke-[1.5]" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-[15px] text-muted-foreground leading-relaxed font-medium mb-4">
                Bạn có chắc muốn tắt thông báo hội thoại này:
              </p>
              <fieldset className="space-y-3">
                <legend className="sr-only">Thời lượng tắt thông báo</legend>
                {OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-0.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  >
                    <input
                      type="radio"
                      name="mute-duration"
                      value={opt.id}
                      checked={selected === opt.id}
                      onChange={() => setSelected(opt.id)}
                      disabled={isSubmitting}
                      className="h-4 w-4 shrink-0 accent-[#0068ff]"
                    />
                    <span className="text-[15px] font-medium text-foreground">{opt.label}</span>
                  </label>
                ))}
              </fieldset>
            </div>
            <div className="px-6 pb-5 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg font-bold text-[15px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-black dark:text-white disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleConfirm()}
                className="px-6 py-2.5 rounded-lg font-bold text-[15px] bg-[#0068ff] text-white hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Đang xử lý…' : 'Đồng ý'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
