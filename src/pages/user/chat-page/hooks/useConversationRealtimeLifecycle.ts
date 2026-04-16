import { useEffect, useRef } from 'react';
import { resetUnread } from '@/store/slices/chatSlice';
import { socketService } from '@/services/socket';
import type { AppDispatch } from '@/store/store';

interface UseConversationRealtimeLifecycleParams {
  activeConversationId: string | null;
  latestMessageIdForRead?: string;
  dispatch: AppDispatch;
  markAsRead: (args: { conversationId: string; messageId: string }) => unknown;
}

export function useConversationRealtimeLifecycle({
  activeConversationId,
  latestMessageIdForRead,
  dispatch,
  markAsRead,
}: UseConversationRealtimeLifecycleParams): void {
  const lastMarkReadKeyRef = useRef('');

  useEffect(() => {
    if (!activeConversationId) return;
    socketService.emit('conversation:join', activeConversationId);
    dispatch(resetUnread(activeConversationId));
    return () => {
      socketService.emit('conversation:leave', activeConversationId);
    };
  }, [activeConversationId, dispatch]);

  useEffect(() => {
    if (!activeConversationId || !latestMessageIdForRead) return;
    const key = `${activeConversationId}:${latestMessageIdForRead}`;
    if (lastMarkReadKeyRef.current === key) return;
    lastMarkReadKeyRef.current = key;

    socketService.emit('message:read', {
      conversationId: activeConversationId,
      messageId: latestMessageIdForRead,
    });

    void markAsRead({ conversationId: activeConversationId, messageId: latestMessageIdForRead });
  }, [activeConversationId, latestMessageIdForRead, markAsRead]);

  useEffect(() => {
    lastMarkReadKeyRef.current = '';
  }, [activeConversationId]);
}
