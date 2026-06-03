import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthenticatedMedia } from '@/components/chat/AuthenticatedMedia';

export type MediaLightboxItem = {
  url: string;
  type: 'image' | 'video';
};

type MediaLightboxProps = {
  open: boolean;
  onClose: () => void;
  items?: MediaLightboxItem[];
  startIndex?: number;
  src?: string;
  kind?: 'image' | 'video';
};

export function MediaLightbox({
  open,
  onClose,
  items,
  startIndex = 0,
  src,
  kind,
}: MediaLightboxProps) {
  const mediaItems =
    items && items.length > 0
      ? items
      : src
        ? [{ url: src, type: kind || 'image' } as MediaLightboxItem]
        : [];

  const [currentIndex, setCurrentIndex] = useState(startIndex);

  useEffect(() => {
    if (open) {
      setCurrentIndex(startIndex);
    }
  }, [open, startIndex]);

  const goNext = useCallback(() => {
    if (mediaItems.length <= 1) return;
    setCurrentIndex((i) => (i + 1) % mediaItems.length);
  }, [mediaItems.length]);

  const goPrev = useCallback(() => {
    if (mediaItems.length <= 1) return;
    setCurrentIndex((i) => (i - 1 + mediaItems.length) % mediaItems.length);
  }, [mediaItems.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, goNext, goPrev]);

  if (typeof document === 'undefined') return null;

  const currentItem = mediaItems[currentIndex];
  if (!currentItem) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={currentItem.type === 'image' ? 'Xem ảnh' : 'Xem video'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-sm p-3 sm:p-6"
          onClick={onClose}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          {mediaItems.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-white">
              {currentIndex + 1} / {mediaItems.length}
            </div>
          )}

          {/* Navigation controls */}
          {mediaItems.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70 hover:scale-105"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70 hover:scale-105"
                aria-label="Ảnh sau"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Media container */}
          <motion.div
            key={currentIndex}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-[min(100vw-1.5rem,100%)] max-h-[min(100vh-1.5rem,100%)] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <AuthenticatedMedia
              src={currentItem.url}
              kind={currentItem.type}
              videoAutoPlay={currentItem.type === 'video'}
              className={
                currentItem.type === 'video'
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
