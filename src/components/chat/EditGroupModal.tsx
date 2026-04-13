import { AnimatePresence, motion } from 'motion/react';
import { Camera, Loader2 } from 'lucide-react';

type EditGroupModalProps = {
  open: boolean;
  groupName: string;
  avatarPreview: string | null;
  isSaving: boolean;
  onClose: () => void;
  onGroupNameChange: (value: string) => void;
  onAvatarFileChange: (file: File | null) => void;
  onSubmit: () => void;
};

export function EditGroupModal({
  open,
  groupName,
  avatarPreview,
  isSaving,
  onClose,
  onGroupNameChange,
  onAvatarFileChange,
  onSubmit,
}: EditGroupModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 dark:bg-black/45 backdrop-blur-[1px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-[420px] rounded-xl border border-[#dcdcdc] dark:border-white/10 bg-[#f7f7f8] dark:bg-[#1f1f1f] shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#dddddd] dark:border-white/10">
              <h3 className="font-bold text-[22px] leading-none text-[#162846] dark:text-white">Đổi tên nhóm</h3>
            </div>

            <div className="px-4 py-5">
              <label className="mx-auto w-[76px] h-[76px] rounded-full cursor-pointer block select-none">
                <span className="w-full h-full rounded-full border-2 border-[#a4a9b0] dark:border-white/25 flex items-center justify-center bg-white/80 dark:bg-white/5">
                  <span className="w-[66px] h-[66px] rounded-full border border-[#c5c9cf] dark:border-white/20 bg-white dark:bg-[#242424] flex items-center justify-center overflow-hidden relative group">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Group avatar" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-[#9aa3b2]" />
                    )}
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
                  </span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onAvatarFileChange(e.target.files?.[0] ?? null)}
                  disabled={isSaving}
                />
              </label>

              <p className="mt-4 text-center text-[16px] leading-6 text-[#1f3150] dark:text-white/90 font-medium">
                Bạn có chắc chắn muốn đổi tên nhóm, khi xác nhận tên nhóm mới sẽ hiển thị với tất cả thành viên.
              </p>

              <div className="mt-4">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => onGroupNameChange(e.target.value)}
                  placeholder="Nhập tên nhóm"
                  disabled={isSaving}
                  className="w-full h-[42px] px-3 rounded-lg border border-[#d2d2d2] bg-[#f6f6f6] dark:bg-white/5 dark:border-white/15 text-[16px] text-[#2a3650] dark:text-white outline-none focus:border-[#1f6ef4] disabled:opacity-70"
                />
              </div>
            </div>

            <div className="px-4 pb-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="h-[40px] min-w-[80px] rounded-lg bg-[#d8dce2] text-[#1b2f4d] font-semibold text-[16px] hover:bg-[#cfd3d9] transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSaving || !groupName.trim()}
                className="h-[40px] min-w-[108px] rounded-lg bg-[#1c6bf0] text-white font-semibold text-[16px] hover:bg-[#165cd0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Xác nhận
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
