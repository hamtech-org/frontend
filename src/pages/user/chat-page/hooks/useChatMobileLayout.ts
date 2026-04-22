import { useCallback, useEffect, useState } from 'react';

type MobileView = 'list' | 'chat';

interface UseChatMobileLayoutParams {
  isTabletOrDesktop: boolean;
  activeConversationId?: string;
  routeConversationId?: string;
  navigate: (path: string) => void;
}

export function useChatMobileLayout({
  isTabletOrDesktop,
  activeConversationId,
  routeConversationId,
  navigate,
}: UseChatMobileLayoutParams) {
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      navigate(`/chat/${conversationId}`);
      setMobileView('chat');
      setMobileListOpen(false);
    },
    [navigate],
  );

  const handleBackToList = useCallback(() => {
    setMobileView('list');
  }, []);

  useEffect(() => {
    if (activeConversationId && !isTabletOrDesktop) {
      setMobileView('chat');
      setMobileListOpen(false);
    }
  }, [activeConversationId, isTabletOrDesktop]);

  useEffect(() => {
    if (isTabletOrDesktop) return;
    if (routeConversationId) return;
    if (activeConversationId) return;
    setMobileView('list');
    setMobileListOpen(false);
  }, [isTabletOrDesktop, routeConversationId, activeConversationId]);

  return {
    mobileView,
    mobileListOpen,
    setMobileListOpen,
    handleSelectConversation,
    handleBackToList,
  };
}
