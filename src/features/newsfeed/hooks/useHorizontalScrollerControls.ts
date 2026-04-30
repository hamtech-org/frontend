import { useCallback, useEffect, useRef, useState } from 'react';

export const useHorizontalScrollerControls = () => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateNavState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxLeft - 4);
  }, []);

  const scrollByDirection = useCallback(
    (direction: 'left' | 'right') => {
      const el = scrollerRef.current;
      if (!el) return;
      const step = Math.round(el.clientWidth * 0.72);
      el.scrollBy({ left: direction === 'right' ? step : -step, behavior: 'smooth' });
      window.setTimeout(updateNavState, 220);
    },
    [updateNavState],
  );

  useEffect(() => {
    updateNavState();
    window.addEventListener('resize', updateNavState);
    return () => window.removeEventListener('resize', updateNavState);
  }, [updateNavState]);

  return {
    scrollerRef,
    canScrollLeft,
    canScrollRight,
    updateNavState,
    scrollByDirection,
  };
};
