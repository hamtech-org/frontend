import type { AppDispatch } from '@/store/store';
import { chatApi } from '@/store/api/chatApi';
import type { IConversation } from '@/types/chat.types';
import { sortConversationsForSidebar } from '@/utils/chatUtils';

/** Payload socket `conversation:created`. */
export function parseConversationCreatedPayload(data: unknown): IConversation | null {
  const p = data as { conversation?: IConversation };
  const conv = p?.conversation;
  const cid = String(conv?.conversationId ?? '').trim();
  if (!cid) return null;
  return conv as IConversation;
}

/** Thêm hoặc gộp hội thoại vào cache sidebar — không cần reload trang. */
export function upsertConversationInListCache(
  dispatch: AppDispatch,
  incoming: IConversation,
): void {
  const cid = String(incoming.conversationId ?? '').trim();
  if (!cid) return;
  dispatch(
    chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
      if (!draft?.data) return;
      const idx = draft.data.findIndex((c) => c.conversationId === cid);
      if (idx >= 0) {
        draft.data[idx] = { ...draft.data[idx], ...incoming };
      } else {
        draft.data.push(incoming);
      }
      draft.data = sortConversationsForSidebar(draft.data);
    }),
  );
}
