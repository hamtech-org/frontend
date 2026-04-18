import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { AuthenticatedMedia } from '@/components/chat/AuthenticatedMedia';

type MediaLightboxProps = {
  open: boolean;
  onClose: () => void;
  src: string;
  kind: 'image' | 'video';
};

export function MediaLightbox({ open, onClose, src, kind }: MediaLightboxProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={kind === 'image' ? 'Xem ảnh' : 'Xem video'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-sm p-3 sm:p-6"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-[min(100vw-1.5rem,100%)] max-h-[min(100vh-1.5rem,100%)] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <AuthenticatedMedia
              src={src}
              kind={kind}
              videoAutoPlay={kind === 'video'}
              className={
                kind === 'video'
                  ? 'max-h-[min(92vh,100%)] max-w-[min(96vw,100%)] w-auto rounded-lg shadow-2xl bg-black'
                  : 'max-h-[min(92vh,100%)] max-w-[min(96vw,100%)] w-auto h-auto object-contain rounded-lg shadow-2xl'
              }
              alt=""
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
