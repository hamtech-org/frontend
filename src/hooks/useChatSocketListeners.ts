import { useEffect, useRef } from 'react';
import { socketService } from '@/services/socket';
import type { AppDispatch } from '@/store/store';
import { store } from '@/store/store';
import { chatApi } from '@/store/api/chatApi';
import {
  messageReceived,
  messageRecalled,
  messageEdited,
  messagePinUpdated,
  messageReacted,
  messageStatusUpdated,
  typingStarted,
  typingStopped,
} from '@/store/slices/chatSlice';
import { applyMessageHiddenForMe } from '@/store/applyMessageHiddenForMe';
import type { ConversationType, IConversation, IGroupSettings, IMessage, MessageStatus } from '@/types/chat.types';
import { lastMessagePreviewContentFromMessage, sortConversationsForSidebar } from '@/utils/chatUtils';

function applyMessageStatusPatch(
  dispatch: AppDispatch,
  patchMessageInCache: PatchMessageInCache,
  conversationId: string,
  messageId: string,
  status: MessageStatus,
  currentUserId: string,
) {
  if (status !== 'read') {
    patchMessageInCache(conversationId, messageId, { status });
    dispatch(messageStatusUpdated({ conversationId, messageId, status }));
    return;
  }
  const msgs = chatApi.endpoints.getMessages.select({ conversationId })(store.getState())?.data?.data ?? [];
  const pivot = msgs.find((m) => String(m.messageId) === String(messageId));
  if (!pivot) {
    patchMessageInCache(conversationId, messageId, { status: 'read' });
    dispatch(messageStatusUpdated({ conversationId, messageId, status: 'read' }));
    dispatch(chatApi.util.invalidateTags([{ type: 'Messages', id: conversationId }]));
    return;
  }
  const pivotMs = new Date(pivot.createdAt).getTime();
  for (const m of msgs) {
    if (m.senderId !== currentUserId) continue;
    if (new Date(m.createdAt).getTime() > pivotMs) continue;
    patchMessageInCache(conversationId, m.messageId, { status: 'read' });
    dispatch(
      messageStatusUpdated({
        conversationId,
        messageId: m.messageId,
        status: 'read',
      }),
    );
  }
  dispatch(chatApi.util.invalidateTags([{ type: 'Messages', id: conversationId }]));
}

type PatchMessageInCache = (
  conversationId: string,
  messageId: string,
  patch: Partial<IMessage>,
) => void;

/**
 * Đăng ký lắng nghe socket chat.
 */
export function useChatSocketListeners(
  dispatch: AppDispatch,
  patchMessageInCache: PatchMessageInCache,
  activeConversationId: string | null,
  socketReady: boolean,
  currentUserId: string,
  getConversationType: (conversationId: string) => ConversationType | undefined,
): void {
  const typingCleanupTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;

  useEffect(() => {
    if (!socketReady) return;

    const handleNewMessage = (data: unknown) => {
      const msg = data as IMessage;
      dispatch(messageReceived(msg));
      if (
        currentUserId &&
        msg.senderId !== currentUserId &&
        getConversationType(msg.conversationId) === 'direct'
      ) {
        socketService.emit('message:delivered_ack', {
          conversationId: msg.conversationId,
          messageId: msg.messageId,
        });
      }
      // Cập nhật lastMessage, updatedAt, unreadCount và sort lại danh sách
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          if (!draft?.data) return;
          const conv = draft.data.find((c) => c.conversationId === msg.conversationId);
          if (conv) {
            conv.lastMessage = {
              messageId: msg.messageId,
              content: lastMessagePreviewContentFromMessage(msg, currentUserId),
              senderId: msg.senderId,
              type: msg.type,
              createdAt: msg.createdAt,
              senderDisplayName: msg.senderDisplayName?.trim() ?? null,
            };
            conv.lastMessageAt = msg.createdAt;
            conv.updatedAt = msg.createdAt;
            // Nếu user chưa mở cuộc trò chuyện này thì tăng unreadCount
            if (activeConversationIdRef.current !== msg.conversationId) {
              conv.unreadCount = (conv.unreadCount ?? 0) + 1;
            }
          }
          draft.data = sortConversationsForSidebar(draft.data);
        })
      );
    };

    const handleRecall = (data: unknown) => {
      const payload = data as { messageId: string; conversationId: string };
      dispatch(messageRecalled(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, {
        isRecalled: true,
        content: 'Tin nhắn đã được thu hồi',
        isPinned: false,
      });
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          if (!draft?.data) return;
          const conv = draft.data.find((c) => c.conversationId === payload.conversationId);
          const lm = conv?.lastMessage;
          if (!conv || !lm || String(lm.messageId) !== String(payload.messageId)) return;
          lm.content = 'Tin nhắn đã được thu hồi';
        }),
      );
      dispatch(chatApi.util.invalidateTags(['Conversations']));
    };

    const handleEdited = (data: unknown) => {
      const { messageId, conversationId, content } = data as {
        messageId: string;
        conversationId: string;
        content: string;
      };
      dispatch(messageEdited({ messageId, conversationId, content }));
      patchMessageInCache(conversationId, messageId, { content, isEdited: true });
      dispatch(chatApi.util.invalidateTags(['Conversations']));
    };

    const handleHiddenForMe = (data: unknown) => {
      const { messageId, conversationId } = data as { messageId: string; conversationId: string };
      applyMessageHiddenForMe(dispatch, conversationId, messageId);
    };

    const handlePinUpdated = (data: unknown) => {
      const { messageId, conversationId, isPinned } = data as {
        messageId: string;
        conversationId: string;
        isPinned: boolean;
      };
      dispatch(messagePinUpdated({ messageId, conversationId, isPinned }));
      patchMessageInCache(conversationId, messageId, { isPinned });
      // META.pinnedMessageCount đổi trên server — refetch danh sách hội thoại
      dispatch(chatApi.util.invalidateTags(['Conversations']));
    };

    const handleReacted = (data: unknown) => {
      const { messageId, conversationId, reactions } = data as {
        messageId: string;
        conversationId: string;
        reactions: Record<string, string[]>;
      };
      dispatch(messageReacted({ messageId, conversationId, reactions }));
      patchMessageInCache(conversationId, messageId, { reactions });
    };

    const handleMessageStatus = (data: unknown) => {
      const p = data as { conversationId?: string; messageId?: string; status?: MessageStatus };
      if (!p?.conversationId || !p?.messageId || !p?.status) return;
      applyMessageStatusPatch(
        dispatch,
        patchMessageInCache,
        p.conversationId,
        p.messageId,
        p.status,
        currentUserId,
      );
    };

    const handleTyping = (data: unknown) => {
      const { userId, conversationId, displayName } = data as {
        userId: string;
        conversationId: string;
        displayName?: string | null;
      };
      dispatch(typingStarted({ conversationId, userId, displayName }));
      const timerKey = `${conversationId}:${userId}`;
      const existingTimer = typingCleanupTimersRef.current[timerKey];
      if (existingTimer) clearTimeout(existingTimer);
      typingCleanupTimersRef.current[timerKey] = setTimeout(() => {
        dispatch(typingStopped({ conversationId, userId }));
        delete typingCleanupTimersRef.current[timerKey];
      }, 1000);
    };

    const handleGroupSettingsUpdated = (data: unknown) => {
      const p = data as { conversationId?: string; groupSettings?: IGroupSettings };
      const conversationId = p?.conversationId;
      const groupSettings = p?.groupSettings;
      if (!conversationId || !groupSettings) return;
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          if (!draft?.data) return;
          const c = draft.data.find((x) => x.conversationId === conversationId);
          if (c) (c as IConversation).groupSettings = groupSettings;
        }),
      );
      dispatch(chatApi.util.invalidateTags([{ type: 'GroupSettings', id: conversationId }]));
    };

    const handleGroupDisbanded = (data: unknown) => {
      const p = data as { conversationId?: string; groupId?: string };
      const id = p?.conversationId ?? p?.groupId;
      if (!id) return;
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          if (!draft?.data) return;
          draft.data = draft.data.filter((c) => c.conversationId !== id);
        }),
      );
      dispatch(chatApi.util.invalidateTags([{ type: 'Messages', id }]));
    };

    const handleGroupUpdate = (data: any) => {
      // Khi có thay đổi về nhóm (member, role, poll, task, etc.)
      // Server có thể emit `groupId` hoặc `conversationId` tùy nơi gọi.
      // Giữ code cũ nhưng fallback để đảm bảo invalidate đúng.
      const groupId = data?.groupId ?? data?.conversationId;
      const memberCountFromSocket = typeof data?.memberCount === 'number' ? data.memberCount : undefined;
      if (groupId && memberCountFromSocket !== undefined) {
        dispatch(
          chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
            if (!draft?.data) return;
            const c = draft.data.find((x) => x.conversationId === groupId);
            if (c) c.memberCount = memberCountFromSocket;
          }),
        );
      }
      if (!groupId) {
        dispatch(chatApi.util.invalidateTags(['Conversations']));
        return;
      }
      // Invalidate các tags liên quan để FE tự động fetch lại dữ liệu mới nhất
      if (data.type === 'poll') dispatch(chatApi.util.invalidateTags([{ type: 'Polls', id: groupId }]));
      if (data.type === 'task') dispatch(chatApi.util.invalidateTags([{ type: 'Tasks', id: groupId }]));
      if (data.type === 'request') dispatch(chatApi.util.invalidateTags([{ type: 'GroupRequests', id: groupId }]));
      
      // Mặc định luôn refresh Conversations để cập nhật memberCount hoặc status
      dispatch(chatApi.util.invalidateTags(['Conversations']));
      if (groupId === activeConversationIdRef.current) {
        dispatch(chatApi.util.invalidateTags([{ type: 'Conversations', id: `MEMBERS-${groupId}` }]));
      }
    };

    /** Cùng ref cho on/off — không dùng `off(event)` không handler (sẽ xóa cả listener của ChatPage / module khác). */
    const onGroupMemberJoinedGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'member' });
    const onGroupMemberLeftGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'member' });
    const onGroupMembersAddedGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'member' });
    const onGroupMemberRemovedGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'member' });
    const onGroupRoleChangedGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'member' });
    const onGroupJoinRequestNewGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'request' });
    const onGroupJoinRequestUpdatedGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'request' });
    const onGroupPollNewGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'poll' });
    const onGroupPollUpdatedGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'poll' });
    const onGroupTaskNewGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'task' });
    const onGroupTaskUpdatedGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'task' });
    const onGroupTaskDeletedGU = (data: unknown) => handleGroupUpdate({ ...(data as object), type: 'task' });
    const onGroupRecapNew = () => {
      dispatch(chatApi.util.invalidateTags(['Conversations']));
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('message:status', handleMessageStatus);
    socketService.on('message:recall', handleRecall);
    socketService.on('message:recalled', handleRecall);
    socketService.on('message:edited', handleEdited);
    socketService.on('message:hidden_for_me', handleHiddenForMe);
    socketService.on('message:pin_updated', handlePinUpdated);
    socketService.on('message:reacted', handleReacted);
    socketService.on('message:typing_indicator', handleTyping);

    // Lắng nghe các sự kiện nhóm
    socketService.on('group:disbanded', handleGroupDisbanded);
    socketService.on('group:updated', handleGroupUpdate);
    socketService.on('group:settings_updated', handleGroupSettingsUpdated);
    socketService.on('group:member_joined', onGroupMemberJoinedGU);
    socketService.on('group:member_left', onGroupMemberLeftGU);
    socketService.on('group:members_added', onGroupMembersAddedGU);
    socketService.on('group:member_removed', onGroupMemberRemovedGU);
    socketService.on('group:role_changed', onGroupRoleChangedGU);
    socketService.on('group:join_request_new', onGroupJoinRequestNewGU);
    socketService.on('group:join_request_updated', onGroupJoinRequestUpdatedGU);
    socketService.on('group:poll_new', onGroupPollNewGU);
    socketService.on('group:poll_updated', onGroupPollUpdatedGU);
    socketService.on('group:task_new', onGroupTaskNewGU);
    socketService.on('group:task_updated', onGroupTaskUpdatedGU);
    socketService.on('group:task_deleted', onGroupTaskDeletedGU);
    socketService.on('group:recap_new', onGroupRecapNew);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('message:status', handleMessageStatus);
      socketService.off('message:recall', handleRecall);
      socketService.off('message:recalled', handleRecall);
      socketService.off('message:edited', handleEdited);
      socketService.off('message:hidden_for_me', handleHiddenForMe);
      socketService.off('message:pin_updated', handlePinUpdated);
      socketService.off('message:reacted', handleReacted);
      socketService.off('message:typing_indicator', handleTyping);
      
      socketService.off('group:disbanded', handleGroupDisbanded);
      socketService.off('group:updated', handleGroupUpdate);
      socketService.off('group:settings_updated', handleGroupSettingsUpdated);
      socketService.off('group:member_joined', onGroupMemberJoinedGU);
      socketService.off('group:member_left', onGroupMemberLeftGU);
      socketService.off('group:members_added', onGroupMembersAddedGU);
      socketService.off('group:member_removed', onGroupMemberRemovedGU);
      socketService.off('group:role_changed', onGroupRoleChangedGU);
      socketService.off('group:join_request_new', onGroupJoinRequestNewGU);
      socketService.off('group:join_request_updated', onGroupJoinRequestUpdatedGU);
      socketService.off('group:poll_new', onGroupPollNewGU);
      socketService.off('group:poll_updated', onGroupPollUpdatedGU);
      socketService.off('group:task_new', onGroupTaskNewGU);
      socketService.off('group:task_updated', onGroupTaskUpdatedGU);
      socketService.off('group:task_deleted', onGroupTaskDeletedGU);
      socketService.off('group:recap_new', onGroupRecapNew);

      Object.values(typingCleanupTimersRef.current).forEach(clearTimeout);
      typingCleanupTimersRef.current = {};
    };
  }, [dispatch, patchMessageInCache, socketReady, currentUserId, getConversationType]);
}
