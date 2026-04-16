import { AnimatePresence, motion } from 'motion/react';
import { ConversationInfoPanel } from '@/components/chat/ConversationInfoPanel';

interface ChatSideInfoRailProps {
  showInfo: boolean;
  showContactsManagement: boolean;
}

export function ChatSideInfoRail({ showInfo, showContactsManagement }: ChatSideInfoRailProps) {
  return (
    <AnimatePresence initial={false}>
      {showInfo && !showContactsManagement && (
        <motion.div
          key="conversation-info-panel"
          initial={{ width: 0, opacity: 0, x: 12 }}
          animate={{ width: 'auto', opacity: 1, x: 0 }}
          exit={{ width: 0, opacity: 0, x: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden shrink-0"
        >
          <ConversationInfoPanel />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
