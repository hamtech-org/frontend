import type { IConversation, IGroupSettings } from '@/types/chat.types';
import type { GroupMemberRole } from '@/types/chat.group.types';

/** Số phó nhóm tối đa trong một nhóm (khớp backend `MAX_GROUP_ADMINS`). */
export const MAX_GROUP_ADMINS = 3;

type AdminCountableMember = { role?: string | null };

export function countGroupAdmins(members: AdminCountableMember[] | undefined): number {
  return (members ?? []).filter(
    (m) =>
      String(m.role ?? '')
        .trim()
        .toLowerCase() === 'admin',
  ).length;
}

export function isGroupAdminSlotsFull(members: AdminCountableMember[] | undefined): boolean {
  return countGroupAdmins(members) >= MAX_GROUP_ADMINS;
}

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
  leaderId?: string | null;
};

/** Suy ra vai trò nhóm — ưu tiên leaderId, chỉ fallback creatorId cho dữ liệu cũ. */
export function resolveGroupMemberRole(args: {
  userId?: string;
  members?: RoleLookupMember[];
  conversationLeaderId?: string | null;
  conversationCreatorId?: string | null;
}): GroupMemberRole | undefined {
  const uid = String(args.userId ?? '').trim();
  if (!uid) return undefined;
  const hit = args.members?.find((m) => String(m.userId ?? '').trim() === uid);
  const fromList = String(hit?.role ?? '')
    .trim()
    .toLowerCase();
  if (fromList === 'owner' || fromList === 'admin' || fromList === 'member') return fromList;
  const leaderId = String(args.conversationLeaderId ?? '').trim();
  if (leaderId && leaderId === uid) return 'owner';
  const ownerFromMembers = String(
    args.members?.find(
      (m) =>
        String(m.role ?? '')
          .trim()
          .toLowerCase() === 'owner',
    )?.userId ?? '',
  ).trim();
  if (ownerFromMembers && ownerFromMembers === uid) return 'owner';
  const creator = String(args.conversationCreatorId ?? '').trim();
  if (!leaderId && !ownerFromMembers && creator && creator === uid) return 'owner';
  return undefined;
}

export type GroupMembersNormalizeMeta = {
  leaderId?: string | null;
  creatorId?: string | null;
};

type NormalizableMemberRow = { userId?: string; role?: string | null };

/** Dedupe theo userId + chuẩn hóa role theo trưởng nhóm (leaderId). */
export function normalizeGroupMembersList<T extends NormalizableMemberRow>(
  members: T[] | undefined | null,
  meta?: GroupMembersNormalizeMeta,
): Array<T & { userId: string; role: GroupMemberRole }> {
  const byUserId = new Map<string, T>();
  for (const row of members ?? []) {
    const userId = String(row.userId ?? '').trim();
    if (!userId) continue;
    byUserId.set(userId, row);
  }

  const deduped = Array.from(byUserId.values());
  const lookup: RoleLookupMember[] = deduped.map((m) => ({
    userId: String(m.userId ?? '').trim(),
    role: m.role ?? undefined,
  }));

  return deduped.map((row) => {
    const userId = String(row.userId ?? '').trim();
    const fromRow = String(row.role ?? '')
      .trim()
      .toLowerCase();
    const fromRowRole: GroupMemberRole | undefined =
      fromRow === 'owner' || fromRow === 'admin' || fromRow === 'member' ? fromRow : undefined;
    const role =
      resolveGroupMemberRole({
        userId,
        members: lookup,
        conversationLeaderId: meta?.leaderId,
        conversationCreatorId: meta?.creatorId,
      }) ??
      fromRowRole ??
      'member';
    const safeRole: GroupMemberRole =
      role === 'owner' || role === 'admin' || role === 'member' ? role : 'member';
    return { ...row, userId, role: safeRole };
  });
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
      conversationLeaderId: args.conversation?.leaderId,
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
