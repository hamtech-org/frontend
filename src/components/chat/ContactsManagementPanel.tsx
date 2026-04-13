import { UserPlus, Users } from 'lucide-react';
import { useGetFriendsQuery, useGetGroupsQuery } from '@/store/api/contactApi';

export type ContactsTabId = 'friends' | 'groups' | 'friendRequests' | 'groupInvites';

type ContactsManagementPanelProps = {
  contactsTab: ContactsTabId;
  onContactsTabChange: (tab: ContactsTabId) => void;
};

function rowLabel(row: unknown): string {
  if (row && typeof row === 'object') {
    const o = row as Record<string, unknown>;
    return String(o.displayName ?? o.name ?? o.fullName ?? o.title ?? o.userId ?? o.id ?? '—');
  }
  return '—';
}

function rowAvatar(row: unknown): string | undefined {
  if (row && typeof row === 'object') {
    const o = row as Record<string, unknown>;
    const a = o.avatar ?? o.avatarUrl ?? o.photoUrl;
    return typeof a === 'string' ? a : undefined;
  }
  return undefined;
}

function rowSubtitleFriends(row: unknown): string {
  if (row && typeof row === 'object') {
    const o = row as Record<string, unknown>;
    const s = o.status ?? o.presence;
    if (s === 'online' || s === 'ONLINE') return 'Đang hoạt động';
  }
  return 'Ngoại tuyến';
}

function rowMembersCount(row: unknown): string {
  if (row && typeof row === 'object') {
    const o = row as Record<string, unknown>;
    const n = o.memberCount ?? o.members ?? o.membersCount;
    if (typeof n === 'number') return `${n} thành viên`;
    if (typeof n === 'string' && n) return `${n} thành viên`;
  }
  return 'Nhóm';
}

export function ContactsManagementPanel({ contactsTab, onContactsTabChange }: ContactsManagementPanelProps) {
  const { data: friendsRes, isLoading: friendsLoading } = useGetFriendsQuery();
  const { data: groupsRes, isLoading: groupsLoading } = useGetGroupsQuery();

  const friends = (friendsRes?.data ?? []) as unknown[];
  const groups = (groupsRes?.data ?? []) as unknown[];

  const tabs: {
    id: ContactsTabId;
    label: string;
    icon: typeof Users;
    count: number;
  }[] = [
    { id: 'friends', label: 'Danh sách bạn bè', icon: Users, count: friends.length },
    { id: 'groups', label: 'Danh sách nhóm', icon: Users, count: groups.length },
    { id: 'friendRequests', label: 'Lời mời kết bạn', icon: UserPlus, count: 0 },
    { id: 'groupInvites', label: 'Lời mời vào nhóm', icon: UserPlus, count: 0 },
  ];

  return (
    <div className="flex-1 flex min-h-0 bg-white dark:bg-[#1a1a1a]">
      {/* Sidebar Tabs - Vertical */}
      <div className="flex w-full flex-col w-40 border-r border-black/5 dark:border-white/5 shrink-0 overflow-y-auto custom-scrollbar">
        <div className="px-2 pt-3 pb-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onContactsTabChange(tab.id)}
              className={`px-2 py-2 rounded-lg var(--text-sm) font-semibold transition-all flex items-center gap-1.5 w-full justify-between ${
                contactsTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <tab.icon className="w-3 h-3 shrink-0" />
                <span className="text-left">{tab.label}</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                contactsTab === tab.id ? 'bg-white/20' : 'bg-black/20'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area - Full Width */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

      {contactsTab === 'friends' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 px-3 py-3 min-h-0">
          {!friendsLoading &&
            friends.map((friend, idx) => {
              const title = rowLabel(friend);
              const avatar = rowAvatar(friend);
              const key = `${title}-${String(idx)}`;
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="relative shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-600">
                        {title.trim().slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-black dark:text-white truncate">{title}</p>
                    <p className="text-[10px] text-muted-foreground">{rowSubtitleFriends(friend)}</p>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {contactsTab === 'groups' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 px-3 py-3 min-h-0">
          {!groupsLoading &&
            groups.map((group, idx) => {
              const title = rowLabel(group);
              const avatar = rowAvatar(group);
              const key = `${title}-${String(idx)}`;
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-black dark:text-white truncate">{title}</p>
                    <p className="text-[10px] text-muted-foreground">{rowMembersCount(group)}</p>
                  </div>
                </div>
              );
            })}
        </div>
      )}
      </div>
    </div>
  );
}
