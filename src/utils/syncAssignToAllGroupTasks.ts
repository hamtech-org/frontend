import type { GroupMember, GroupTask } from '@/types/chat.group.types';

/** Chỉ task bật rõ «giao cả nhóm» — không đoán từ assignees rỗng (tránh ghi đè task giao 2–3 người). */
export function isAssignToWholeGroupTask(task: GroupTask): boolean {
  return Boolean(task.assignToAll) || Boolean(task.broadcast);
}

/** Gắn assignees = toàn bộ member hiện tại cho task «cả nhóm» (kể cả task tạo từ đầu). */
export function syncAssignToAllGroupTasksWithMembers(
  tasks: GroupTask[],
  members: Pick<GroupMember, 'userId'>[],
): GroupTask[] {
  if (tasks.length === 0 || members.length === 0) return tasks;

  const memberIds = members.map((m) => String(m.userId));
  const memberKey = [...memberIds].sort().join('\0');
  const memberIdSet = new Set(memberIds);

  let changed = false;
  const next = tasks.map((t) => {
    if (!isAssignToWholeGroupTask(t)) return t;

    const prevAssignees = (Array.isArray(t.assignees) ? t.assignees : []).map(String);
    const prevParticipants = (Array.isArray(t.participants) ? t.participants : []).map(String);
    const nextParticipants = prevParticipants.filter((id) => memberIdSet.has(id));
    const assigneesMatch = [...prevAssignees].sort().join('\0') === memberKey;
    const participantsMatch = nextParticipants.length === prevParticipants.length;

    if (assigneesMatch && participantsMatch) return t;

    changed = true;
    return {
      ...t,
      assignToAll: true,
      broadcast: t.broadcast,
      assignees: memberIds,
      participants: nextParticipants,
    };
  });

  return changed ? next : tasks;
}

function normalizePersonName(value: string): string {
  return value.trim().toLowerCase();
}

/** Một người được giao — «Bạn» nếu là user đang xem. */
export function labelTaskAssigneeId(
  userId: string,
  currentUserId: string | undefined,
  nameById: Map<string, string>,
): string {
  const id = String(userId).trim();
  if (currentUserId && id && id === String(currentUserId)) return 'Bạn';
  return nameById.get(id) ?? id;
}

function formatAssigneeIdList(
  ids: string[],
  currentUserId: string | undefined,
  nameById: Map<string, string>,
): string {
  const labels = ids.map((id) => labelTaskAssigneeId(id, currentUserId, nameById));
  if (labels.length <= 3) return labels.join(', ');
  const more = labels.length - 3;
  return `${labels.slice(0, 3).join(', ')} và ${more} người khác`;
}

/** Nhãn fallback từ server (tên cố định) → thay tên viewer bằng «Bạn». */
function applyViewerToAssigneeFallbackLabel(
  label: string,
  currentUserId: string | undefined,
  viewerDisplayName: string | undefined,
  nameById: Map<string, string>,
): string {
  if (!currentUserId) return label;
  const viewerName = (
    viewerDisplayName?.trim() ||
    nameById.get(String(currentUserId)) ||
    ''
  ).trim();
  if (!viewerName) return label;
  const vn = normalizePersonName(viewerName);
  if (normalizePersonName(label) === vn) return 'Bạn';

  return label
    .split(',')
    .map((part) => {
      const p = part.trim();
      if (normalizePersonName(p) === vn) return 'Bạn';
      const tail = /^(.+?)\s+và\s+(\d+)\s+người\s+khác$/i.exec(p);
      if (tail && normalizePersonName(tail[1]) === vn) {
        return `Bạn và ${tail[2]} người khác`;
      }
      return p;
    })
    .join(', ');
}

/** Tên người trong subtask / chi tiết task. */
export function labelTaskPerson(
  userId: string | undefined,
  name: string | undefined,
  currentUserId: string | undefined,
  nameById?: Map<string, string>,
): string {
  const id = String(userId ?? '').trim();
  if (currentUserId && id && id === String(currentUserId)) return 'Bạn';
  const n = String(name ?? '').trim();
  if (n) return n;
  if (id && nameById) return nameById.get(id) ?? id;
  return n || id || 'Thành viên';
}

/** Nhãn «Giao cho» trên thẻ chat — ưu tiên assignees thực tế, xưng «Bạn» theo người xem. */
export function resolveTaskAssigneeDisplayLabel(opts: {
  assignToAll?: boolean;
  broadcast?: boolean;
  assigneeIds: string[];
  memberCount: number;
  nameById: Map<string, string>;
  fallbackLabel?: string;
  currentUserId?: string;
  viewerDisplayName?: string;
}): string {
  const ids = opts.assigneeIds.map(String).filter(Boolean);
  const memberCount = Math.max(0, opts.memberCount);
  const isExplicitAll = Boolean(opts.assignToAll) || Boolean(opts.broadcast);
  const isPartialAssignees = ids.length > 0 && memberCount > 0 && ids.length < memberCount;

  if (isExplicitAll && !isPartialAssignees) {
    return 'Cả nhóm';
  }
  if (ids.length > 0) {
    return formatAssigneeIdList(ids, opts.currentUserId, opts.nameById);
  }
  const fb = String(opts.fallbackLabel ?? '').trim();
  if (!fb) return 'Cả nhóm';
  return applyViewerToAssigneeFallbackLabel(
    fb,
    opts.currentUserId,
    opts.viewerDisplayName,
    opts.nameById,
  );
}
