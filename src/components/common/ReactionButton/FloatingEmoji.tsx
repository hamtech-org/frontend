import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FloatingEmojiProps {
  gif: string;
  x: number;
  y: number;
  onComplete: () => void;
}

export const FloatingEmoji: React.FC<FloatingEmojiProps> = ({ gif, x, y, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return createPortal(
    <div
      className="emoji-float pointer-events-none fixed z-[9999] flex h-12 w-12 items-center justify-center"
      style={{ left: x - 24, top: y - 24 }}
    >
      <img src={gif} alt="" className="w-10 h-10" />
    </div>,
    document.body,
  );
};
