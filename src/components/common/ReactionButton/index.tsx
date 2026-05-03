import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ThumbsUp } from 'lucide-react';
import { Player } from '@lottiefiles/react-lottie-player';
import { EmojiPicker } from './EmojiPicker';
import { FloatingEmoji } from './FloatingEmoji';
import { ReactionType, REACTION_META } from '@/types/reaction.types';
import { cn } from '@/utils/cn';

interface ReactionButtonProps {
  currentUserReaction?: ReactionType | null;
  onReact: (type: ReactionType | null) => void;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export const ReactionButton: React.FC<ReactionButtonProps> = ({
  currentUserReaction,
  onReact,
  count,
  size = 'md',
  className,
  showLabel = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [floatingEmoji, setFloatingEmoji] = useState<{
    id: number;
    gif: string;
    x: number;
    y: number;
  } | null>(null);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const playerRef = useRef<Player>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovered(true), 400);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovered(false), 300);
  }, []);

  const handlePickerMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  }, []);

  const handlePickerMouseLeave = useCallback(() => {
    handleMouseLeave();
  }, [handleMouseLeave]);

  // Logic: Khi người dùng chọn/đổi reaction, chạy animation 1 lần
  useEffect(() => {
    if (currentUserReaction && playerRef.current) {
      playerRef.current.setSeeker(0);
      playerRef.current.play();
    }
  }, [currentUserReaction]);

  const handleReact = useCallback(
    (type: ReactionType) => {
      setIsHovered(false);

      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const meta = REACTION_META[type];
        if (meta) {
          setFloatingEmoji({
            id: Date.now(),
            gif: meta.gif,
            x: rect.left + rect.width / 2,
            y: rect.top,
          });
        }
      }

      if (currentUserReaction === type) {
        onReact(null);
      } else {
        onReact(type);
      }
    },
    [currentUserReaction, onReact],
  );

  const handleDefaultClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentUserReaction) {
      onReact(null);
    } else {
      handleReact('like');
    }
  };

  const currentMeta = currentUserReaction ? REACTION_META[currentUserReaction] : null;

  const sizeClasses = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleDefaultClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'flex items-center gap-2 rounded-md font-medium transition-colors hover:bg-muted/50 focus:outline-none',
          sizeClasses[size],
          className,
        )}
        style={{ color: currentMeta ? currentMeta.color : undefined }}
      >
        {currentMeta ? (
          <div className="w-6 h-6 flex items-center justify-center">
            <Player
              ref={playerRef}
              src={currentMeta.lottie}
              autoplay={true}
              loop={false} // Chạy 1 lần rồi dừng ở frame cuối
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ) : (
          <ThumbsUp
            size={iconSizes[size]}
            className="text-muted-foreground transition-transform active:scale-90"
          />
        )}

        {showLabel && (
          <span className={cn('select-none', currentMeta ? '' : 'text-muted-foreground')}>
            {currentMeta ? currentMeta.label : 'Thích'}
          </span>
        )}

        {typeof count === 'number' && count > 0 && (
          <span
            className={cn(
              'select-none tabular-nums font-semibold',
              currentMeta ? '' : 'text-muted-foreground',
            )}
          >
            {count.toLocaleString()}
          </span>
        )}
      </button>

      <EmojiPicker
        isVisible={isHovered}
        onReact={handleReact}
        onMouseEnter={handlePickerMouseEnter}
        onMouseLeave={handlePickerMouseLeave}
      />

      {floatingEmoji && (
        <FloatingEmoji
          key={floatingEmoji.id}
          gif={floatingEmoji.gif}
          x={floatingEmoji.x}
          y={floatingEmoji.y}
          onComplete={() => setFloatingEmoji(null)}
        />
      )}
    </div>
  );
};
