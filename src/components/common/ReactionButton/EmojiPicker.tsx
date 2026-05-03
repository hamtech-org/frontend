import React, { useRef } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReactionType, REACTION_META } from '@/types/reaction.types';

interface EmojiPickerProps {
  isVisible: boolean;
  onReact: (type: ReactionType) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isVisible,
  onReact,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!isVisible) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="absolute bottom-full left-0 mb-2 flex items-center gap-1 rounded-full bg-background p-1.5 shadow-xl animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200 z-50"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {(
          Object.entries(REACTION_META) as [ReactionType, (typeof REACTION_META)[ReactionType]][]
        ).map(([type, meta]) => (
          <EmojiItem key={type} type={type} meta={meta} onReact={onReact} />
        ))}
      </div>
    </TooltipProvider>
  );
};

const EmojiItem = ({
  type,
  meta,
  onReact,
}: {
  type: ReactionType;
  meta: (typeof REACTION_META)[ReactionType];
  onReact: (type: ReactionType) => void;
}) => {
  const playerRef = useRef<Player>(null);

  const handleMouseEnter = () => {
    playerRef.current?.play();
  };

  const handleMouseLeave = () => {
    playerRef.current?.stop();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="group relative flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-muted"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReact(type);
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="w-8 h-8 transition-transform group-hover:scale-125 group-hover:-translate-y-1 group-active:scale-90">
            <Player
              ref={playerRef}
              src={meta.lottie}
              autoplay={true}
              loop={true}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="rounded-full px-3 py-1 text-xs font-semibold">
        {meta.label}
      </TooltipContent>
    </Tooltip>
  );
};
