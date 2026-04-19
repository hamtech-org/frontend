import type { GroupMember } from '@/types/chat.group.types';

export type TaskModalMember = {
  id: string;
  name: string;
  avatar: string;
  role: GroupMember['role'];
};

export function toTaskModalMembers(members: GroupMember[]): TaskModalMember[] {
  return members.map((member) => ({
    id: member.userId,
    name: member.name ?? member.userId,
    avatar: member.avatar ?? 'https://via.placeholder.com/40',
    role: member.role,
  }));
}
