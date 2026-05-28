import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { useUpdateConversationPreferencesMutation } from '@/store/api/chatApi';
import { MAX_PINNED_CHATS_TO_TOP } from '@/components/chat/chatPinConstants';
import type { IConversation } from '@/types/chat.types';
import type { MuteNotificationsApplyPayload } from '@/components/chat/MuteNotificationsModal';

interface UseConversationPreferencesParams {
  activeConversationId: string | null;
  conversations: IConversation[];
}

export function useConversationPreferences({
  activeConversationId,
  conversations,
}: UseConversationPreferencesParams) {
  const [updateConversationPreferences] = useUpdateConversationPreferencesMutation();

  // ── Conversation pin limit state ─────────────────────────────────────
  const [convPinLimitPendingId, setConvPinLimitPendingId] = useState<string | null>(null);
  const [convPinLimitConfirmBusy, setConvPinLimitConfirmBusy] = useState(false);
  const [convPinLimitUnpinningId, setConvPinLimitUnpinningId] = useState<string | null>(null);

  // ── Mute ──────────────────────────────────────────────────────────────
  const handleToggleConversationMute = useCallback(
    async (conversationId: string) => {
      const c = conversations.find((x) => x.conversationId === conversationId);
      if (!(c?.isMuted ?? false)) return;
      try {
        await updateConversationPreferences({
          conversationId,
          isMuted: false,
          notificationsMutedUntil: null,
        }).unwrap();
        toast.success('Đã bật thông báo');
      } catch {
        toast.error('Không thể cập nhật thông báo');
      }
    },
    [conversations, updateConversationPreferences],
  );

  const handleApplyMuteFromModal = useCallback(
    async (payload: MuteNotificationsApplyPayload) => {
      if (!activeConversationId) {
        toast.error('Không có hội thoại đang mở');
        throw new Error('no_active');
      }
      try {
        if (payload.kind === 'muteFor') {
          await updateConversationPreferences({
            conversationId: activeConversationId,
            muteFor: payload.muteFor,
          }).unwrap();
          const label =
            payload.muteFor === '1m' ? '1 phút' : payload.muteFor === '5m' ? '5 phút' : '10 phút';
          toast.success(`Đã tắt thông báo trong ${label}`);
        } else if (payload.kind === 'untilIso') {
          await updateConversationPreferences({
            conversationId: activeConversationId,
            isMuted: false,
            notificationsMutedUntil: payload.notificationsMutedUntil,
          }).unwrap();
          toast.success('Đã tắt thông báo đến 8:00 sáng');
        } else {
          await updateConversationPreferences({
            conversationId: activeConversationId,
            isMuted: true,
          }).unwrap();
          toast.success('Đã tắt thông báo đến khi bạn bật lại');
        }
      } catch {
        toast.error('Không thể cập nhật thông báo');
        throw new Error('mute_failed');
      }
    },
    [activeConversationId, updateConversationPreferences],
  );

  // ── Pin conversation ──────────────────────────────────────────────────
  const handleToggleConversationPin = useCallback(
    async (conversationId: string) => {
      const c = conversations.find((x) => x.conversationId === conversationId);
      const next = !(c?.isPinnedToTop ?? false);
      if (next) {
        const pinnedTopCount = conversations.filter((x) => x.isPinnedToTop).length;
        if (!c?.isPinnedToTop && pinnedTopCount >= MAX_PINNED_CHATS_TO_TOP) {
          setConvPinLimitPendingId(conversationId);
          return;
        }
      }
      try {
        await updateConversationPreferences({ conversationId, isPinnedToTop: next }).unwrap();
        toast.success(next ? 'Đã ghim hội thoại' : 'Đã bỏ ghim hội thoại');
      } catch (e: unknown) {
        const err = e as { status?: number; data?: { error?: { message?: string } } };
        const msg = err?.data?.error?.message ?? '';
        if (next && (msg.includes('Chỉ ghim được tối đa') || err.status === 403)) {
          setConvPinLimitPendingId(conversationId);
        } else {
          toast.error(msg || 'Không thể cập nhật ghim hội thoại');
        }
      }
    },
    [conversations, updateConversationPreferences],
  );

  const handleUnpinFromConvPinModal = useCallback(
    async (targetConversationId: string) => {
      setConvPinLimitUnpinningId(targetConversationId);
      try {
        await updateConversationPreferences({
          conversationId: targetConversationId,
          isPinnedToTop: false,
        }).unwrap();
        toast.success('Đã bỏ ghim hội thoại');
      } catch (err: unknown) {
        const msg = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
        toast.error(msg ?? 'Không thể bỏ ghim');
      } finally {
        setConvPinLimitUnpinningId(null);
      }
    },
    [updateConversationPreferences],
  );

  const handleConfirmPendingConvPin = useCallback(async () => {
    if (!convPinLimitPendingId) return;
    const pinnedTopCount = conversations.filter((x) => x.isPinnedToTop).length;
    if (pinnedTopCount >= MAX_PINNED_CHATS_TO_TOP) {
      toast.info('Vui lòng bỏ ghim ít nhất một hội thoại trước.');
      return;
    }
    const pendingId = convPinLimitPendingId;
    setConvPinLimitConfirmBusy(true);
    try {
      await updateConversationPreferences({
        conversationId: pendingId,
        isPinnedToTop: true,
      }).unwrap();
      toast.success('Đã ghim hội thoại');
      setConvPinLimitPendingId(null);
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(msg ?? 'Không thể ghim hội thoại');
    } finally {
      setConvPinLimitConfirmBusy(false);
    }
  }, [convPinLimitPendingId, conversations, updateConversationPreferences]);

  return {
    // Mute
    handleToggleConversationMute,
    handleApplyMuteFromModal,
    // Pin conversation
    handleToggleConversationPin,
    handleUnpinFromConvPinModal,
    handleConfirmPendingConvPin,
    // Pin limit modal state
    convPinLimitPendingId,
    setConvPinLimitPendingId,
    convPinLimitConfirmBusy,
    convPinLimitUnpinningId,
  };
}
