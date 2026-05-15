import { useMemo } from 'react';
import { useGetGroupSettingsQuery } from '@/store/api/chatApi';
import type { IConversation } from '@/types/chat.types';
import { normalizeGroupSettings } from '@/utils/normalizeGroupSettings';

/**
 * Gộp `groupSettings` mới nhất từ API settings vào conversation đang active
 * (tránh member vẫn dùng cache cũ sau khi admin tắt quyền).
 */
export function useConversationWithFreshGroupSettings(
  conversation: IConversation | undefined,
): IConversation | undefined {
  const groupId = conversation?.type === 'group' ? conversation.conversationId : undefined;
  const { data: settingsRes } = useGetGroupSettingsQuery(groupId!, {
    skip: !groupId,
  });

  return useMemo(() => {
    if (!conversation) return undefined;
    if (conversation.type !== 'group') return conversation;
    const fresh = settingsRes?.data;
    if (!fresh) return conversation;
    return {
      ...conversation,
      groupSettings: normalizeGroupSettings(fresh),
    };
  }, [conversation, settingsRes?.data]);
}
