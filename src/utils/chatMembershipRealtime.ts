import type { AppDispatch } from '@/store/store';
import { chatApi } from '@/store/api/chatApi';
import { socketService } from '@/services/socket';
import {
  bumpGroupBoardRefresh,
  clearConversationMessages,
  setMessageJoinCutoff,
} from '@/store/slices/chatSlice';
import type { IMessage } from '@/types/chat.types';

export function messagePassesJoinCutoff(
  msg: Pick<IMessage, 'createdAt'>,
  minCreatedAtMs: number | undefined,
): boolean {
  if (minCreatedAtMs == null || !Number.isFinite(minCreatedAtMs)) return true;
  const t = Date.parse(msg.createdAt);
  if (!Number.isFinite(t)) return true;
  return t >= minCreatedAtMs;
}

/** Xóa cache tin + refetch API (không F5). */
export function resetConversationMessagesRealtime(
  dispatch: AppDispatch,
  conversationId: string,
): void {
  const cid = conversationId.trim();
  if (!cid) return;

  dispatch(clearConversationMessages(cid));
  dispatch(
    chatApi.util.updateQueryData('getMessages', { conversationId: cid }, (draft) => {
      if (!draft) return;
      draft.data = [];
    }),
  );
  void dispatch(
    chatApi.endpoints.getMessages.initiate(
      { conversationId: cid },
      { forceRefetch: true, subscribe: true },
    ),
  );
}

/** Vào lại nhóm sau kick — coi như member mới, chỉ xem tin từ `joinedAt`. */
export function applyRejoinedGroupMemberRealtime(
  dispatch: AppDispatch,
  conversationId: string,
  joinedAtIso: string,
): void {
  const cid = conversationId.trim();
  if (!cid) return;

  const joinedMs = Date.parse(joinedAtIso);
  dispatch(
    setMessageJoinCutoff({
      conversationId: cid,
      minCreatedAtMs: Number.isFinite(joinedMs) ? joinedMs : Date.now(),
    }),
  );
  resetConversationMessagesRealtime(dispatch, cid);
  dispatch(bumpGroupBoardRefresh({ conversationId: cid }));
  dispatch(chatApi.util.invalidateTags(['Conversations', { type: 'Messages', id: cid }]));
}

/** Bị kick — xóa tin local, bỏ hội thoại khỏi sidebar. */
export function applyKickedFromGroupRealtime(dispatch: AppDispatch, conversationId: string): void {
  const cid = conversationId.trim();
  if (!cid) return;

  socketService.emit('conversation:leave', cid);

  dispatch(setMessageJoinCutoff({ conversationId: cid, minCreatedAtMs: null }));
  dispatch(clearConversationMessages(cid));
  dispatch(
    chatApi.util.updateQueryData('getMessages', { conversationId: cid }, (draft) => {
      if (!draft) return;
      draft.data = [];
    }),
  );
  dispatch(
    chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
      if (!draft?.data) return;
      draft.data = draft.data.filter((c) => c.conversationId !== cid);
    }),
  );
  dispatch(chatApi.util.invalidateTags(['Conversations', { type: 'Messages', id: cid }]));
}
