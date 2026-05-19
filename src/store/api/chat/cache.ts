import type { AppDispatch } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import { chatApi } from '@/store/api/chat/core';
import {
  lastMessagePreviewContentFromMessage,
  sortConversationsForSidebar,
} from '@/utils/chatUtils';

/** Cập nhật preview lastMessage + unread trên cache getConversations (gọi sau khi module đã export chatApi). */
export function patchConversationsFromNewMessage(
  dispatch: AppDispatch,
  msg: IMessage,
  activeConversationId: string | null,
  currentUserId: string | null,
): void {
  dispatch(
    chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
      if (!draft?.data) return;
      const conv = draft.data.find((c) => c.conversationId === msg.conversationId);
      if (!conv) return;
      const previewContent = lastMessagePreviewContentFromMessage(msg, currentUserId ?? undefined);
      const alreadySamePreview =
        conv.lastMessage &&
        conv.lastMessage.content === previewContent &&
        conv.lastMessage.senderId === msg.senderId &&
        conv.lastMessage.createdAt === msg.createdAt;
      conv.lastMessage = {
        messageId: msg.messageId,
        content: previewContent,
        senderId: msg.senderId,
        type: msg.type,
        createdAt: msg.createdAt,
        senderDisplayName: msg.senderDisplayName?.trim() ?? null,
      };
      conv.lastMessageAt = msg.createdAt;
      conv.updatedAt = msg.createdAt;
      const isIncomingFromOther = Boolean(currentUserId) && msg.senderId !== currentUserId;
      if (
        isIncomingFromOther &&
        msg.conversationId !== activeConversationId &&
        !alreadySamePreview
      ) {
        conv.unreadCount = (conv.unreadCount ?? 0) + 1;
      }
      draft.data = sortConversationsForSidebar(draft.data);
    }),
  );
}

/** Cập nhật một tin trong cache `getMessages` (so khớp messageId kiểu string để tránh lệch kiểu). */
export function patchMessageInGetMessagesCache(
  dispatch: AppDispatch,
  conversationId: string,
  messageId: string,
  patch: Partial<IMessage>,
): void {
  const mid = String(messageId);
  dispatch(
    chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
      if (!draft.data) return;
      const m = draft.data.find((x) => String(x.messageId) === mid);
      if (m) Object.assign(m, patch);
    }),
  );
}

/** Cập nhật một tin trong cache `getMessagesPaginated` (items array bên trong .data). */
export function patchMessageInPaginatedCache(
  dispatch: AppDispatch,
  conversationId: string,
  messageId: string,
  patch: Partial<IMessage>,
): void {
  const mid = String(messageId);
  dispatch(
    chatApi.util.updateQueryData(
      'getMessagesPaginated',
      { conversationId } as never,
      (draft: { data: { items: IMessage[] } }) => {
        if (!draft.data?.items) return;
        const m = draft.data.items.find((x: IMessage) => String(x.messageId) === mid);
        if (m) Object.assign(m, patch);
      },
    ),
  );
}

/** Append a new message to the paginated cache (oldest→newest order). */
export function appendMessageToPaginatedCache(
  dispatch: AppDispatch,
  conversationId: string,
  message: IMessage,
): void {
  dispatch(
    chatApi.util.updateQueryData(
      'getMessagesPaginated',
      { conversationId } as never,
      (draft: { data: { items: IMessage[] } }) => {
        if (!draft.data?.items) return;
        const mid = String(message.messageId);
        if (draft.data.items.some((m: IMessage) => String(m.messageId) === mid)) return;
        draft.data.items.push(message);
      },
    ),
  );
}
