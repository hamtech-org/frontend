import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { chatApi } from '@/store/api/chatApi';
import type { AppDispatch, RootState } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import { useSocketContext } from '@/contexts/SocketContext';
import { useChatSocketListeners } from '@/hooks/useChatSocketListeners';

/**
 * Đăng ký socket chat toàn app (không phụ thuộc ChatPage mount) + đọc activeConversationId từ Redux.
 */
export function GlobalChatSocketBridge(): null {
  const dispatch = useDispatch<AppDispatch>();
  const { isConnected } = useSocketContext();
  const activeConversationId = useSelector((s: RootState) => s.chat.activeConversationId);

  const patchMessageInCache = useCallback(
    (conversationId: string, messageId: string, patch: Partial<IMessage>) => {
      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
          if (!draft.data) return;
          const m = draft.data.find((x) => x.messageId === messageId);
          if (m) Object.assign(m, patch);
        }),
      );
    },
    [dispatch],
  );

  useChatSocketListeners(dispatch, patchMessageInCache, activeConversationId, isConnected);
  return null;
}
