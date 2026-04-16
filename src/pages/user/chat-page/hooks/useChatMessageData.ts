import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  chatApi,
  useGetMessagesQuery,
  useReactMessageMutation,
} from '@/store/api/chatApi';
import type { RootState, AppDispatch } from '@/store/store';
import type { IMessage } from '@/types/chat.types';

const EMPTY_MESSAGE_ARRAY: ReadonlyArray<IMessage> = [];

/**
 * Hook gom data layer cho messages: merge API + socket, pinned,
 * cache patching helpers, và react mutation.
 */
export function useChatMessageData(activeConversationId: string | null) {
  const dispatch = useDispatch<AppDispatch>();

  // Socket messages từ Redux store
  const socketMessages = useSelector((state: RootState) => {
    if (!activeConversationId) return EMPTY_MESSAGE_ARRAY;
    return state.chat.messages[activeConversationId] ?? EMPTY_MESSAGE_ARRAY;
  });

  // API messages từ RTK Query
  const { data: messagesData } = useGetMessagesQuery(
    { conversationId: activeConversationId! },
    { skip: !activeConversationId },
  );

  // Merge API + socket, sắp xếp theo thời gian
  const allMessages = useMemo(() => {
    const apiMessages = messagesData?.data ?? [];
    const merged: IMessage[] = [...apiMessages];
    socketMessages.forEach((sm) => {
      if (!merged.some((m) => m.messageId === sm.messageId)) {
        merged.push(sm);
      }
    });
    merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return merged;
  }, [messagesData, socketMessages]);

  // Tính toán pinned messages
  const { primaryPinnedMessage, otherPinnedMessages } = useMemo(() => {
    const pinnedSorted = allMessages.filter((m) => m.isPinned);
    const primary = pinnedSorted.length > 0 ? pinnedSorted[pinnedSorted.length - 1] : null;
    const other = pinnedSorted.length > 1 ? pinnedSorted.slice(0, -1) : [];
    return { primaryPinnedMessage: primary, otherPinnedMessages: other };
  }, [allMessages]);

  // ID tin nhắn mới nhất cho mark-as-read
  const latestMessageIdForRead =
    allMessages.length > 0 ? allMessages[allMessages.length - 1].messageId : undefined;

  // Patch một message trong RTK Query cache
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

  // Xóa một message khỏi RTK Query cache
  const removeMessageFromCache = useCallback(
    (conversationId: string, messageId: string) => {
      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
          if (!draft.data) return;
          draft.data = draft.data.filter((x) => x.messageId !== messageId);
        }),
      );
    },
    [dispatch],
  );

  // React (emoji) vào message
  const [reactMessage] = useReactMessageMutation();
  const handleReactMessage = useCallback(
    async (msg: IMessage, emoji: string) => {
      try {
        await reactMessage({
          messageId: msg.messageId,
          conversationId: msg.conversationId,
          createdAt: msg.createdAt,
          emoji,
        }).unwrap();
      } catch {
        /* Socket hoặc invalidation sẽ xử lý UI update */
      }
    },
    [reactMessage],
  );

  return {
    allMessages,
    primaryPinnedMessage,
    otherPinnedMessages,
    latestMessageIdForRead,
    patchMessageInCache,
    removeMessageFromCache,
    handleReactMessage,
  };
}
