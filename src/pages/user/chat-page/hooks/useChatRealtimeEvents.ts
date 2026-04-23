import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { chatApi } from '@/store/api/chatApi';
import {
  messageEdited,
  messageHiddenForViewer,
  messagePinUpdated,
  messageReacted,
  messageReceived,
  messageRecalled,
  setActiveConversation,
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
  patchMessageInCache: (
    conversationId: string,
    messageId: string,
    patch: Partial<IMessage>,
  ) => void;
  setPinnedMessageOrderByConv: Dispatch<SetStateAction<Record<string, string[]>>>;
  navigate: (path: string, options?: { replace?: boolean }) => void;
}

export function useChatRealtimeEvents({
  dispatch,
  isConnected,
  activeConversationId,
  setActivePollId,
  setShowPollVoteModal,
  fetchGroupMembers,
  patchMessageInCache,
  setPinnedMessageOrderByConv,
  navigate,
}: UseChatRealtimeEventsParams): void {
  const activeConversationIdRef = useRef<string | null>(activeConversationId);
  const typingCleanupTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!isConnected) return;

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
        if ((msg as { type?: string }).type !== 'system') return;
        const raw = String(msg.content ?? '').trim();
        if (!raw.startsWith('{')) return;
        const parsed = JSON.parse(raw) as {
          kind?: string;
          poll?: { pollId?: string; question?: string };
          task?: { taskId?: string; title?: string };
          actor?: { name?: string };
        };
        const kind = String(parsed.kind ?? '');

        if (kind === 'poll_created' && parsed.poll?.pollId) {
          // Trong đúng hội thoại: ChatPage hiển thị banner trong khung chat (useChatGroupFrameNotices).
          if (msg.conversationId === activeConversationIdRef.current) return;
          const pollId = String(parsed.poll.pollId);
          const question = String(parsed.poll.question ?? '').trim();
          const toastId = `poll-created-${pollId}`;
          if (toast.isActive(toastId)) return;
          toast.info(question ? `Có bình chọn mới: ${question}` : 'Có bình chọn mới', {
            toastId,
            autoClose: 7000,
            onClick: () => {
              if (msg.conversationId !== activeConversationIdRef.current) return;
              setActivePollId(pollId);
              setShowPollVoteModal(true);
            },
          });
          return;
        }

        if (kind === 'task_assigned') {
          if (msg.conversationId === activeConversationIdRef.current) return;
          const title = String(parsed.task?.title ?? '').trim();
          const toastId = `task-assigned-${msg.messageId}`;
          if (toast.isActive(toastId)) return;
          toast.info(title ? `Có công việc mới: ${title}` : 'Có công việc mới', {
            toastId,
            autoClose: 6500,
          });
          return;
        }

        if (kind === 'task_joined') {
          if (msg.conversationId === activeConversationIdRef.current) return;
          const title = String(parsed.task?.title ?? '').trim();
          const actor = String(parsed.actor?.name ?? '').trim();
          const toastId = `task-joined-${msg.messageId}`;
          if (toast.isActive(toastId)) return;
          toast.info(
            title
              ? `${actor || 'Một thành viên'} đã tham gia công việc: ${title}`
              : `${actor || 'Một thành viên'} đã tham gia công việc`,
            { toastId, autoClose: 5500 },
          );
          return;
        }
      } catch {
        // ignore parse errors for non-json system messages
      }
    };

    const handleEditedMessage = (payload: {
      messageId: string;
      conversationId: string;
      content: string;
    }) => {
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

      // Strip recalled message from pinned order
      setPinnedMessageOrderByConv((prev) => {
        const cid = payload.conversationId;
        const cur = prev[cid] ?? [];
        return { ...prev, [cid]: cur.filter((id) => id !== payload.messageId) };
      });
    };

    const handleHiddenForMe = (payload: { messageId: string; conversationId: string }) => {
      dispatch(messageHiddenForViewer(payload));
      dispatch(
        chatApi.util.updateQueryData(
          'getMessages',
          { conversationId: payload.conversationId },
          (draft) => {
            if (!draft.data) return;
            draft.data = draft.data.filter((x) => x.messageId !== payload.messageId);
          },
        ),
      );
      dispatch(chatApi.util.invalidateTags(['Conversations']));
    };

    const handlePinUpdated = (payload: {
      messageId: string;
      conversationId: string;
      isPinned: boolean;
    }) => {
      dispatch(messagePinUpdated(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, {
        isPinned: payload.isPinned,
      });

      // Update pinned MRU order
      setPinnedMessageOrderByConv((prev) => {
        const cid = payload.conversationId;
        const cur = prev[cid] ?? [];
        if (payload.isPinned) {
          return {
            ...prev,
            [cid]: [payload.messageId, ...cur.filter((id) => id !== payload.messageId)],
          };
        }
        return { ...prev, [cid]: cur.filter((id) => id !== payload.messageId) };
      });
    };

    const handleReactionEvent = (payload: {
      messageId: string;
      conversationId: string;
      reactions: Record<string, string[]>;
    }) => {
      dispatch(messageReacted(payload));
      patchMessageInCache(payload.conversationId, payload.messageId, {
        reactions: payload.reactions,
      });
    };

    const handleTypingEvent = (payload: {
      conversationId: string;
      userId: string;
      displayName?: string | null;
    }) => {
      dispatch(
        typingStarted({
          conversationId: payload.conversationId,
          userId: payload.userId,
          displayName: payload.displayName ?? undefined,
        }),
      );
      const timerKey = `${payload.conversationId}:${payload.userId}`;
      const existingTimer = typingCleanupTimersRef.current[timerKey];
      if (existingTimer) clearTimeout(existingTimer);
      typingCleanupTimersRef.current[timerKey] = setTimeout(() => {
        dispatch(typingStopped({ conversationId: payload.conversationId, userId: payload.userId }));
        delete typingCleanupTimersRef.current[timerKey];
      }, 1000);
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

    const handleGroupDisbanded = (data: unknown) => {
      const p = data as { conversationId?: string; groupId?: string };
      const cid = p?.conversationId ?? p?.groupId;
      if (!cid) return;
      if (cid !== activeConversationIdRef.current) return;
      toast.info('Nhóm đã được giải tán');
      dispatch(setActiveConversation(null));
      void navigate('/chat', { replace: true });
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
        data as { conversationId: string; userId: string; displayName?: string | null },
      );

    socketService.on('message:new', wrappedNewMessage);
    socketService.on('group:updated', wrappedGroupUpdated);
    socketService.on('group:disbanded', handleGroupDisbanded);
    socketService.on('message:edited', wrappedEdited);
    socketService.on('message:recall', wrappedRecalled);
    socketService.on('message:recalled', wrappedRecalled);
    socketService.on('message:hidden_for_me', wrappedHidden);
    socketService.on('message:pin_updated', wrappedPinUpdated);
    socketService.on('message:reacted', wrappedReaction);
    socketService.on('message:reaction', wrappedReaction);
    socketService.on('message:typing_indicator', wrappedTyping);

    return () => {
      socketService.off('message:new', wrappedNewMessage);
      socketService.off('group:updated', wrappedGroupUpdated);
      socketService.off('group:disbanded', handleGroupDisbanded);
      socketService.off('message:edited', wrappedEdited);
      socketService.off('message:recall', wrappedRecalled);
      socketService.off('message:recalled', wrappedRecalled);
      socketService.off('message:hidden_for_me', wrappedHidden);
      socketService.off('message:pin_updated', wrappedPinUpdated);
      socketService.off('message:reacted', wrappedReaction);
      socketService.off('message:reaction', wrappedReaction);
      socketService.off('message:typing_indicator', wrappedTyping);
      Object.values(typingCleanupTimersRef.current).forEach(clearTimeout);
      typingCleanupTimersRef.current = {};
    };
  }, [
    dispatch,
    patchMessageInCache,
    setPinnedMessageOrderByConv,
    fetchGroupMembers,
    isConnected,
    setActivePollId,
    setShowPollVoteModal,
    navigate,
  ]);
}
