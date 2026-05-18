import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { usePinMessageMutation, useUnpinMessageMutation } from '@/store/api/chatApi';
import { chatApi } from '@/store/api/chatApi';
import { messageReceived } from '@/store/slices/chatSlice';
import { messagePinUpdated } from '@/store/slices/chatSlice';
import { MAX_PINNED_PER_CONVERSATION } from '@/components/chat/chatPinConstants';
import type { AppDispatch } from '@/store/store';
import type { IConversation, IMessage } from '@/types/chat.types';
import type { GroupMember } from '@/types/chat.group.types';
import { canUserPinMessageInGroup } from '@/utils/groupConversationPermissions';

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

  const pushLocalPinSystemLine = useCallback(
    (params: { conversationId: string; actorLabel: string; pinned: boolean }) => {
      const { conversationId, actorLabel, pinned } = params;
      const sys: IMessage = {
        messageId: `local-pin:${conversationId}:${pinned ? 'pin' : 'unpin'}:${Date.now()}`,
        conversationId,
        senderId: 'system',
        senderDisplayName: 'Hệ thống',
        type: 'system',
        content: `${actorLabel} ${pinned ? 'đã ghim' : 'đã bỏ ghim'} một tin nhắn`,
        mediaUrl: null,
        thumbnailUrl: null,
        replyTo: null,
        replyToDetails: null,
        isPinned: false,
        isEdited: false,
        isRecalled: false,
        isDeleted: false,
        reactions: {},
        status: 'sent',
        createdAt: new Date().toISOString(),
      };
      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
          if (!draft.data) draft.data = [];
          draft.data.push(sys);
        }),
      );
      dispatch(messageReceived(sys));
    },
    [dispatch],
  );

  // ── Pin limit replace modal state ────────────────────────────────────
  const [pinLimitModalMsg, setPinLimitModalMsg] = useState<IMessage | null>(null);
  const [pinReplaceIndex, setPinReplaceIndex] = useState<number | null>(null);
  const [pinLimitSubmitting, setPinLimitSubmitting] = useState(false);

  /** Toggle pin with permission check + limit check */
  const handleTogglePinMsg = useCallback(
    async (msg: IMessage) => {
      try {
        const cid = msg.conversationId;
        const actorLabel = msg.senderId === currentUserId ? 'Bạn' : 'Ai đó';
        if (msg.isPinned) {
          const myRole = groupMembers.find((m) => m.userId === currentUserId)?.role;
          if (
            !canUserPinMessageInGroup({
              conversation: activeConversation,
              userRole: myRole,
              userId: currentUserId,
              members: groupMembers,
            })
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
          pushLocalPinSystemLine({ conversationId: cid, actorLabel, pinned: false });
        } else {
          const visiblePinCount = allMessages.filter(
            (m) => m.conversationId === cid && Boolean(m.isPinned) && !m.isRecalled && !m.isDeleted,
          ).length;
          if (visiblePinCount >= MAX_PINNED_PER_CONVERSATION) {
            setPinReplaceIndex(null);
            setPinLimitModalMsg(msg);
            setActionMenuMsgId(null);
            return;
          }
          const myRole = groupMembers.find((m) => m.userId === currentUserId)?.role;
          if (
            !canUserPinMessageInGroup({
              conversation: activeConversation,
              userRole: myRole,
              userId: currentUserId,
              members: groupMembers,
            })
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
          pushLocalPinSystemLine({ conversationId: cid, actorLabel, pinned: true });
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
      pushLocalPinSystemLine,
      patchMessageInCache,
      setPinnedMessageOrderByConv,
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
