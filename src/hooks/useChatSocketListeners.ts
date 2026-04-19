import { useEffect, useRef } from 'react';
import { socketService } from '@/services/socket';
import type { AppDispatch } from '@/store/store';
import { chatApi } from '@/store/api/chatApi';
// Helper: sort conversations by lastMessage.createdAt desc
function sortConversationsByLastMessage(convs) {
  return [...convs].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}
import {
  messageReceived,
  messageRecalled,
  messageEdited,
  messagePinUpdated,
  messageReacted,
  typingStarted,
  typingStopped,
} from '@/store/slices/chatSlice';
import { applyMessageHiddenForMe } from '@/store/applyMessageHiddenForMe';
import type { IConversation, IGroupSettings, IMessage } from '@/types/chat.types';

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
): void {
  const typingCleanupTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;

  useEffect(() => {
    if (!socketReady) return;

    const handleNewMessage = (data: unknown) => {
      const msg = data as IMessage;
      dispatch(messageReceived(msg));
      // Cập nhật lastMessage, updatedAt, unreadCount và sort lại danh sách
      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          if (!draft?.data) return;
          const conv = draft.data.find((c) => c.conversationId === msg.conversationId);
          if (conv) {
            conv.lastMessage = {
              messageId: msg.messageId,
              content: msg.content,
              senderId: msg.senderId,
              type: msg.type,
              createdAt: msg.createdAt,
              senderDisplayName: msg.senderDisplayName?.trim() ?? null,
            };
            conv.updatedAt = msg.createdAt;
            // Nếu user chưa mở cuộc trò chuyện này thì tăng unreadCount
            if (activeConversationIdRef.current !== msg.conversationId) {
              conv.unreadCount = (conv.unreadCount ?? 0) + 1;
            }
          }
          draft.data = sortConversationsByLastMessage(draft.data);
        })
      );
    };

    const handleRecall = (data: unknown) => {
      const payload = data as { messageId: string; conversationId: string };
      dispatch(messageRecalled(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, {
        isRecalled: true,
        content: 'Tin nhắn đã được thu hồi',
      });
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

    const handleGroupUpdate = (data: any) => {
      // Khi có thay đổi về nhóm (member, role, poll, task, etc.)
      // Server có thể emit `groupId` hoặc `conversationId` tùy nơi gọi.
      // Giữ code cũ nhưng fallback để đảm bảo invalidate đúng.
      const groupId = data?.groupId ?? data?.conversationId;
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

    socketService.on('message:new', handleNewMessage);
    socketService.on('message:recall', handleRecall);
    socketService.on('message:edited', handleEdited);
    socketService.on('message:hidden_for_me', handleHiddenForMe);
    socketService.on('message:pin_updated', handlePinUpdated);
    socketService.on('message:reacted', handleReacted);
    socketService.on('message:typing_indicator', handleTyping);

    // Lắng nghe các sự kiện nhóm
    socketService.on('group:updated', handleGroupUpdate);
    socketService.on('group:settings_updated', handleGroupSettingsUpdated);
    socketService.on('group:member_joined', (data: any) => handleGroupUpdate({ ...data, type: 'member' }));
    socketService.on('group:member_left', (data: any) => handleGroupUpdate({ ...data, type: 'member' }));
    socketService.on('group:members_added', (data: any) => handleGroupUpdate({ ...data, type: 'member' }));
    socketService.on('group:member_removed', (data: any) => handleGroupUpdate({ ...data, type: 'member' }));
    socketService.on('group:role_changed', (data: any) => handleGroupUpdate({ ...data, type: 'member' }));
    socketService.on('group:join_request_new', (data: any) => handleGroupUpdate({ ...data, type: 'request' }));
    socketService.on('group:join_request_updated', (data: any) => handleGroupUpdate({ ...data, type: 'request' }));
    socketService.on('group:poll_new', (data: any) => handleGroupUpdate({ ...data, type: 'poll' }));
    socketService.on('group:poll_updated', (data: any) => handleGroupUpdate({ ...data, type: 'poll' }));
    socketService.on('group:task_new', (data: any) => handleGroupUpdate({ ...data, type: 'task' }));
    socketService.on('group:task_updated', (data: any) => handleGroupUpdate({ ...data, type: 'task' }));
    socketService.on('group:recap_new', (data: any) => {
      // Có thể hiển thị thông báo "AI vừa tạo tóm tắt mới!"
      dispatch(chatApi.util.invalidateTags(['Conversations']));
    });

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('message:recall', handleRecall);
      socketService.off('message:edited', handleEdited);
      socketService.off('message:hidden_for_me', handleHiddenForMe);
      socketService.off('message:pin_updated', handlePinUpdated);
      socketService.off('message:reacted', handleReacted);
      socketService.off('message:typing_indicator', handleTyping);
      
      socketService.off('group:updated');
      socketService.off('group:settings_updated', handleGroupSettingsUpdated);
      socketService.off('group:member_joined');
      socketService.off('group:member_left');
      socketService.off('group:members_added');
      socketService.off('group:member_removed');
      socketService.off('group:role_changed');
      socketService.off('group:join_request_new');
      socketService.off('group:join_request_updated');
      socketService.off('group:poll_new');
      socketService.off('group:poll_updated');
      socketService.off('group:task_new');
      socketService.off('group:task_updated');
      socketService.off('group:recap_new');

      Object.values(typingCleanupTimersRef.current).forEach(clearTimeout);
      typingCleanupTimersRef.current = {};
    };
  }, [dispatch, patchMessageInCache, socketReady]);
}
