import { useState, useEffect } from 'react';

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/**
 * Trả về `true` nếu viewport hiện tại >= breakpoint chỉ định.
 * Reactive — tự cập nhật khi resize.
 *
 * @example
 * const isDesktop = useBreakpoint('lg'); // true nếu width >= 1024px
 */
export function useBreakpoint(bp: keyof typeof BREAKPOINTS): boolean {
  const [matches, setMatches] = useState<boolean>(() => window.innerWidth >= BREAKPOINTS[bp]);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINTS[bp]}px)`);
    // Sync ngay khi mount (tránh hydration mismatch)
    setMatches(mq.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [bp]);

  return matches;
}
