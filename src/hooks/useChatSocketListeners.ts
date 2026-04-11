import { useEffect, useRef } from 'react';
import { socketService } from '@/services/socket';
import type { AppDispatch } from '@/store/store';
import { chatApi, patchConversationsFromNewMessage } from '@/store/api/chatApi';
import {
  messageReceived,
  messageRecalled,
  messageEdited,
  messageDeleted,
  messagePinUpdated,
  typingStarted,
  typingStopped,
} from '@/store/slices/chatSlice';
import type { IMessage } from '@/types/chat.types';

type PatchMessageInCache = (
  conversationId: string,
  messageId: string,
  patch: Partial<IMessage>,
) => void;

/**
 * Đăng ký lắng nghe socket chat.
 */
export function useChatSocketListeners(
  dispatch: AppDispatch,
  patchMessageInCache: PatchMessageInCache,
  activeConversationId: string | null,
  socketReady: boolean,
): void {
  const typingCleanupTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;

  useEffect(() => {
    if (!socketReady) return;

    const handleNewMessage = (data: unknown) => {
      const msg = data as IMessage;
      dispatch(messageReceived(msg));
      patchConversationsFromNewMessage(dispatch, msg, activeConversationIdRef.current);
    };

    const handleRecall = (data: unknown) => {
      const payload = data as { messageId: string; conversationId: string };
      dispatch(messageRecalled(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, {
        isRecalled: true,
        content: 'Tin nhắn đã được thu hồi',
      });
      dispatch(chatApi.util.invalidateTags(['Conversations']));
    };

    const handleEdited = (data: unknown) => {
      const { messageId, conversationId, content } = data as {
        messageId: string;
        conversationId: string;
        content: string;
      };
      dispatch(messageEdited({ messageId, conversationId, content }));
      patchMessageInCache(conversationId, messageId, { content, isEdited: true });
      dispatch(chatApi.util.invalidateTags(['Conversations']));
    };

    const handleDeleted = (data: unknown) => {
      const { messageId, conversationId } = data as { messageId: string; conversationId: string };
      dispatch(messageDeleted({ messageId, conversationId }));
      patchMessageInCache(conversationId, messageId, { isDeleted: true, content: '' });
      dispatch(chatApi.util.invalidateTags(['Conversations']));
    };

    const handlePinUpdated = (data: unknown) => {
      const { messageId, conversationId, isPinned } = data as {
        messageId: string;
        conversationId: string;
        isPinned: boolean;
      };
      dispatch(messagePinUpdated({ messageId, conversationId, isPinned }));
      patchMessageInCache(conversationId, messageId, { isPinned });
    };

    const handleTyping = (data: unknown) => {
      const { userId, conversationId, displayName } = data as {
        userId: string;
        conversationId: string;
        displayName?: string | null;
      };
      dispatch(typingStarted({ conversationId, userId, displayName }));
      const timerKey = `${conversationId}:${userId}`;
      const existingTimer = typingCleanupTimersRef.current[timerKey];
      if (existingTimer) clearTimeout(existingTimer);
      typingCleanupTimersRef.current[timerKey] = setTimeout(() => {
        dispatch(typingStopped({ conversationId, userId }));
        delete typingCleanupTimersRef.current[timerKey];
      }, 1000);
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('message:recall', handleRecall);
    socketService.on('message:edited', handleEdited);
    socketService.on('message:deleted', handleDeleted);
    socketService.on('message:pin_updated', handlePinUpdated);
    socketService.on('message:typing_indicator', handleTyping);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('message:recall', handleRecall);
      socketService.off('message:edited', handleEdited);
      socketService.off('message:deleted', handleDeleted);
      socketService.off('message:pin_updated', handlePinUpdated);
      socketService.off('message:typing_indicator', handleTyping);
      Object.values(typingCleanupTimersRef.current).forEach(clearTimeout);
      typingCleanupTimersRef.current = {};
    };
  }, [dispatch, patchMessageInCache, socketReady]);
}
