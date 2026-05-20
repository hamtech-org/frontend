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

/** Nhãn «Giao cho» trên thẻ chat — ưu tiên assignees thực tế, không chỉ cờ/message cũ. */
export function resolveTaskAssigneeDisplayLabel(opts: {
  assignToAll?: boolean;
  broadcast?: boolean;
  assigneeIds: string[];
  memberCount: number;
  nameById: Map<string, string>;
  fallbackLabel?: string;
}): string {
  const ids = opts.assigneeIds.map(String).filter(Boolean);
  const memberCount = Math.max(0, opts.memberCount);
  const isExplicitAll = Boolean(opts.assignToAll) || Boolean(opts.broadcast);
  const isPartialAssignees = ids.length > 0 && memberCount > 0 && ids.length < memberCount;

  if (isExplicitAll && !isPartialAssignees) {
    return 'Cả nhóm';
  }
  if (ids.length > 0) {
    return ids.map((id) => opts.nameById.get(id) ?? id).join(', ');
  }
  const fb = String(opts.fallbackLabel ?? '').trim();
  return fb || 'Cả nhóm';
}
