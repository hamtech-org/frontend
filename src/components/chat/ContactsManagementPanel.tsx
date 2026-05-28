import { Check, Clock, UserPlus, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useGetFriendsQuery } from '@/store/api/contactApi';
import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useGetPendingRequestsQuery,
  useGetSuggestedFriendsQuery,
  useRejectFriendRequestMutation,
  useSendFriendRequestMutation,
} from '@/store/api/userApi';
import { socketService } from '@/services/socket';
import type { IConversation } from '@/types/chat.types';

export type ContactsTabId = 'friends' | 'groups' | 'friendRequests';
type PendingFriendsTabId = 'received' | 'sent' | 'suggestions';

type ContactsManagementPanelProps = {
  contactsTab: ContactsTabId;
  onContactsTabChange: (tab: ContactsTabId) => void;
  groupConversations?: IConversation[];
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

function rowUserId(row: unknown): string {
  if (row && typeof row === 'object') {
    const o = row as Record<string, unknown>;
    return String(o.userId ?? o.id ?? '');
  }
  return '';
}

export function ContactsManagementPanel({
  contactsTab,
  onContactsTabChange,
  groupConversations = [],
}: ContactsManagementPanelProps) {
  const [pendingTab, setPendingTab] = useState<PendingFriendsTabId>('received');
  const {
    data: friendsRes,
    isLoading: friendsLoading,
    refetch: refetchFriends,
  } = useGetFriendsQuery();
  const {
    data: pendingRes,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = useGetPendingRequestsQuery();
  const {
    data: suggestedRes,
    isLoading: suggestedLoading,
    refetch: refetchSuggested,
  } = useGetSuggestedFriendsQuery({ limit: 10 });
  const [acceptFriendRequest] = useAcceptFriendRequestMutation();
  const [rejectFriendRequest] = useRejectFriendRequestMutation();
  const [cancelFriendRequest] = useCancelFriendRequestMutation();
  const [sendFriendRequest] = useSendFriendRequestMutation();

  const friends = (friendsRes?.data ?? []) as unknown[];
  const receivedRequests = (pendingRes?.data?.received ?? []) as unknown[];
  const sentRequests = (pendingRes?.data?.sent ?? []) as unknown[];
  const suggestedFriends = (suggestedRes?.data ?? []) as unknown[];
  const totalPendingFriendRequests =
    receivedRequests.length + sentRequests.length + suggestedFriends.length;
  const pendingTabs: {
    id: PendingFriendsTabId;
    label: string;
    count: number;
  }[] = [
    { id: 'received', label: 'Nhận được', count: receivedRequests.length },
    { id: 'sent', label: 'Đã gửi', count: sentRequests.length },
    { id: 'suggestions', label: 'Gợi ý', count: suggestedFriends.length },
  ];

  const refreshFriendRequests = () => {
    refetchFriends();
    refetchPending();
    refetchSuggested();
  };

  const handleAcceptRequest = async (row: unknown) => {
    const senderId = rowUserId(row);
    if (!senderId) return;
    await acceptFriendRequest({ senderId }).unwrap();
    refreshFriendRequests();
  };

  const handleRejectRequest = async (row: unknown) => {
    const senderId = rowUserId(row);
    if (!senderId) return;
    await rejectFriendRequest({ senderId }).unwrap();
    refreshFriendRequests();
  };

  const handleCancelRequest = async (row: unknown) => {
    const friendId = rowUserId(row);
    if (!friendId) return;
    await cancelFriendRequest({ friendId }).unwrap();
    refreshFriendRequests();
  };

  const handleSendRequest = async (row: unknown) => {
    const friendId = rowUserId(row);
    if (!friendId) return;
    await sendFriendRequest({ friendId }).unwrap();
    refreshFriendRequests();
  };

  useEffect(() => {
    const handleFriendAdded = () => {
      refetchFriends();
    };

    const handleFriendRemoved = () => {
      refetchFriends();
    };

    const handleNewRequest = () => {
      refetchPending();
      refetchSuggested();
    };

    const handleRequestAccepted = () => {
      refetchFriends();
      refetchPending();
    };

    const handleRequestRejected = () => {
      refetchPending();
    };

    socketService.on('friend:added', handleFriendAdded);
    socketService.on('friend:removed', handleFriendRemoved);
    socketService.on('friendRequest:new', handleNewRequest);
    socketService.on('friendRequest:accepted', handleRequestAccepted);
    socketService.on('friendRequest:rejected', handleRequestRejected);

    return () => {
      socketService.off('friend:added', handleFriendAdded);
      socketService.off('friend:removed', handleFriendRemoved);
      socketService.off('friendRequest:new', handleNewRequest);
      socketService.off('friendRequest:accepted', handleRequestAccepted);
      socketService.off('friendRequest:rejected', handleRequestRejected);
    };
  }, [refetchFriends, refetchPending, refetchSuggested]);

  const tabs: {
    id: ContactsTabId;
    label: string;
    icon: typeof Users;
    count: number;
  }[] = [
    { id: 'friends', label: 'Danh sách bạn bè', icon: Users, count: friends.length },
    { id: 'groups', label: 'Danh sách nhóm', icon: Users, count: groupConversations.length },
    {
      id: 'friendRequests',
      label: 'Lời mời kết bạn',
      icon: UserPlus,
      count: totalPendingFriendRequests,
    },
  ];

  return (
    <div className="flex-1 flex min-h-0 bg-white dark:bg-[#1a1a1a]">
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
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                  contactsTab === tab.id ? 'bg-white/20' : 'bg-black/20'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {contactsTab === 'friends' && (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto custom-scrollbar space-y-1 px-3 py-3">
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
                      <img
                        src={avatar}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-600">
                        {title.trim().slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-black dark:text-white truncate">
                      {title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {rowSubtitleFriends(friend)}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {contactsTab === 'friendRequests' && (
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="shrink-0 border-b border-black/5 px-3 pt-3 dark:border-white/5">
            <div className="flex gap-1 overflow-x-auto">
              {pendingTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPendingTab(tab.id)}
                  className={`shrink-0 border-b-2 px-3 py-2 text-[12px] font-semibold transition-colors ${
                    pendingTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 py-3">
            {pendingTab === 'received' &&
              (pendingLoading ? (
                <p className="py-8 text-center text-[12px] text-muted-foreground">Đang tải...</p>
              ) : (
                <FriendRequestSection
                  title="Lời mời đã nhận"
                  emptyText="Chưa có lời mời mới."
                  rows={receivedRequests}
                  renderActions={(row) => (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleAcceptRequest(row)}
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2 text-[10px] font-bold text-white hover:bg-blue-700"
                      >
                        <Check className="w-3 h-3" />
                        Chấp nhận
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRejectRequest(row)}
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-black/5 px-2 text-[10px] font-bold text-muted-foreground hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
                      >
                        <X className="w-3 h-3" />
                        Từ chối
                      </button>
                    </div>
                  )}
                />
              ))}

            {pendingTab === 'sent' &&
              (pendingLoading ? (
                <p className="py-8 text-center text-[12px] text-muted-foreground">Đang tải...</p>
              ) : (
                <FriendRequestSection
                  title="Lời mời đã gửi"
                  emptyText="Chưa gửi lời mời nào."
                  rows={sentRequests}
                  subtitle="Đang chờ phản hồi"
                  renderActions={(row) => (
                    <button
                      type="button"
                      onClick={() => void handleCancelRequest(row)}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-black/5 px-2 text-[10px] font-bold text-muted-foreground hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
                    >
                      <X className="w-3 h-3" />
                      Hủy
                    </button>
                  )}
                />
              ))}

            {pendingTab === 'suggestions' &&
              (suggestedLoading ? (
                <p className="py-8 text-center text-[12px] text-muted-foreground">Đang tải...</p>
              ) : (
                <FriendRequestSection
                  title="Gợi ý kết bạn"
                  emptyText="Chưa có gợi ý phù hợp."
                  rows={suggestedFriends}
                  renderActions={(row) => (
                    <button
                      type="button"
                      onClick={() => void handleSendRequest(row)}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2 text-[10px] font-bold text-white hover:bg-blue-700"
                    >
                      <UserPlus className="w-3 h-3" />
                      Thêm
                    </button>
                  )}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FriendRequestSection({
  title,
  emptyText,
  rows,
  renderActions,
  subtitle,
}: {
  title: string;
  emptyText: string;
  rows: unknown[];
  renderActions: (row: unknown) => ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {title} ({rows.length})
      </h3>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row, idx) => {
            const title = rowLabel(row);
            const avatar = rowAvatar(row);
            const key = rowUserId(row) || `${title}-${String(idx)}`;
            return (
              <div
                key={key}
                className="flex items-center gap-2 rounded-lg border border-black/5 bg-black/[0.02] p-2 dark:border-white/5 dark:bg-white/[0.03]"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-600">
                    {title.trim().slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-black dark:text-white">
                    {title}
                  </p>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {subtitle ? (
                      <>
                        <Clock className="w-3 h-3" />
                        {subtitle}
                      </>
                    ) : (
                      rowSubtitleFriends(row)
                    )}
                  </p>
                </div>
                {renderActions(row)}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg bg-black/[0.02] px-3 py-4 text-center text-[11px] text-muted-foreground dark:bg-white/[0.03]">
          {emptyText}
        </p>
      )}
    </section>
  );
}
