import { useCallback } from 'react';
import { chatApi } from '@/store/api/chatApi';
import { messageEdited, messageHiddenForViewer, messagePinUpdated, messageRecalled } from '@/store/slices/chatSlice';
import type { AppDispatch } from '@/store/store';
import type { IMessage } from '@/types/chat.types';
import type { MessageConfirmState } from '@/types/chat.group.types';

interface UseMessageModerationActionsParams {
  dispatch: AppDispatch;
  editingMessage: IMessage | null;
  editDraft: string;
  setEditingMessage: (message: IMessage | null) => void;
  setActionMenuMsgId: (id: string | null) => void;
  messageConfirm: MessageConfirmState;
  setMessageConfirm: (value: MessageConfirmState) => void;
  setMessageConfirmSubmitting: (value: boolean) => void;
  patchMessageInCache: (conversationId: string, messageId: string, patch: Partial<IMessage>) => void;
  removeMessageFromCache: (conversationId: string, messageId: string) => void;
  editMessage: (payload: {
    messageId: string;
    content: string;
    conversationId: string;
    createdAt: string;
  }) => { unwrap: () => Promise<unknown> };
  recallMessage: (payload: {
    messageId: string;
    conversationId: string;
    createdAt: string;
  }) => { unwrap: () => Promise<unknown> };
  deleteMessage: (payload: {
    messageId: string;
    conversationId: string;
    createdAt: string;
  }) => { unwrap: () => Promise<unknown> };
  pinMessage: (payload: {
    messageId: string;
    conversationId: string;
    createdAt: string;
  }) => { unwrap: () => Promise<unknown> };
  unpinMessage: (payload: {
    messageId: string;
    conversationId: string;
    createdAt: string;
  }) => { unwrap: () => Promise<unknown> };
}

export function useMessageModerationActions({
  dispatch,
  editingMessage,
  editDraft,
  setEditingMessage,
  setActionMenuMsgId,
  messageConfirm,
  setMessageConfirm,
  setMessageConfirmSubmitting,
  patchMessageInCache,
  removeMessageFromCache,
  editMessage,
  recallMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
}: UseMessageModerationActionsParams) {
  const handleSaveEdit = useCallback(async () => {
    if (!editingMessage || !editDraft.trim()) return;
    try {
      await editMessage({
        messageId: editingMessage.messageId,
        content: editDraft.trim(),
        conversationId: editingMessage.conversationId,
        createdAt: editingMessage.createdAt,
      }).unwrap();
      dispatch(
        messageEdited({
          messageId: editingMessage.messageId,
          conversationId: editingMessage.conversationId,
          content: editDraft.trim(),
        }),
      );
      patchMessageInCache(editingMessage.conversationId, editingMessage.messageId, {
        content: editDraft.trim(),
        isEdited: true,
      });
      setEditingMessage(null);
    } catch {
      // giữ modal để user có thể sửa lại nội dung
    }
  }, [editingMessage, editDraft, editMessage, dispatch, patchMessageInCache, setEditingMessage]);

  const handleRecallMsg = useCallback(
    (msg: IMessage) => {
      setActionMenuMsgId(null);
      setMessageConfirm({ kind: 'recall', msg });
    },
    [setActionMenuMsgId, setMessageConfirm],
  );

  const handleDeleteMsg = useCallback(
    (msg: IMessage) => {
      setActionMenuMsgId(null);
      setMessageConfirm({ kind: 'delete', msg });
    },
    [setActionMenuMsgId, setMessageConfirm],
  );

  const handleMessageConfirm = useCallback(async () => {
    if (!messageConfirm) return;
    const { kind, msg } = messageConfirm;
    setMessageConfirmSubmitting(true);
    try {
      if (kind === 'recall') {
        await recallMessage({
          messageId: msg.messageId,
          conversationId: msg.conversationId,
          createdAt: msg.createdAt,
        }).unwrap();
        dispatch(messageRecalled({ messageId: msg.messageId, conversationId: msg.conversationId }));
        patchMessageInCache(msg.conversationId, msg.messageId, {
          isRecalled: true,
          content: 'Tin nhắn đã được thu hồi',
          isPinned: false,
        });
      } else {
        await deleteMessage({
          messageId: msg.messageId,
          conversationId: msg.conversationId,
          createdAt: msg.createdAt,
        }).unwrap();
        dispatch(messageHiddenForViewer({ messageId: msg.messageId, conversationId: msg.conversationId }));
        removeMessageFromCache(msg.conversationId, msg.messageId);
        dispatch(chatApi.util.invalidateTags(['Conversations']));
      }
      setMessageConfirm(null);
      setActionMenuMsgId(null);
    } catch {
      // ignore
    } finally {
      setMessageConfirmSubmitting(false);
    }
  }, [
    messageConfirm,
    recallMessage,
    deleteMessage,
    dispatch,
    patchMessageInCache,
    removeMessageFromCache,
    setMessageConfirm,
    setActionMenuMsgId,
    setMessageConfirmSubmitting,
  ]);

  const handleTogglePinMsg = useCallback(
    async (msg: IMessage) => {
      try {
        if (msg.isPinned) {
          await unpinMessage({
            messageId: msg.messageId,
            conversationId: msg.conversationId,
            createdAt: msg.createdAt,
          }).unwrap();
          dispatch(
            messagePinUpdated({
              messageId: msg.messageId,
              conversationId: msg.conversationId,
              isPinned: false,
            }),
          );
          patchMessageInCache(msg.conversationId, msg.messageId, { isPinned: false });
        } else {
          await pinMessage({
            messageId: msg.messageId,
            conversationId: msg.conversationId,
            createdAt: msg.createdAt,
          }).unwrap();
          dispatch(
            messagePinUpdated({
              messageId: msg.messageId,
              conversationId: msg.conversationId,
              isPinned: true,
            }),
          );
          patchMessageInCache(msg.conversationId, msg.messageId, { isPinned: true });
        }
        setActionMenuMsgId(null);
      } catch {
        // ignore
      }
    },
    [pinMessage, unpinMessage, dispatch, patchMessageInCache, setActionMenuMsgId],
  );

  return {
    handleSaveEdit,
    handleRecallMsg,
    handleDeleteMsg,
    handleMessageConfirm,
    handleTogglePinMsg,
  };
}
