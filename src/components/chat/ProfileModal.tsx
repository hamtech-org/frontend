import { AnimatePresence, motion } from 'motion/react';
import { Calendar, Camera, Mail, Phone, Quote, User, X } from 'lucide-react';
import { useState } from 'react';

type ProfileModalProps = {
  open?: boolean;
  onClose?: () => void;
};

export function ProfileModal({ open: externalOpen, onClose: externalOnClose }: ProfileModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const handleClose = externalOnClose || (() => setInternalOpen(false));
  const handleOpen = () => {
    if (externalOpen === undefined) {
      setInternalOpen(true);
    }
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 shadow-2xl backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[400px] w-full shadow-2xl border border-black/5 dark:border-white/10 relative max-h-[90vh] flex flex-col overflow-hidden"
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 backdrop-blur-md transition-colors z-20 shadow-sm"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
              <div className="relative h-32 shrink-0 group">
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
                  className="w-full h-full object-cover"
                  alt="Cover"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                <button
                  type="button"
                  className="absolute bottom-4 right-4 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-10"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 relative pb-6">
                <div className="flex flex-col items-center -mt-12 relative z-10">
                  <div className="relative group/avatar cursor-pointer" onClick={handleOpen}>
                    <div className="w-24 h-24 rounded-full border-[4px] border-white dark:border-[#1a1a1a] overflow-hidden bg-white shadow-md">
                      <img
                        src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop"
                        className="w-full h-full object-cover"
                        alt="Profile avatar"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <h3 className="font-bold text-2xl text-black dark:text-white mt-2 text-center">
                    Marcus Chen
                  </h3>
                  <div className="text-[13px] font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5 justify-center">
                    Đang hoạt động{' '}
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                        <User className="w-[18px] h-[18px] text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 block truncate">
                          Giới tính
                        </span>
                        <p className="text-[14px] font-semibold text-black dark:text-white/90 truncate">
                          Nam
                        </p>
                      </div>
                    </div>

                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center shrink-0">
                        <Calendar className="w-[18px] h-[18px] text-pink-600 dark:text-pink-400" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 block truncate">
                          Ngày sinh
                        </span>
                        <p className="text-[14px] font-semibold text-black dark:text-white/90 truncate">
                          15/08/2000
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <Phone className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 block">
                        Điện thoại
                      </span>
                      <p className="text-[14px] font-semibold text-black dark:text-white/90">+84 123 456 789</p>
                    </div>
                  </div>

                  <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <Mail className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 block">
                        Email công việc
                      </span>
                      <p className="text-[14px] font-semibold text-black dark:text-white/90">marcus@hamtech.vn</p>
                    </div>
                  </div>

                  <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <Quote className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400 fill-current opacity-80" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 block">
                        Tiểu sử
                      </span>
                      <p className="text-[13px] font-medium text-black dark:text-white/80 leading-relaxed italic">
                        &quot;Technology is best when it brings people together.&quot; 🌍 Code & Coffee routine.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 pb-2 shrink-0">
                  <button
                    type="button"
                    className="flex-1 py-2.5 rounded-xl font-bold text-[14px] bg-[#0068ff] text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5"
                  >
                    Cập nhật thông tin
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
