import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { IReactionSummary, REACTION_META } from '@/types/reaction.types';

interface ReactionSummaryProps {
  summary?: IReactionSummary | Partial<Record<string, number>>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ReactionSummary: React.FC<ReactionSummaryProps> = ({
  summary,
  size = 'md',
  className = '',
}) => {
  if (!summary) return null;

  let total = 0;
  let topLotties: object[];

  if ('counts' in summary && 'total' in summary && 'topReactions' in summary) {
    total = summary.total as number;
    topLotties = (summary.topReactions as string[])
      .map((t) => REACTION_META[t as keyof typeof REACTION_META]?.lottie)
      .filter(Boolean);
  } else {
    const counts = summary as Record<string, number>;
    total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
    topLotties = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([k]) => REACTION_META[k as keyof typeof REACTION_META]?.lottie)
      .filter(Boolean);
  }

  if (total === 0) return null;

  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex -space-x-1 items-center">
        {topLotties.map((lottie, idx) => (
          <div
            key={idx}
            className={`flex ${iconSize} items-center justify-center rounded-full bg-background ring-1 ring-background shadow-sm overflow-hidden`}
            style={{ zIndex: 10 - idx }}
          >
            <Player
              src={lottie}
              autoplay={true}
              loop={false}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ))}
      </div>
      <span className={`font-bold text-muted-foreground tabular-nums ${textSize}`}>
        {total.toLocaleString()}
      </span>
    </div>
  );
};
