import type { AppDispatch } from '@/store/store';
import { chatApi } from '@/store/api/chatApi';
import { bumpGroupBoardRefresh } from '@/store/slices/chatSlice';
import type { IConversation, IGroupSettings } from '@/types/chat.types';
import { normalizeGroupAvatarStoredValue } from '@/utils/groupAvatarUrl';
import { normalizeGroupSettings } from '@/utils/normalizeGroupSettings';

/** Đồng bộ `groupSettings` vào sidebar + query settings (socket / mutation). */
export function patchGroupSettingsInCaches(
  dispatch: AppDispatch,
  conversationId: string,
  groupSettings: IGroupSettings,
): void {
  const cid = String(conversationId ?? '').trim();
  if (!cid) return;
  const normalized = normalizeGroupSettings(groupSettings);
  dispatch(bumpGroupBoardRefresh({ conversationId: cid }));
  dispatch(
    chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
      if (!draft?.data) return;
      const c = draft.data.find((x) => x.conversationId === cid);
      if (c) (c as IConversation).groupSettings = normalized;
    }),
  );
  dispatch(
    chatApi.util.updateQueryData('getGroupSettings', cid, (draft) => {
      if (draft) draft.data = normalized;
    }),
  );
}

export type GroupProfilePatch = {
  name?: string | null;
  avatar?: string | null;
  memberCount?: number;
  updatedAt?: string;
  leaderId?: string | null;
  chatEnabled?: boolean;
};

/** Cập nhật tên/ảnh/số thành viên nhóm trên danh sách hội thoại (realtime). */
export function patchGroupProfileInConversationsCache(
  dispatch: AppDispatch,
  conversationId: string,
  patch: GroupProfilePatch,
): void {
  const cid = String(conversationId ?? '').trim();
  if (!cid) return;

  const name = typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : undefined;
  const hasAvatarField = patch.avatar !== undefined && patch.avatar !== null;
  const avatar = hasAvatarField ? String(patch.avatar).trim() : undefined;
  const memberCount =
    typeof patch.memberCount === 'number' && Number.isFinite(patch.memberCount)
      ? patch.memberCount
      : undefined;
  const updatedAt =
    typeof patch.updatedAt === 'string' && patch.updatedAt.trim()
      ? patch.updatedAt.trim()
      : undefined;
  const leaderId =
    typeof patch.leaderId === 'string' && patch.leaderId.trim() ? patch.leaderId.trim() : undefined;
  const chatEnabled = patch.chatEnabled;

  if (
    !name &&
    !hasAvatarField &&
    memberCount === undefined &&
    !updatedAt &&
    !leaderId &&
    chatEnabled === undefined
  )
    return;

  dispatch(
    chatApi.util.updateQueryData('getConversations', undefined, (draft) => {
      if (!draft?.data) return;
      const c = draft.data.find((x) => x.conversationId === cid);
      if (!c) return;
      if (name) c.name = name;
      if (hasAvatarField) {
        c.avatar = normalizeGroupAvatarStoredValue(avatar ?? null, cid);
      }
      if (memberCount !== undefined) c.memberCount = memberCount;
      if (updatedAt) c.updatedAt = updatedAt;
      if (leaderId) (c as IConversation).leaderId = leaderId;
      if (chatEnabled !== undefined) c.chatEnabled = chatEnabled;
    }),
  );
}

/** Trích conversationId + patch hồ sơ từ payload socket `group:updated` / member events. */
export function groupProfilePatchFromPayload(data: unknown): {
  conversationId: string;
  patch: GroupProfilePatch;
} | null {
  const p = data as {
    conversationId?: string;
    groupId?: string;
    name?: string;
    avatar?: string;
    memberCount?: number;
    updatedAt?: string;
    chatEnabled?: boolean;
  };
  const conversationId = String(p?.conversationId ?? p?.groupId ?? '').trim();
  if (!conversationId) return null;
  return {
    conversationId,
    patch: {
      name: p.name,
      avatar: p.avatar,
      memberCount: p.memberCount,
      updatedAt: p.updatedAt,
      chatEnabled: p.chatEnabled,
    },
  };
}
