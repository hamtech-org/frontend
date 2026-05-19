/** Payload socket `group:updated` (đồng bộ backend group.service.updateGroup). */
export type GroupUpdatedPayload = {
  conversationId?: string;
  groupId?: string;
  name?: string;
  avatar?: string;
  actorId?: string;
  actorName?: string;
  changed?: { name?: boolean; avatar?: boolean };
};

/** Một dòng thông báo ngắn: xưng «Bạn» nếu chính người cập nhật. */
export function groupUpdateNoticeText(
  payload: GroupUpdatedPayload,
  currentUserId?: string,
): string | null {
  const name = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : '';
  const hasChangedShape = payload.changed != null && typeof payload.changed === 'object';
  const nameChanged = hasChangedShape ? payload.changed?.name === true : Boolean(name);
  const avatarChanged = hasChangedShape
    ? payload.changed?.avatar === true
    : Boolean(!name && payload.avatar);
  if (!nameChanged && !avatarChanged) return null;

  const actorId = String(payload.actorId ?? '').trim();
  const actorName = String(payload.actorName ?? '').trim();
  const who = currentUserId && actorId && actorId === currentUserId ? 'Bạn' : actorName || 'Ai đó';

  if (nameChanged && avatarChanged && name) {
    return `${who} đã đổi tên nhóm thành "${name}" và cập nhật ảnh đại diện nhóm`;
  }
  if (nameChanged && name) return `${who} đã đổi tên nhóm thành "${name}"`;
  if (avatarChanged) return `${who} đã cập nhật ảnh đại diện nhóm`;
  return null;
}
