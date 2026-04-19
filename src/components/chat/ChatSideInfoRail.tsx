import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface ChatSideInfoRailProps {
  showInfo: boolean;
  showContactsManagement: boolean;
  /** Nội dung panel thông tin (ví dụ `ConversationInfoPanel` với đủ props). */
  children?: ReactNode;
}

export function ChatSideInfoRail({ showInfo, showContactsManagement, children }: ChatSideInfoRailProps) {
  return (
    <AnimatePresence initial={false}>
      {showInfo && !showContactsManagement && children ? (
        <motion.div
          key="conversation-info-panel"
          initial={{ width: 0, opacity: 0, x: 12 }}
          animate={{ width: 'auto', opacity: 1, x: 0 }}
          exit={{ width: 0, opacity: 0, x: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden shrink-0"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
