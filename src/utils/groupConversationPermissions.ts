import type { IConversation, IGroupSettings } from '@/types/chat.types';
import type { GroupMemberRole } from '@/types/chat.group.types';

function mergedMemberPermissions(gs?: IGroupSettings) {
  const mp = gs?.memberPermissions;
  return {
    changeNameAvatar: mp?.changeNameAvatar ?? true,
    pinMessages: mp?.pinMessages ?? true,
    createNotesReminders: mp?.createNotesReminders ?? true,
    createPolls: mp?.createPolls ?? true,
    sendMessages: mp?.sendMessages ?? true,
  };
}

function isElevated(role: GroupMemberRole | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Ghim/bỏ ghim tin trong nhóm — khớp `ChatPage` + `groupService.assertUserMayPinMessage`:
 * owner/admin luôn được; thành viên cần `memberPermissions.pinMessages`.
 */
export function canUserPinMessageInGroup(args: {
  conversation?: Pick<IConversation, 'type' | 'groupSettings'> | null;
  userRole: GroupMemberRole | undefined;
}): boolean {
  const { conversation, userRole } = args;
  if (conversation?.type !== 'group') return true;
  if (userRole == null) return true;
  if (isElevated(userRole)) return true;
  return mergedMemberPermissions(conversation.groupSettings).pinMessages;
}

/** Tạo bình chọn trong nhóm — owner/admin luôn được; member cần `createPolls`. */
export function canUserCreatePollInGroup(args: {
  conversation?: Pick<IConversation, 'type' | 'groupSettings'> | null;
  userRole: GroupMemberRole | undefined;
}): boolean {
  const { conversation, userRole } = args;
  if (conversation?.type !== 'group') return false;
  if (userRole == null) return true;
  if (isElevated(userRole)) return true;
  return mergedMemberPermissions(conversation.groupSettings).createPolls;
}

/** Giao việc / nhắc hẹn — owner/admin luôn được; member cần `createNotesReminders`. */
export function canUserCreateTaskInGroup(args: {
  conversation?: Pick<IConversation, 'type' | 'groupSettings'> | null;
  userRole: GroupMemberRole | undefined;
}): boolean {
  const { conversation, userRole } = args;
  if (conversation?.type !== 'group') return false;
  if (userRole == null) return true;
  if (isElevated(userRole)) return true;
  return mergedMemberPermissions(conversation.groupSettings).createNotesReminders;
}
