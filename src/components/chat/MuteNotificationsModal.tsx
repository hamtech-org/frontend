import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';

export type MuteNotificationsApplyPayload =
  | { kind: 'muteFor'; muteFor: '1m' | '5m' | '10m' }
  | { kind: 'untilIso'; notificationsMutedUntil: string }
  | { kind: 'untilUserUnmutes' }
  /** Xóa lịch tắt tạm (chỉ `notificationsMutedUntil`), bật lại thông báo khi không còn tắt vĩnh viễn. */
  | { kind: 'clearScheduledMute' };

/** 8:00 sáng theo giờ máy — nếu đã qua hôm nay thì chuyển sang ngày mai. */
export function nextLocalEightAmIsoString(): string {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
  if (t.getTime() <= now.getTime()) {
    t.setDate(t.getDate() + 1);
  }
  return t.toISOString();
}

function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

type MuteOptionId = '1m' | '5m' | '10m' | 'forever';

type MuteNotificationsModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: MuteNotificationsApplyPayload) => Promise<void>;
  isSubmitting?: boolean;
  /** `edit`: chỉnh sửa / hủy lịch tắt tạm đang hiệu lực. */
  mode?: 'create' | 'edit';
  /** Bắt buộc khi `mode === 'edit'` — ISO mốc hiện tại. */
  scheduledUntilIso?: string | null;
};

const OPTIONS: { id: MuteOptionId; label: string }[] = [
  { id: '1m', label: 'Trong 1 phút' },
  { id: '5m', label: 'Trong 5 phút' },
  { id: '10m', label: 'Trong 10 phút' },
  { id: 'forever', label: 'Cho đến khi được mở lại' },
];

export function MuteNotificationsModal({
  open,
  onClose,
  onConfirm,
  isSubmitting = false,
  mode = 'create',
  scheduledUntilIso = null,
}: MuteNotificationsModalProps) {
  const [selected, setSelected] = useState<MuteOptionId>('1m');
  const [customUntil, setCustomUntil] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit') {
      const iso = scheduledUntilIso?.trim() ?? '';
      setCustomUntil(iso ? isoToDatetimeLocalValue(iso) : '');
    } else {
      setSelected('1m');
    }
  }, [open, mode, scheduledUntilIso]);

  const handleConfirmCreate = async () => {
    if (selected === 'forever') {
      await onConfirm({ kind: 'untilUserUnmutes' });
      return;
    }
    await onConfirm({ kind: 'muteFor', muteFor: selected });
  };

  const handleSaveEdit = async () => {
    const t = new Date(customUntil).getTime();
    if (!customUntil.trim() || !Number.isFinite(t)) {
      toast.error('Chọn ngày giờ hợp lệ');
      return;
    }
    if (t <= Date.now()) {
      toast.error('Mốc phải nằm trong tương lai');
      return;
    }
    await onConfirm({ kind: 'untilIso', notificationsMutedUntil: new Date(customUntil).toISOString() });
  };

  const handleClearSchedule = async () => {
    await onConfirm({ kind: 'clearScheduledMute' });
  };

  const title = mode === 'edit' ? 'Chỉnh sửa nhắc tắt thông báo' : 'Xác nhận';

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
                {title}
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

            {mode === 'edit' ? (
              <>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-[14px] text-muted-foreground leading-relaxed font-medium">
                    Đổi mốc thời gian sẽ tự bật lại thông báo sau mốc mới, hoặc hủy lịch để bật lại ngay (nếu bạn không bật chế độ tắt vĩnh viễn).
                  </p>
                  <div>
                    <label htmlFor="mute-edit-until" className="mb-2 block text-[13px] font-semibold text-foreground">
                      Tắt thông báo đến
                    </label>
                    <input
                      id="mute-edit-until"
                      type="datetime-local"
                      value={customUntil}
                      onChange={(e) => setCustomUntil(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[15px] font-medium text-foreground outline-none focus:ring-2 focus:ring-[#0068ff]/40 dark:border-white/10 dark:bg-black/30"
                    />
                  </div>
                </div>
                <div className="px-6 pb-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={onClose}
                    className="order-3 sm:order-1 px-6 py-2.5 rounded-lg font-bold text-[15px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-black dark:text-white disabled:opacity-50 sm:mr-auto"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleClearSchedule()}
                    className="order-2 px-6 py-2.5 rounded-lg font-bold text-[15px] border border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang xử lý…' : 'Hủy lịch'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleSaveEdit()}
                    className="order-1 sm:order-3 px-6 py-2.5 rounded-lg font-bold text-[15px] bg-[#0068ff] text-white hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang xử lý…' : 'Lưu mốc'}
                  </button>
                </div>
              </>
            ) : (
              <>
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
                    onClick={() => void handleConfirmCreate()}
                    className="px-6 py-2.5 rounded-lg font-bold text-[15px] bg-[#0068ff] text-white hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang xử lý…' : 'Đồng ý'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
