import { useCallback, useRef } from 'react';
import { clampPipRect, LIVE_PIP_ASPECT, type LivePipRect } from '@/utils/liveCanvasComposite';
import { cn } from '@/utils/cn';

type DragMode = 'move' | 'resize' | null;

type Props = {
  pip: LivePipRect;
  onChange: (pip: LivePipRect) => void;
  className?: string;
};

export function LiveCompositePipOverlay({ pip, onChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: DragMode;
    startPip: LivePipRect;
  } | null>(null);

  const pipToStyle = useCallback((p: LivePipRect, container: DOMRect) => {
    const aspect = container.width / container.height;
    const nh = (p.nw / LIVE_PIP_ASPECT) * aspect;
    return {
      left: `${p.nx * 100}%`,
      top: `${p.ny * 100}%`,
      width: `${p.nw * 100}%`,
      height: `${nh * 100}%`,
    };
  }, []);

  const pointerToPip = useCallback(
    (clientX: number, clientY: number, base: LivePipRect, mode: DragMode) => {
      const el = containerRef.current;
      if (!el) return base;
      const rect = el.getBoundingClientRect();
      const aspect = rect.width / rect.height;

      if (mode === 'resize') {
        const dx = (clientX - rect.left) / rect.width - base.nx;
        const newNw = Math.max(0.05, dx);
        return clampPipRect({ nx: base.nx, ny: base.ny, nw: newNw }, aspect);
      }

      const nw = base.nw;
      const nh2 = (nw / LIVE_PIP_ASPECT) * aspect;
      const nx = (clientX - rect.left) / rect.width - nw / 2;
      const ny = (clientY - rect.top) / rect.height - nh2 / 2;
      return clampPipRect({ nx, ny, nw }, aspect);
    },
    [],
  );

  const onPointerDown = (e: React.PointerEvent, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, startPip: pip };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d?.mode) return;
    const next = pointerToPip(e.clientX, e.clientY, d.startPip, d.mode);
    onChange(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const rect = containerRef.current?.getBoundingClientRect();
  const style = rect
    ? pipToStyle(pip, rect)
    : { left: '76%', top: '72%', width: '22%', height: '16%' };

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 z-10 touch-none', className)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="absolute cursor-move bg-transparent pointer-events-auto group"
        style={style}
        onPointerDown={(e) => onPointerDown(e, 'move')}
      >
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-transparent"
          onPointerDown={(e) => onPointerDown(e, 'resize')}
        />
      </div>
    </div>
  );
}
