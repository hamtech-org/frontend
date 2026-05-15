import type { IConversation, IGroupSettings } from '@/types/chat.types';
import type { GroupMemberRole } from '@/types/chat.group.types';

function mergedMemberPermissions(gs?: IGroupSettings) {
  const mp = gs?.memberPermissions;
  if (!mp) {
    return {
      changeNameAvatar: false,
      pinMessages: false,
      createNotesReminders: false,
      createPolls: false,
      sendMessages: false,
    };
  }
  return {
    changeNameAvatar: Boolean(mp.changeNameAvatar),
    pinMessages: Boolean(mp.pinMessages),
    createNotesReminders: Boolean(mp.createNotesReminders),
    createPolls: Boolean(mp.createPolls),
    sendMessages: Boolean(mp.sendMessages),
  };
}

function isElevated(role: GroupMemberRole | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

type RoleLookupMember = { userId?: string; role?: string };

/** Chỉ cần type + groupSettings khi kiểm tra quyền thành viên. */
export type GroupPermissionConversation = Pick<IConversation, 'type' | 'groupSettings'> & {
  creatorId?: string | null;
};

/** Suy ra vai trò nhóm — fallback creatorId khi bản ghi MEMBER# thiếu role. */
export function resolveGroupMemberRole(args: {
  userId?: string;
  members?: RoleLookupMember[];
  conversationCreatorId?: string | null;
}): GroupMemberRole | undefined {
  const uid = String(args.userId ?? '').trim();
  if (!uid) return undefined;
  const hit = args.members?.find((m) => String(m.userId ?? '').trim() === uid);
  const fromList = String(hit?.role ?? '')
    .trim()
    .toLowerCase();
  if (fromList === 'owner' || fromList === 'admin' || fromList === 'member') return fromList;
  const creator =
    String(args.conversationCreatorId ?? '').trim() ||
    String(
      args.members?.find(
        (m) =>
          String(m.role ?? '')
            .trim()
            .toLowerCase() === 'owner',
      )?.userId ?? '',
    ).trim();
  if (creator && creator === uid) return 'owner';
  return undefined;
}

function resolveRoleForCheck(args: {
  conversation?: GroupPermissionConversation | null;
  userRole?: GroupMemberRole;
  userId?: string;
  members?: RoleLookupMember[];
}): GroupMemberRole | undefined {
  return (
    args.userRole ??
    resolveGroupMemberRole({
      userId: args.userId,
      members: args.members,
      conversationCreatorId: args.conversation?.creatorId,
    })
  );
}

/**
 * Ghim/bỏ ghim tin trong nhóm — khớp `ChatPage` + `groupService.assertUserMayPinMessage`:
 * owner/admin luôn được; thành viên cần `memberPermissions.pinMessages`.
 */
export function canUserPinMessageInGroup(args: {
  conversation?: GroupPermissionConversation | null;
  userRole?: GroupMemberRole;
  userId?: string;
  members?: RoleLookupMember[];
}): boolean {
  const { conversation } = args;
  if (conversation?.type !== 'group') return true;
  const role = resolveRoleForCheck(args);
  if (role == null) return false;
  if (isElevated(role)) return true;
  return mergedMemberPermissions(conversation.groupSettings).pinMessages;
}

/** Tạo bình chọn trong nhóm — owner/admin luôn được; member cần `createPolls`. */
export function canUserCreatePollInGroup(args: {
  conversation?: GroupPermissionConversation | null;
  userRole?: GroupMemberRole;
  userId?: string;
  members?: RoleLookupMember[];
}): boolean {
  const { conversation } = args;
  if (conversation?.type !== 'group') return false;
  const role = resolveRoleForCheck(args);
  if (role == null) return false;
  if (isElevated(role)) return true;
  return mergedMemberPermissions(conversation.groupSettings).createPolls;
}

/** Giao việc / nhắc hẹn — owner/admin luôn được; member cần `createNotesReminders`. */
export function canUserCreateTaskInGroup(args: {
  conversation?: GroupPermissionConversation | null;
  userRole?: GroupMemberRole;
  userId?: string;
  members?: RoleLookupMember[];
}): boolean {
  const { conversation } = args;
  if (conversation?.type !== 'group') return false;
  const role = resolveRoleForCheck(args);
  if (role == null) return false;
  if (isElevated(role)) return true;
  return mergedMemberPermissions(conversation.groupSettings).createNotesReminders;
}

/** Đổi tên/ảnh nhóm — chỉ trưởng nhóm luôn được; phó/member cần `changeNameAvatar`. */
export function canUserChangeGroupProfileInGroup(args: {
  conversation?: GroupPermissionConversation | null;
  userRole?: GroupMemberRole;
  userId?: string;
  members?: RoleLookupMember[];
}): boolean {
  const { conversation } = args;
  if (conversation?.type !== 'group') return false;
  const role = resolveRoleForCheck(args);
  if (role == null) return false;
  if (role === 'owner') return true;
  return mergedMemberPermissions(conversation.groupSettings).changeNameAvatar;
}

/** Gửi tin nhắn — owner/admin luôn được; member cần `sendMessages`. */
export function canUserSendMessageInGroup(args: {
  conversation?: GroupPermissionConversation | null;
  userRole?: GroupMemberRole;
  userId?: string;
  members?: RoleLookupMember[];
}): boolean {
  const { conversation } = args;
  if (conversation?.type !== 'group') return true;
  const role = resolveRoleForCheck(args);
  if (role == null) return false;
  if (isElevated(role)) return true;
  return mergedMemberPermissions(conversation.groupSettings).sendMessages;
}
