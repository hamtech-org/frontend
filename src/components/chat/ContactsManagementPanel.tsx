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
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1a1a1a]">
      <div className="flex px-4 pt-3 gap-2 shrink-0 border-b border-black/5 dark:border-white/5 pb-0 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onContactsTabChange(tab.id)}
            className={`px-3 py-2.5 rounded-t-lg text-[12px] font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
              contactsTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            <span className="bg-black/20 px-1.5 py-0.5 rounded-md text-[10px] font-bold">{tab.count}</span>
          </button>
        ))}
      </div>

      {contactsTab === 'friends' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 px-3 py-3 min-h-0">
          {friendsLoading && (
            <p className="text-center text-sm text-muted-foreground py-8">Đang tải...</p>
          )}
          {!friendsLoading && friends.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Chưa có bạn bè hoặc API chưa trả dữ liệu.</p>
          )}
          {!friendsLoading &&
            friends.map((friend, idx) => {
              const title = rowLabel(friend);
              const avatar = rowAvatar(friend);
              const key = `${title}-${String(idx)}`;
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="relative shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="" className="w-11 h-11 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-600">
                        {title.trim().slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-black dark:text-white truncate">{title}</p>
                    <p className="text-[11px] text-muted-foreground">{rowSubtitleFriends(friend)}</p>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {contactsTab === 'groups' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 px-3 py-3 min-h-0">
          {groupsLoading && (
            <p className="text-center text-sm text-muted-foreground py-8">Đang tải...</p>
          )}
          {!groupsLoading && groups.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Chưa có nhóm hoặc API chưa trả dữ liệu.</p>
          )}
          {!groupsLoading &&
            groups.map((group, idx) => {
              const title = rowLabel(group);
              const avatar = rowAvatar(group);
              const key = `${title}-${String(idx)}`;
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-black dark:text-white truncate">{title}</p>
                    <p className="text-[11px] text-muted-foreground">{rowMembersCount(group)}</p>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {(contactsTab === 'friendRequests' || contactsTab === 'groupInvites') && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center min-h-0">
          <p className="text-sm font-medium text-muted-foreground">Chưa có dữ liệu</p>
          <p className="text-[12px] text-muted-foreground/80 mt-2">
            API lời mời kết bạn / mời nhóm chưa được nối. Tab này giữ layout theo bản thiết kế.
          </p>
        </div>
      )}
    </div>
  );
}
