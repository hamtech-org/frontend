import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { chatApi } from '@/store/api/chatApi';
import {
  messageEdited,
  messageHiddenForMe,
  messagePinUpdated,
  messageReacted,
  messageReceived,
  messageRecalled,
  typingStarted,
  typingStopped,
} from '@/store/slices/chatSlice';
import { socketService } from '@/services/socket';
import type { AppDispatch } from '@/store/store';
import type { IMessage } from '@/types/chat.types';

type GroupUpdatedPayload = {
  conversationId?: string;
  name?: string;
  avatar?: string;
};

interface UseChatRealtimeEventsParams {
  dispatch: AppDispatch;
  isConnected: boolean;
  activeConversationId: string | null;
  setActivePollId: (pollId: string) => void;
  setShowPollVoteModal: (open: boolean) => void;
  fetchGroupMembers: (groupId: string) => Promise<void>;
  patchMessageInCache: (conversationId: string, messageId: string, patch: Partial<IMessage>) => void;
  removeMessageFromCache: (conversationId: string, messageId: string) => void;
}

export function useChatRealtimeEvents({
  dispatch,
  isConnected,
  activeConversationId,
  setActivePollId,
  setShowPollVoteModal,
  fetchGroupMembers,
  patchMessageInCache,
  removeMessageFromCache,
}: UseChatRealtimeEventsParams): void {
  const activeConversationIdRef = useRef<string | null>(activeConversationId);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    const handleNewMessage = (msg: IMessage) => {
      dispatch(messageReceived(msg));

      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          const conv = draft?.data?.find((item) => item.conversationId === msg.conversationId);
          if (!conv) return;
          conv.lastMessage = {
            messageId: msg.messageId,
            content: msg.content,
            senderId: msg.senderId,
            type: msg.type,
            createdAt: msg.createdAt,
            senderDisplayName: msg.senderDisplayName,
          };
        }),
      );

      try {
        if (
          msg.conversationId !== activeConversationIdRef.current ||
          (msg as { type?: string }).type !== 'system'
        ) {
          return;
        }
        const raw = String(msg.content ?? '').trim();
        if (!raw.startsWith('{')) return;
        const parsed = JSON.parse(raw) as { kind?: string; poll?: { pollId?: string; question?: string } };
        if (parsed.kind !== 'poll_created' || !parsed.poll?.pollId) return;
        const pollId = String(parsed.poll.pollId);
        const question = String(parsed.poll.question ?? '').trim();
        const toastId = `poll-created-${pollId}`;
        if (toast.isActive(toastId)) return;

        toast.info(question ? `Có bình chọn mới: ${question}` : 'Có bình chọn mới', {
          toastId,
          autoClose: 7000,
          onClick: () => {
            setActivePollId(pollId);
            setShowPollVoteModal(true);
          },
        });
      } catch {
        // ignore parse errors for non-json system messages
      }
    };

    const handleEditedMessage = (payload: { messageId: string; conversationId: string; content: string }) => {
      dispatch(messageEdited(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, {
        content: payload.content,
        isEdited: true,
      });
    };

    const handleRecalledMessage = (payload: { messageId: string; conversationId: string }) => {
      dispatch(messageRecalled(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, {
        isRecalled: true,
        content: 'Tin nhắn đã được thu hồi',
        isPinned: false,
      });
    };

    const handleHiddenForMe = (payload: { messageId: string; conversationId: string }) => {
      dispatch(messageHiddenForMe(payload));
      removeMessageFromCache(payload.conversationId, payload.messageId);
      dispatch(chatApi.util.invalidateTags(['Conversations']));
    };

    const handlePinUpdated = (payload: { messageId: string; conversationId: string; isPinned: boolean }) => {
      dispatch(messagePinUpdated(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, { isPinned: payload.isPinned });
    };

    const handleReactionEvent = (payload: {
      messageId: string;
      conversationId: string;
      reactions: Record<string, string[]>;
    }) => {
      dispatch(messageReacted(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, { reactions: payload.reactions });
    };

    const handleTypingEvent = (payload: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
      displayName?: string;
    }) => {
      if (payload.isTyping) {
        dispatch(
          typingStarted({
            conversationId: payload.conversationId,
            userId: payload.userId,
            displayName: payload.displayName,
          }),
        );
      } else {
        dispatch(typingStopped({ conversationId: payload.conversationId, userId: payload.userId }));
      }
    };

    const handleGroupUpdated = (payload: GroupUpdatedPayload) => {
      if (!payload.conversationId) return;

      dispatch(
        chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
          const conv = draft?.data?.find((item) => item.conversationId === payload.conversationId);
          if (!conv) return;
          if (payload.name) conv.name = payload.name;
          if (payload.avatar) conv.avatar = payload.avatar;
        }),
      );

      if (payload.conversationId !== activeConversationIdRef.current) {
        toast.info(`Nhóm '${payload.name ?? ''}' vừa cập nhật thông tin`);
      } else {
        void fetchGroupMembers(payload.conversationId);
      }
    };

    const wrappedNewMessage = (data: unknown) => handleNewMessage(data as IMessage);
    const wrappedGroupUpdated = (data: unknown) => handleGroupUpdated(data as GroupUpdatedPayload);
    const wrappedEdited = (data: unknown) =>
      handleEditedMessage(data as { messageId: string; conversationId: string; content: string });
    const wrappedRecalled = (data: unknown) =>
      handleRecalledMessage(data as { messageId: string; conversationId: string });
    const wrappedHidden = (data: unknown) =>
      handleHiddenForMe(data as { messageId: string; conversationId: string });
    const wrappedPinUpdated = (data: unknown) =>
      handlePinUpdated(data as { messageId: string; conversationId: string; isPinned: boolean });
    const wrappedReaction = (data: unknown) =>
      handleReactionEvent(
        data as { messageId: string; conversationId: string; reactions: Record<string, string[]> },
      );
    const wrappedTyping = (data: unknown) =>
      handleTypingEvent(
        data as { conversationId: string; userId: string; isTyping: boolean; displayName?: string },
      );

    socketService.on('message:new', wrappedNewMessage);
    socketService.on('group:updated', wrappedGroupUpdated);
    socketService.on('message:edited', wrappedEdited);
    socketService.on('message:recalled', wrappedRecalled);
    socketService.on('message:hidden_for_me', wrappedHidden);
    socketService.on('message:pin_updated', wrappedPinUpdated);
    socketService.on('message:reaction', wrappedReaction);
    socketService.on('message:typing', wrappedTyping);

    return () => {
      socketService.off('message:new', wrappedNewMessage);
      socketService.off('group:updated', wrappedGroupUpdated);
      socketService.off('message:edited', wrappedEdited);
      socketService.off('message:recalled', wrappedRecalled);
      socketService.off('message:hidden_for_me', wrappedHidden);
      socketService.off('message:pin_updated', wrappedPinUpdated);
      socketService.off('message:reaction', wrappedReaction);
      socketService.off('message:typing', wrappedTyping);
    };
  }, [
    dispatch,
    patchMessageInCache,
    removeMessageFromCache,
    fetchGroupMembers,
    isConnected,
    setActivePollId,
    setShowPollVoteModal,
  ]);
}
