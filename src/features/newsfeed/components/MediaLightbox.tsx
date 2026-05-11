import React, { useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Props {
  mediaUrls: string[];
  startIndex: number;
  onClose: () => void;
}

const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);

export const MediaLightbox: React.FC<Props> = ({ mediaUrls, startIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % mediaUrls.length);
  }, [mediaUrls.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + mediaUrls.length) % mediaUrls.length);
  }, [mediaUrls.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  const currentUrl = mediaUrls[currentIndex];

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Counter */}
        {mediaUrls.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-white">
            {currentIndex + 1} / {mediaUrls.length}
          </div>
        )}

        {/* Media */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="relative max-h-[85vh] max-w-[90vw]"
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo(currentUrl) ? (
            <video
              src={currentUrl}
              controls
              controlsList="nodownload"
              autoPlay
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
            />
          ) : (
            <img
              src={currentUrl}
              alt={`Media ${currentIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain select-none"
              referrerPolicy="no-referrer"
              draggable={false}
            />
          )}
        </motion.div>

        {/* Prev / Next navigation */}
        {mediaUrls.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70 hover:scale-110"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70 hover:scale-110"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Thumbnail strip (if 2+ images) */}
        {mediaUrls.length > 1 && (
          <div
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {mediaUrls.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};
