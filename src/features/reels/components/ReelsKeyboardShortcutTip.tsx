import { useCallback, useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const REELS_SHORTCUT_TIP_DISMISSED_KEY = 'hamtech.reels.shortcutsTipDismissed';

function getInitialVisible(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(REELS_SHORTCUT_TIP_DISMISSED_KEY) !== '1';
  } catch {
    return true;
  }
}

export function ReelsKeyboardShortcutTip() {
  const [visible, setVisible] = useState(getInitialVisible);

  const handleDismiss = useCallback((): void => {
    setVisible(false);
    try {
      window.localStorage.setItem(REELS_SHORTCUT_TIP_DISMISSED_KEY, '1');
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage.
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="absolute bottom-4 right-4 z-30 w-[17rem] rounded-xl border border-border/40 bg-background/95 p-3 text-foreground shadow-xl backdrop-blur-md">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Keyboard className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-5">Phím tắt Reels</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="-mr-2 -mt-2 size-7 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Ẩn gợi ý phím tắt Reels"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
            <span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-semibold text-foreground">
                ↑ / K
              </kbd>{' '}
              Trước
            </span>
            <span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-semibold text-foreground">
                ↓ / J
              </kbd>{' '}
              Tiếp
            </span>
            <span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-semibold text-foreground">
                Space
              </kbd>{' '}
              Dừng
            </span>
            <span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-semibold text-foreground">M</kbd>{' '}
              Âm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
