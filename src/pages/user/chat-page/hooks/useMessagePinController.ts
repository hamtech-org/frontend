import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { usePinMessageMutation, useUnpinMessageMutation } from '@/store/api/chatApi';
import { messagePinUpdated } from '@/store/slices/chatSlice';
import { MAX_PINNED_PER_CONVERSATION } from '@/components/chat/chatPinConstants';
import type { AppDispatch } from '@/store/store';
import type { IConversation, IMessage } from '@/types/chat.types';
import type { GroupMember } from '@/types/chat.group.types';

interface UseMessagePinControllerParams {
  dispatch: AppDispatch;
  activeConversationId: string | null;
  activeConversation?: IConversation;
  currentUserId: string;
  groupMembers: GroupMember[];
  pinnedMessagesOrdered: IMessage[];
  allMessages: IMessage[];
  patchMessageInCache: (
    conversationId: string,
    messageId: string,
    patch: Partial<IMessage>,
  ) => void;
  setPinnedMessageOrderByConv: Dispatch<SetStateAction<Record<string, string[]>>>;
  setActionMenuMsgId: (id: string | null) => void;
}

export function useMessagePinController({
  dispatch,
  activeConversationId,
  activeConversation,
  currentUserId,
  groupMembers,
  pinnedMessagesOrdered,
  allMessages,
  patchMessageInCache,
  setPinnedMessageOrderByConv,
  setActionMenuMsgId,
}: UseMessagePinControllerParams) {
  const [pinMessage] = usePinMessageMutation();
  const [unpinMessage] = useUnpinMessageMutation();

  // ── Pin limit replace modal state ────────────────────────────────────
  const [pinLimitModalMsg, setPinLimitModalMsg] = useState<IMessage | null>(null);
  const [pinReplaceIndex, setPinReplaceIndex] = useState<number | null>(null);
  const [pinLimitSubmitting, setPinLimitSubmitting] = useState(false);

  /** Toggle pin with permission check + limit check */
  const handleTogglePinMsg = useCallback(
    async (msg: IMessage) => {
      try {
        const cid = msg.conversationId;
        if (msg.isPinned) {
          const myRole = groupMembers.find((m) => m.userId === currentUserId)?.role;
          if (
            activeConversation?.type === 'group' &&
            myRole === 'member' &&
            activeConversation.groupSettings &&
            !activeConversation.groupSettings.memberPermissions.pinMessages
          ) {
            toast.error('Nhóm không cho phép thành viên bỏ/ghim tin nhắn.');
            setActionMenuMsgId(null);
            return;
          }
          await unpinMessage({
            messageId: msg.messageId,
            conversationId: cid,
            createdAt: msg.createdAt,
          }).unwrap();
          dispatch(
            messagePinUpdated({
              messageId: msg.messageId,
              conversationId: cid,
              isPinned: false,
            }),
          );
          patchMessageInCache(cid, msg.messageId, { isPinned: false });
          setPinnedMessageOrderByConv((prev) => ({
            ...prev,
            [cid]: (prev[cid] ?? []).filter((id) => id !== msg.messageId),
          }));
        } else {
          const sameConv = activeConversationId && cid === activeConversationId;
          const pinCount = sameConv
            ? pinnedMessagesOrdered.length
            : allMessages.filter(
                (m) => m.conversationId === cid && m.isPinned && !m.isRecalled && !m.isDeleted,
              ).length;
          if (pinCount >= MAX_PINNED_PER_CONVERSATION) {
            if (sameConv && pinnedMessagesOrdered.length >= MAX_PINNED_PER_CONVERSATION) {
              setPinReplaceIndex(null);
              setPinLimitModalMsg(msg);
              setActionMenuMsgId(null);
              return;
            }
            toast.error(`Đã đủ ${MAX_PINNED_PER_CONVERSATION} tin ghim trong cuộc trò chuyện này.`);
            setActionMenuMsgId(null);
            return;
          }
          const myRole = groupMembers.find((m) => m.userId === currentUserId)?.role;
          if (
            activeConversation?.type === 'group' &&
            myRole === 'member' &&
            activeConversation.groupSettings &&
            !activeConversation.groupSettings.memberPermissions.pinMessages
          ) {
            toast.error('Nhóm không cho phép thành viên ghim tin nhắn.');
            setActionMenuMsgId(null);
            return;
          }
          await pinMessage({
            messageId: msg.messageId,
            conversationId: cid,
            createdAt: msg.createdAt,
          }).unwrap();
          dispatch(
            messagePinUpdated({
              messageId: msg.messageId,
              conversationId: cid,
              isPinned: true,
            }),
          );
          patchMessageInCache(cid, msg.messageId, { isPinned: true });
          setPinnedMessageOrderByConv((prev) => ({
            ...prev,
            [cid]: [msg.messageId, ...(prev[cid] ?? []).filter((id) => id !== msg.messageId)],
          }));
        }
        setActionMenuMsgId(null);
      } catch (e: unknown) {
        const errMsg = (e as { data?: { error?: { message?: string } } })?.data?.error?.message;
        if (errMsg) toast.error(errMsg);
      }
    },
    [
      pinMessage,
      unpinMessage,
      dispatch,
      patchMessageInCache,
      setPinnedMessageOrderByConv,
      activeConversationId,
      pinnedMessagesOrdered,
      allMessages,
      activeConversation,
      groupMembers,
      currentUserId,
      setActionMenuMsgId,
    ],
  );

  /** Replace a pinned message when limit is reached */
  const handleConfirmPinReplace = useCallback(async () => {
    if (
      pinReplaceIndex === null ||
      !pinLimitModalMsg ||
      pinnedMessagesOrdered.length < MAX_PINNED_PER_CONVERSATION
    )
      return;
    const victim = pinnedMessagesOrdered[pinReplaceIndex];
    if (!victim) return;
    const toPin = pinLimitModalMsg;
    const cid = toPin.conversationId;
    setPinLimitSubmitting(true);
    try {
      await unpinMessage({
        messageId: victim.messageId,
        conversationId: cid,
        createdAt: victim.createdAt,
      }).unwrap();
      dispatch(
        messagePinUpdated({
          messageId: victim.messageId,
          conversationId: cid,
          isPinned: false,
        }),
      );
      patchMessageInCache(cid, victim.messageId, { isPinned: false });
      setPinnedMessageOrderByConv((prev) => ({
        ...prev,
        [cid]: (prev[cid] ?? []).filter((id) => id !== victim.messageId),
      }));

      await pinMessage({
        messageId: toPin.messageId,
        conversationId: cid,
        createdAt: toPin.createdAt,
      }).unwrap();
      dispatch(
        messagePinUpdated({
          messageId: toPin.messageId,
          conversationId: cid,
          isPinned: true,
        }),
      );
      patchMessageInCache(cid, toPin.messageId, { isPinned: true });
      setPinnedMessageOrderByConv((prev) => ({
        ...prev,
        [cid]: [toPin.messageId, ...(prev[cid] ?? []).filter((id) => id !== toPin.messageId)],
      }));
      setPinLimitModalMsg(null);
      setActionMenuMsgId(null);
    } catch {
      toast.error('Không cập nhật ghim được. Thử lại.');
    } finally {
      setPinLimitSubmitting(false);
    }
  }, [
    pinLimitModalMsg,
    pinnedMessagesOrdered,
    pinReplaceIndex,
    unpinMessage,
    pinMessage,
    dispatch,
    patchMessageInCache,
    setPinnedMessageOrderByConv,
    setActionMenuMsgId,
  ]);

  return {
    handleTogglePinMsg,
    handleConfirmPinReplace,
    // Pin limit modal state
    pinLimitModalMsg,
    setPinLimitModalMsg,
    pinReplaceIndex,
    setPinReplaceIndex,
    pinLimitSubmitting,
  };
}
