import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Player } from '@lottiefiles/react-lottie-player';

interface FloatingEmojiProps {
  gif: any;
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
      className="emoji-float pointer-events-none fixed z-9999 flex h-12 w-12 items-center justify-center"
      style={{ left: x - 24, top: y - 24 }}
    >
      <Player autoplay src={gif} style={{ width: 40, height: 40 }} />
    </div>,
    document.body,
  );
};
