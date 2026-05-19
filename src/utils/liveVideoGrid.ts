import type { CSSProperties } from 'react';
import { gridColsRows } from '@/utils/groupCallVideoGrid';

/** CSS grid cho vùng video live: 1 người = full, 2 = 2 cột, 3–4 = 2×2, … */
export function liveVideoGridStyle(tileCount: number): CSSProperties {
  const n = Math.max(0, tileCount);
  if (n === 0) {
    return { display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
  }
  if (n === 1) {
    return { display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
  }
  const { cols, rows } = gridColsRows(n);
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    gap: '0.5rem',
  };
}
