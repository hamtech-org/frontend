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
}

export function useChatScrollBehavior({
  allMessages,
  activeConversationId,
  currentUserId,
  typingUsers,
  actionMenuMsgId,
  setActionMenuMsgId,
}: UseChatScrollBehaviorParams) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const [unreadIncomingCount, setUnreadIncomingCount] = useState(0);

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
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  useEffect(() => {
    prevLastMessageIdRef.current = null;
    setUnreadIncomingCount(0);
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
      scrollToBottom('smooth');
    } else {
      setUnreadIncomingCount((count) => count + 1);
    }

    prevLastMessageIdRef.current = latestMessage.messageId;
  }, [allMessages, activeConversationId, currentUserId, scrollToBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let isTicking = false;
    const handleScroll = () => {
      if (isTicking) return;
      isTicking = true;
      requestAnimationFrame(() => {
        const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceToBottom < CHAT_NEAR_BOTTOM_PX) {
          setUnreadIncomingCount(0);
        }
        isTicking = false;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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
    scrollToBottom,
    handleJumpToLatest,
  };
}
