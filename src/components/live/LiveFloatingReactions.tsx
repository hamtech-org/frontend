import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Player } from '@lottiefiles/react-lottie-player';
import { REACTION_META } from '@/types/reaction.types';
import { socketService } from '@/services/socket';

type ReactionType = keyof typeof REACTION_META;

type LiveReactionPayload = {
  sessionId: string;
  userId: string;
  displayName: string;
  reactionType: ReactionType;
  sentAt: string;
};

type Item = {
  id: string;
  type: ReactionType;
  x: number;
  y: number;
};

const TTL_MS = 3500;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function randomId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const LiveFloatingReactions = ({
  sessionId,
  containerRect,
}: {
  sessionId: string;
  containerRect: DOMRect | null;
}) => {
  const [items, setItems] = useState<Item[]>([]);
  const sid = useMemo(() => sessionId.trim(), [sessionId]);
  const containerRectRef = useRef(containerRect);
  containerRectRef.current = containerRect;

  useEffect(() => {
    if (!sid) return;
    const onReaction = (raw: unknown) => {
      const p = raw as LiveReactionPayload;
      if (!p?.sessionId || p.sessionId !== sid) return;
      const type = p.reactionType;
      if (!REACTION_META[type]) return;

      const rect = containerRectRef.current;
      if (!rect) return;
      const x = clamp(rect.left + Math.random() * rect.width, rect.left + 16, rect.right - 56);
      const y = rect.bottom - 84;
      const id = randomId();
      setItems((prev) => [...prev.slice(-60), { id, type, x, y }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((it) => it.id !== id));
      }, TTL_MS);
    };

    socketService.on('live:reaction', onReaction);
    return () => {
      socketService.off('live:reaction', onReaction);
    };
  }, [sid]);

  if (items.length === 0) return null;

  return createPortal(
    <>
      {items.map((it) => (
        <div
          key={it.id}
          className="live-emoji-float pointer-events-none fixed z-200"
          style={{ left: it.x, top: it.y, width: 44, height: 44 }}
        >
          <Player
            autoplay
            keepLastFrame
            src={REACTION_META[it.type].gif}
            style={{ width: 44, height: 44 }}
          />
        </div>
      ))}
    </>,
    document.body,
  );
};
