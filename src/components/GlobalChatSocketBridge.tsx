import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { patchMessageInGetMessagesCache, useGetConversationsQuery } from '@/store/api/chatApi';
import type { AppDispatch, RootState } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import { useSocketContext } from '@/contexts/SocketContext';
import { useChatSocketListeners } from '@/hooks/useChatSocketListeners';
import { decodeJwtUserId } from '@/utils/chatUtils';

/**
 * Đăng ký socket chat toàn app (không phụ thuộc ChatPage mount) + đọc activeConversationId từ Redux.
 */
export function GlobalChatSocketBridge(): null {
  const dispatch = useDispatch<AppDispatch>();
  const { isConnected } = useSocketContext();
  const activeConversationId = useSelector((s: RootState) => s.chat.activeConversationId);
  const currentUser = useSelector((s: RootState) => s.auth.user);
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const currentUserId = useMemo(
    () => currentUser?.userId ?? decodeJwtUserId(accessToken) ?? '',
    [currentUser?.userId, accessToken],
  );
  const { data: convData } = useGetConversationsQuery();
  const conversations = convData?.data ?? [];
  const getConversationType = useCallback(
    (conversationId: string) => conversations.find((c) => c.conversationId === conversationId)?.type,
    [conversations],
  );

  const patchMessageInCache = useCallback(
    (conversationId: string, messageId: string, patch: Partial<IMessage>) => {
      patchMessageInGetMessagesCache(dispatch, conversationId, messageId, patch);
    },
    [dispatch],
  );

  useChatSocketListeners(
    dispatch,
    patchMessageInCache,
    activeConversationId,
    isConnected,
    currentUserId,
    getConversationType,
  );
  return null;
}
