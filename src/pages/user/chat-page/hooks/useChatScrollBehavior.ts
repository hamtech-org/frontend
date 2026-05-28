import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_NEAR_BOTTOM_PX } from '@/constants/chat-page.constants';
import type { IMessage, TypingUserEntry } from '@/types/chat.types';

interface UseChatScrollBehaviorParams {
  allMessages: IMessage[];
  activeConversationId: string | null;
  currentUserId: string;
  typingUsers: ReadonlyArray<TypingUserEntry>;
  actionMenuMsgId: string | null;
  setActionMenuMsgId: (id: string | null) => void;
  /** Trigger loading older messages (cursor pagination). */
  loadOlderMessages?: () => void;
  hasMore?: boolean;
  isLoadingOlder?: boolean;
}

export function useChatScrollBehavior({
  allMessages,
  activeConversationId,
  currentUserId,
  typingUsers,
  actionMenuMsgId,
  setActionMenuMsgId,
  loadOlderMessages,
  hasMore,
  isLoadingOlder,
}: UseChatScrollBehaviorParams) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const prevItemCountRef = useRef<number>(0);
  const [unreadIncomingCount, setUnreadIncomingCount] = useState(0);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
      scrollRafRef.current = null;
    });
  }, []);

  const handleJumpToLatest = useCallback(() => {
    setUnreadIncomingCount(0);
    setIsScrolledUp(false);
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  useEffect(() => {
    prevLastMessageIdRef.current = null;
    setUnreadIncomingCount(0);
    setIsScrolledUp(false);
  }, [activeConversationId]);

  useEffect(() => {
    if (!actionMenuMsgId) return;
    const close = () => setActionMenuMsgId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [actionMenuMsgId, setActionMenuMsgId]);

  useEffect(() => {
    if (!activeConversationId || allMessages.length === 0) return;

    const latestMessage = allMessages[allMessages.length - 1];
    const previousMessageId = prevLastMessageIdRef.current;
    if (previousMessageId === null) {
      prevLastMessageIdRef.current = latestMessage.messageId;
      scrollToBottom('auto');
      return;
    }
    if (latestMessage.messageId === previousMessageId) return;

    const isMyMessage = latestMessage.senderId === currentUserId;
    const container = messagesContainerRef.current;
    const distanceToBottom = container
      ? container.scrollHeight - container.scrollTop - container.clientHeight
      : 0;
    const isOverflowing = container ? container.scrollHeight > container.clientHeight + 1 : false;
    const isNearBottom = distanceToBottom < CHAT_NEAR_BOTTOM_PX;

    if (isMyMessage || isNearBottom || !isOverflowing) {
      setUnreadIncomingCount(0);
      setIsScrolledUp(false);
      scrollToBottom('smooth');
    } else {
      setIsScrolledUp(true);
      setUnreadIncomingCount((count) => count + 1);
    }

    prevLastMessageIdRef.current = latestMessage.messageId;
  }, [allMessages, activeConversationId, currentUserId, scrollToBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let isTicking = false;
    const LOAD_MORE_THRESHOLD = 200; // px from top
    const handleScroll = () => {
      if (isTicking) return;
      isTicking = true;
      requestAnimationFrame(() => {
        const distanceToBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceToBottom < CHAT_NEAR_BOTTOM_PX) {
          setUnreadIncomingCount(0);
          setIsScrolledUp(false);
        } else {
          setIsScrolledUp(true);
        }
        // Load older messages when scrolled near top
        if (
          container.scrollTop < LOAD_MORE_THRESHOLD &&
          hasMore &&
          !isLoadingOlder &&
          loadOlderMessages
        ) {
          prevScrollHeightRef.current = container.scrollHeight;
          loadOlderMessages();
        }
        isTicking = false;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingOlder, loadOlderMessages]);

  // Scroll anchoring: maintain scroll position when older messages are prepended
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const currentCount = allMessages.length;
    const prevCount = prevItemCountRef.current;
    const prevHeight = prevScrollHeightRef.current;
    prevItemCountRef.current = currentCount;

    // Older messages were prepended (count increased, was near top)
    if (currentCount > prevCount && prevHeight > 0 && container.scrollTop < 200) {
      const heightDiff = container.scrollHeight - prevHeight;
      if (heightDiff > 0) {
        container.scrollTop += heightDiff;
      }
      prevScrollHeightRef.current = 0;
    }
  }, [allMessages.length]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || typingUsers.length === 0) return;

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceToBottom >= CHAT_NEAR_BOTTOM_PX) return;
    scrollToBottom('smooth');
  }, [typingUsers.length, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  return {
    messagesContainerRef,
    messagesEndRef,
    unreadIncomingCount,
    setUnreadIncomingCount,
    isScrolledUp,
    scrollToBottom,
    handleJumpToLatest,
  };
}
