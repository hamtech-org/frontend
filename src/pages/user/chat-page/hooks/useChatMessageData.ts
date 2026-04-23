import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  patchMessageInGetMessagesCache,
  useGetMessagesQuery,
  useReactMessageMutation,
} from '@/store/api/chatApi';
import type { RootState, AppDispatch } from '@/store/store';
import type { IMessage } from '@/types/chat.types';

const EMPTY_MESSAGE_ARRAY: ReadonlyArray<IMessage> = [];

/**
 * Hook gom data layer cho messages: merge API + socket (nâng cao),
 * pinned messages with MRU ordering, cache patching helpers, và react mutation.
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

  // Merge API + socket (nâng cao): ghép statusRank, isRecalled, isDeleted, readBy
  const allMessages = useMemo(() => {
    const apiMessages = messagesData?.data ?? [];
    const statusRank = (x?: string) =>
      x === 'read' ? 3 : x === 'delivered' ? 2 : x === 'sent' ? 1 : 0;
    const RECALL_TEXT = 'Tin nhắn đã được thu hồi';

    const merged: IMessage[] = apiMessages.map((m) => {
      const mid = String(m.messageId);
      const sm = socketMessages.find((s) => String(s.messageId) === mid);
      if (!sm) return m;

      const isRecalled = Boolean(m.isRecalled) || Boolean(sm.isRecalled);
      const isDeleted = Boolean(m.isDeleted) || Boolean(sm.isDeleted);
      const pin = (Boolean(m.isPinned) || Boolean(sm.isPinned)) && !isRecalled && !isDeleted;
      const bestStatus =
        statusRank(sm.status) > statusRank(m.status) ? sm.status : (m.status ?? sm.status);
      const readBy = (m.readBy?.length ?? 0) >= (sm.readBy?.length ?? 0) ? m.readBy : sm.readBy;

      const pinChanged = pin !== Boolean(m.isPinned);
      const statusChanged = bestStatus !== m.status;
      const readByChanged = JSON.stringify(readBy ?? []) !== JSON.stringify(m.readBy ?? []);
      const recallChanged = isRecalled !== Boolean(m.isRecalled);
      const deleteChanged = isDeleted !== Boolean(m.isDeleted);
      const recallContentPending = isRecalled && String(m.content ?? '').trim() !== RECALL_TEXT;

      if (
        !pinChanged &&
        !statusChanged &&
        !readByChanged &&
        !recallChanged &&
        !deleteChanged &&
        !recallContentPending
      ) {
        return m;
      }

      const content = isRecalled ? RECALL_TEXT : m.content;
      return {
        ...m,
        isRecalled,
        isDeleted,
        content,
        isPinned: pin,
        ...(bestStatus ? { status: bestStatus } : {}),
        ...(readBy?.length ? { readBy } : {}),
      };
    });

    socketMessages.forEach((sm) => {
      const sid = String(sm.messageId);
      if (!merged.some((m) => String(m.messageId) === sid)) {
        merged.push(sm);
      }
    });

    merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return merged;
  }, [messagesData, socketMessages]);

  // ── Pinned messages with MRU ordering ────────────────────────────────
  const [pinnedMessageOrderByConv, setPinnedMessageOrderByConv] = useState<
    Record<string, string[]>
  >({});

  const { primaryPinnedMessage, otherPinnedMessages } = useMemo(() => {
    if (!activeConversationId) {
      return {
        primaryPinnedMessage: null as IMessage | null,
        otherPinnedMessages: [] as IMessage[],
      };
    }
    const pinned = allMessages.filter((m) => m.isPinned && !m.isRecalled && !m.isDeleted);
    if (pinned.length === 0) {
      return { primaryPinnedMessage: null, otherPinnedMessages: [] };
    }

    const order = pinnedMessageOrderByConv[activeConversationId] ?? [];
    const byId = new Map(pinned.map((m) => [m.messageId, m]));
    const pinnedIds = new Set(pinned.map((m) => m.messageId));

    const fromOrder = order.filter((id) => pinnedIds.has(id));
    const notInOrder = pinned
      .filter((m) => !fromOrder.includes(m.messageId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((m) => m.messageId);
    const mergedIds = [...fromOrder, ...notInOrder];

    const primaryId = mergedIds[0];
    const primary = (primaryId ? byId.get(primaryId) : null) ?? pinned[pinned.length - 1]!;
    const other = mergedIds
      .slice(1)
      .map((id) => byId.get(id))
      .filter((m): m is IMessage => m != null);
    return { primaryPinnedMessage: primary, otherPinnedMessages: other };
  }, [allMessages, activeConversationId, pinnedMessageOrderByConv]);

  const pinnedMessagesOrdered = useMemo(() => {
    if (!primaryPinnedMessage) return [];
    return [primaryPinnedMessage, ...otherPinnedMessages];
  }, [primaryPinnedMessage, otherPinnedMessages]);

  // ID tin nhắn mới nhất cho mark-as-read
  const latestMessageIdForRead =
    allMessages.length > 0 ? allMessages[allMessages.length - 1].messageId : undefined;

  // Patch một message trong RTK Query cache
  const patchMessageInCache = useCallback(
    (conversationId: string, messageId: string, patch: Partial<IMessage>) => {
      patchMessageInGetMessagesCache(dispatch, conversationId, messageId, patch);
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
    pinnedMessagesOrdered,
    pinnedMessageOrderByConv,
    setPinnedMessageOrderByConv,
    latestMessageIdForRead,
    patchMessageInCache,
    handleReactMessage,
  };
}
