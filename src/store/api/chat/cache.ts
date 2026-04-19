import type { AppDispatch } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import { chatApi } from '@/store/api/chat/core';

/** Cập nhật preview lastMessage + unread trên cache getConversations (gọi sau khi module đã export chatApi). */
export function patchConversationsFromNewMessage(
  dispatch: AppDispatch,
  msg: IMessage,
  activeConversationId: string | null,
): void {
  dispatch(
    chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
      if (!draft?.data) return;
      const conv = draft.data.find((c) => c.conversationId === msg.conversationId);
      if (!conv) return;
      const previewContent =
        msg.content?.trim() !== ''
          ? msg.content
          : msg.type === 'image'
            ? '[Ảnh]'
            : msg.type === 'video'
              ? '[Video]'
              : msg.type === 'file'
                ? '[File]'
                : msg.content;
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
      if (msg.conversationId !== activeConversationId && !alreadySamePreview) {
        conv.unreadCount = (conv.unreadCount ?? 0) + 1;
      }
    }),
  );
}
