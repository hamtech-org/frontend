import React from 'react';
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

  let topEmojis: string[] = [];
  let total = 0;

  if ('counts' in summary && 'total' in summary && 'topReactions' in summary) {
    total = summary.total as number;
    topEmojis = (summary.topReactions as string[])
      .map((t) => REACTION_META[t as keyof typeof REACTION_META]?.emoji)
      .filter(Boolean);
  } else {
    // raw dictionary format
    const counts = summary as Record<string, number>;
    total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
    topEmojis = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([k]) => REACTION_META[k as keyof typeof REACTION_META]?.emoji)
      .filter(Boolean);
  }

  if (total === 0) return null;

  const sizeClasses = {
    sm: 'text-[11px] h-5',
    md: 'text-xs h-6',
    lg: 'text-sm h-7',
  };

  return (
    <div className={`flex items-center gap-2 ${sizeClasses[size]} ${className}`}>
      <div className="flex -space-x-1.5 items-center">
        {topEmojis.map((emoji, idx) => (
          <div
            key={idx}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ring-background shadow-sm overflow-hidden"
            style={{ zIndex: 10 - idx }}
          >
            <span className="text-[11px] select-none leading-none transform translate-y-[0.5px]">
              {emoji}
            </span>
          </div>
        ))}
      </div>
      <span className="font-bold text-muted-foreground text-[13px] tabular-nums">
        {total.toLocaleString()}
      </span>
    </div>
  );
};
