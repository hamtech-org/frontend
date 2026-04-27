import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface ChatSideInfoRailProps {
  showInfo: boolean;
  showContactsManagement: boolean;
  /** Gọi khi user đóng panel (dùng cho Sheet overlay trên mobile/tablet). */
  onClose: () => void;
  /** Nội dung panel thông tin (ví dụ `ConversationInfoPanel` với đủ props). */
  children?: ReactNode;
}

/**
 * Panel thông tin hội thoại bên phải.
 * - Desktop (≥ lg / 1024px): animated sidebar với motion.div (non-overlay ✅ rules).
 * - Mobile/Tablet (< lg): Sheet overlay từ phải — dùng Shadcn built-in animation.
 */
export function ChatSideInfoRail({
  showInfo,
  showContactsManagement,
  onClose,
  children,
}: ChatSideInfoRailProps) {
  const isDesktop = useBreakpoint('lg');
  const visible = showInfo && !showContactsManagement;

  // ── Desktop: animated sidebar ────────────────────────────────────────
  if (isDesktop) {
    return (
      <AnimatePresence initial={false}>
        {visible && children ? (
          <motion.div
            key="conversation-info-panel"
            initial={{ width: 0, opacity: 0, x: 12 }}
            animate={{ width: 'auto', opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden shrink-0 w-[clamp(300px,24vw,380px)]"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    );
  }

  // ── Mobile / Tablet: Sheet overlay từ phải ───────────────────────────
  return (
    <Sheet open={visible} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[clamp(280px,85vw,360px)] max-w-[100vw] md:w-[clamp(300px,40vw,380px)] p-0 overflow-y-auto"
      >
        <SheetTitle className="sr-only">Thông tin hội thoại</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
