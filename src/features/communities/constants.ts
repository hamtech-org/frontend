import { Newspaper, Compass, Users, MailOpen } from 'lucide-react';
import type { CommunityCategory, CommunityMemberRole } from '@/types/community.types';

export type CommunityBrowseMode = 'feed' | 'discover' | 'joined' | 'invites';

export const CATEGORY_LABEL: Record<CommunityCategory, string> = {
  general: 'Chung',
  technology: 'Công nghệ',
  sports: 'Thể thao',
  music: 'Nhạc',
  education: 'Giáo dục',
  gaming: 'Gaming',
  lifestyle: 'Đời sống',
};

export const ROLE_LABEL: Record<CommunityMemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Mod',
  member: 'Member',
};

export const EDITABLE_ROLES: CommunityMemberRole[] = ['admin', 'moderator', 'member'];

export const NAV_ITEMS: Array<{
  key: CommunityBrowseMode;
  label: string;
  icon: typeof Users;
}> = [
  { key: 'feed', label: 'Bảng feed của bạn', icon: Newspaper },
  { key: 'discover', label: 'Khám phá', icon: Compass },
  { key: 'joined', label: 'Nhóm của bạn', icon: Users },
  { key: 'invites', label: 'Lời mời', icon: MailOpen },
];
