import { useCallback, useEffect, useRef, useState } from 'react';

interface UseMessageJumpNavigationParams {
  activeConversationId?: string;
  onRequestOpenSearchPanel: () => void;
}

export function useMessageJumpNavigation({
  activeConversationId,
  onRequestOpenSearchPanel,
}: UseMessageJumpNavigationParams) {
  const jumpHighlightClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [jumpHighlightMessageId, setJumpHighlightMessageId] = useState<string | null>(null);
  const [jumpFlashNonce, setJumpFlashNonce] = useState(0);
  const [conversationSearchRequestTick, setConversationSearchRequestTick] = useState(0);

  const clearJumpHighlight = useCallback(() => {
    setJumpHighlightMessageId(null);
    if (jumpHighlightClearRef.current) {
      clearTimeout(jumpHighlightClearRef.current);
      jumpHighlightClearRef.current = null;
    }
  }, []);

  const scrollToMessageBubble = useCallback(
    (messageId: string) => {
      clearJumpHighlight();
      setJumpFlashNonce((n) => n + 1);
      setJumpHighlightMessageId(messageId);
      const tryScrollIntoView = (remainingAttempts: number) => {
        const node = document.getElementById(`chat-msg-${messageId}`);
        if (node) {
          node.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          return;
        }
        if (remainingAttempts <= 0) return;
        window.setTimeout(() => tryScrollIntoView(remainingAttempts - 1), 120);
      };
      requestAnimationFrame(() => {
        tryScrollIntoView(8);
      });
      jumpHighlightClearRef.current = setTimeout(() => {
        setJumpHighlightMessageId(null);
        jumpHighlightClearRef.current = null;
      }, 2300);
    },
    [clearJumpHighlight],
  );

  const requestOpenConversationSearch = useCallback(() => {
    onRequestOpenSearchPanel();
    setConversationSearchRequestTick((t) => t + 1);
  }, [onRequestOpenSearchPanel]);

  useEffect(() => {
    clearJumpHighlight();
  }, [activeConversationId, clearJumpHighlight]);

  useEffect(() => {
    return () => {
      if (jumpHighlightClearRef.current) {
        clearTimeout(jumpHighlightClearRef.current);
      }
    };
  }, []);

  return {
    jumpHighlightMessageId,
    jumpFlashNonce,
    conversationSearchRequestTick,
    scrollToMessageBubble,
    requestOpenConversationSearch,
  };
}
