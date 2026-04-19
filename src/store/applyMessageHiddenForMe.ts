import type { AppDispatch } from '@/store/store';
import { chatApi } from '@/store/api/chatApi';
import { messageHiddenForViewer } from '@/store/slices/chatSlice';

/** Xóa tin khỏi UI phía user hiện tại (đồng bộ với API ẩn-theo-user, không đụng người khác). */
export function applyMessageHiddenForMe(
  dispatch: AppDispatch,
  conversationId: string,
  messageId: string,
): void {
  dispatch(
    chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
      if (!draft.data) return;
      draft.data = draft.data.filter((m) => m.messageId !== messageId);
    }),
  );
  dispatch(messageHiddenForViewer({ conversationId, messageId }));
  dispatch(chatApi.util.invalidateTags(['Conversations']));
}
