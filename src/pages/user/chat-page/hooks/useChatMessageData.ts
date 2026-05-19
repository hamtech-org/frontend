import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  patchMessageInGetMessagesCache,
  patchMessageInPaginatedCache,
  useGetMessagesPaginatedQuery,
  useLazyGetMessagesPaginatedQuery,
  useReactMessageMutation,
} from '@/store/api/chatApi';
import type { RootState, AppDispatch } from '@/store/store';
import type { IMessage } from '@/types/chat.types';

const EMPTY_MESSAGE_ARRAY: ReadonlyArray<IMessage> = [];

const WEB_PAGE_SIZE = 20;

/**
 * Hook gom data layer cho messages: merge API (paginated) + socket (nâng cao),
 * pinned messages with MRU ordering, cache patching helpers, và react mutation.
 *
 * Now uses cursor-based pagination for infinite scroll.
 */
export function useChatMessageData(activeConversationId: string | null) {
  const dispatch = useDispatch<AppDispatch>();

  // Socket messages từ Redux store
  const socketMessages = useSelector((state: RootState) => {
    if (!activeConversationId) return EMPTY_MESSAGE_ARRAY;
    return state.chat.messages[activeConversationId] ?? EMPTY_MESSAGE_ARRAY;
  });

  // Paginated API messages từ RTK Query (oldest → newest)
  const { data: paginatedData, isFetching } = useGetMessagesPaginatedQuery(
    { conversationId: activeConversationId!, limit: WEB_PAGE_SIZE },
    { skip: !activeConversationId },
  );

  const apiMessages = paginatedData?.data?.items ?? [];
  const nextCursor = paginatedData?.data?.nextCursor ?? null;
  const hasMore = paginatedData?.data?.hasMore ?? false;

  // Lazy query for loading older messages
  const [triggerLoadMore, { isFetching: isLoadingOlder }] = useLazyGetMessagesPaginatedQuery();

  const loadOlderMessages = useCallback(() => {
    if (!activeConversationId || !nextCursor || isLoadingOlder) return;
    triggerLoadMore({
      conversationId: activeConversationId,
      limit: WEB_PAGE_SIZE,
      cursor: nextCursor,
    });
  }, [activeConversationId, nextCursor, isLoadingOlder, triggerLoadMore]);

  // Merge API + socket (nâng cao): ghép statusRank, isRecalled, isDeleted, readBy
  const allMessages = useMemo(() => {
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

    // Socket messages not yet in API (new messages from realtime)
    socketMessages.forEach((sm) => {
      const sid = String(sm.messageId);
      if (!merged.some((m) => String(m.messageId) === sid)) {
        merged.push(sm);
      }
    });

    // Items are already oldest→newest from API; sort to ensure consistency
    merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return merged;
  }, [apiMessages, socketMessages]);

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

  // Patch một message trong RTK Query cache (both legacy + paginated)
  const patchMessageInCache = useCallback(
    (conversationId: string, messageId: string, patch: Partial<IMessage>) => {
      patchMessageInGetMessagesCache(dispatch, conversationId, messageId, patch);
      patchMessageInPaginatedCache(dispatch, conversationId, messageId, patch);
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
    // New pagination exports
    hasMore,
    isLoadingOlder,
    isFetching,
    loadOlderMessages,
  };
}
