import { useCallback, useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ReelPlayerFullHandle } from '@/features/reels/components/ReelPlayerFull';

interface UseReelsKeyboardShortcutsParams {
  activePlayerRef: MutableRefObject<ReelPlayerFullHandle | null>;
  allReelsCount: number;
  disabled: boolean;
  globalMuted: boolean;
  globalVolume: number;
  itemNodesRef: MutableRefObject<Array<HTMLDivElement | null>>;
  setGlobalMuted: Dispatch<SetStateAction<boolean>>;
  setGlobalVolume: Dispatch<SetStateAction<number>>;
  setVisibleIndex: Dispatch<SetStateAction<number>>;
  visibleIndex: number;
}

function shouldIgnoreReelsShortcut(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
    return true;
  }

  return ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName);
}

export function useReelsKeyboardShortcuts({
  activePlayerRef,
  allReelsCount,
  disabled,
  globalMuted,
  globalVolume,
  itemNodesRef,
  setGlobalMuted,
  setGlobalVolume,
  setVisibleIndex,
  visibleIndex,
}: UseReelsKeyboardShortcutsParams): void {
  const scrollToReel = useCallback(
    (index: number) => {
      if (allReelsCount === 0) return;

      const maxIndex = allReelsCount - 1;
      const nextIndex = Math.min(Math.max(index, 0), maxIndex);
      const node = itemNodesRef.current[nextIndex];
      if (!node) return;

      setVisibleIndex(nextIndex);
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [allReelsCount, itemNodesRef, setVisibleIndex],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled || shouldIgnoreReelsShortcut(event)) return;

      const key = event.key.toLowerCase();

      if (event.key === 'ArrowDown' || key === 'j') {
        event.preventDefault();
        scrollToReel(visibleIndex + 1);
        return;
      }

      if (event.key === 'ArrowUp' || key === 'k') {
        event.preventDefault();
        scrollToReel(visibleIndex - 1);
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        if (!event.repeat) {
          activePlayerRef.current?.togglePlayback();
        }
        return;
      }

      if (key === 'm' && !event.repeat) {
        if (globalMuted && globalVolume === 0) {
          setGlobalVolume(0.5);
        }
        setGlobalMuted((isMuted) => !isMuted);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activePlayerRef,
    disabled,
    globalMuted,
    globalVolume,
    scrollToReel,
    setGlobalMuted,
    setGlobalVolume,
    visibleIndex,
  ]);
}
