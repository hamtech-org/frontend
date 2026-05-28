import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Users, X } from 'lucide-react';

import { ZaloStyleAvatar } from '@/components/chat/ZaloStyleAvatar';
import type { GroupJoinLinkModalData } from '@/contexts/GroupJoinLinkModalContext';
import { useShareGroupJoinLink } from '@/hooks/useShareGroupJoinLink';
import { useGetFriendsQuery } from '@/store/api/contactApi';
import { useGetConversationsQuery } from '@/store/api/chatApi';
import type { IConversation } from '@/types/chat.types';
import { resolveGroupAvatarDisplayUrl } from '@/utils/groupAvatarUrl';

type ShareTab = 'all' | 'groups' | 'friends';

type ShareGroupJoinLinkPickerModalProps = {
  open: boolean;
  onClose: () => void;
  link: GroupJoinLinkModalData | null;
  /** Không gửi lại vào chính nhóm nguồn (nếu có). */
  excludeConversationId?: string | null;
};

type FriendRow = {
  userId: string;
  displayName: string;
  avatar: string | null;
};

function sortConvsByRecent(convs: IConversation[]) {
  return [...convs].sort((a, b) => {
    const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return tb - ta;
  });
}

/** Chỉ lấy người đã kết bạn (accepted / friend) từ GET /contacts/friends. */
function parseAcceptedFriends(data: unknown): FriendRow[] {
  if (!data) return [];
  let raw: unknown[] = [];
  if (Array.isArray(data)) {
    raw = data;
  } else if (typeof data === 'object') {
    const asObj = data as { friends?: unknown };
    if (Array.isArray(asObj.friends)) raw = asObj.friends;
  }
  return raw
    .map((item) => {
      const f = item as {
        userId?: string;
        friendId?: string;
        displayName?: string;
        avatar?: string | null;
        contactStatus?: string;
        status?: string;
      };
      const userId = f.userId ?? f.friendId;
      if (!userId) return null;
      if (f.contactStatus && f.contactStatus !== 'accepted' && f.contactStatus !== 'friend') {
        return null;
      }
      return {
        userId,
        displayName: f.displayName ?? userId,
        avatar: f.avatar ?? null,
      };
    })
    .filter((row): row is FriendRow => row !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));
}

export function ShareGroupJoinLinkPickerModal({
  open,
  onClose,
  link,
  excludeConversationId,
}: ShareGroupJoinLinkPickerModalProps) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<ShareTab>('all');
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(() => new Set());
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);

  const { data: conversationsRes, isLoading: loadingConvs } = useGetConversationsQuery(undefined, {
    skip: !open,
  });
  const { data: friendsRes, isLoading: loadingFriends } = useGetFriendsQuery(undefined, {
    skip: !open,
  });
  const { shareToMany } = useShareGroupJoinLink();

  const conversations = useMemo(
    () => (conversationsRes?.data ?? []).filter((c) => c.conversationId !== excludeConversationId),
    [conversationsRes?.data, excludeConversationId],
  );

  const friends = useMemo(() => parseAcceptedFriends(friendsRes?.data), [friendsRes?.data]);

  const directConvByFriendId = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of conversations) {
      if (c.type === 'direct' && c.otherUserId) {
        map.set(c.otherUserId, c.conversationId);
      }
    }
    return map;
  }, [conversations]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setTab('all');
    setSelectedConvIds(new Set());
    setSelectedFriendIds(new Set());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  const groupConvs = useMemo(
    () => sortConvsByRecent(conversations.filter((c) => c.type === 'group')),
    [conversations],
  );

  const hasSearch = q.trim().length > 0;

  const filteredGroups = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groupConvs;
    return groupConvs.filter((c) => (c.name ?? '').toLowerCase().includes(s));
  }, [groupConvs, q]);

  const filteredFriends = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return friends;
    return friends.filter((f) => f.displayName.toLowerCase().includes(s));
  }, [friends, q]);

  const toggleConv = useCallback((id: string) => {
    setSelectedConvIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleFriend = useCallback((userId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const selectedCount = selectedConvIds.size + selectedFriendIds.size;

  const renderGroupRow = (c: IConversation) => {
    const checked = selectedConvIds.has(c.conversationId);
    const avatarSrc = resolveGroupAvatarDisplayUrl(c.avatar, {
      conversationId: c.conversationId,
      avatarVersion: String(c.memberCount ?? ''),
    });
    return (
      <li key={c.conversationId}>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.04]">
          <input
            type="checkbox"
            checked={checked}
            disabled={submitting}
            onChange={() => toggleConv(c.conversationId)}
            className="h-4 w-4 shrink-0 accent-[#0068ff]"
          />
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              className="size-10 rounded-full object-cover border border-slate-100"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-sky-100">
              <Users className="h-4 w-4 text-sky-600" />
            </div>
          )}
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
            {c.name ?? 'Hội thoại'}
          </span>
        </label>
      </li>
    );
  };

  const renderFriendRow = (f: FriendRow) => {
    const checked = selectedFriendIds.has(f.userId);
    const hasChat = directConvByFriendId.has(f.userId);
    return (
      <li key={f.userId}>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.04]">
          <input
            type="checkbox"
            checked={checked}
            disabled={submitting}
            onChange={() => toggleFriend(f.userId)}
            className="h-4 w-4 shrink-0 accent-[#0068ff]"
          />
          <ZaloStyleAvatar
            userId={f.userId}
            displayName={f.displayName}
            avatarUrl={f.avatar}
            className="size-10 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
              {f.displayName}
            </p>
            <p className="text-[12px] text-slate-500">{hasChat ? 'Chat 1-1' : 'Sẽ mở chat mới'}</p>
          </div>
        </label>
      </li>
    );
  };

  const handleSend = async () => {
    if (!link || selectedCount === 0) return;
    setSubmitting(true);
    try {
      const convFromFriends: string[] = [];
      const friendOnlyIds: string[] = [];

      for (const fid of selectedFriendIds) {
        const existing = directConvByFriendId.get(fid);
        if (existing) convFromFriends.push(existing);
        else friendOnlyIds.push(fid);
      }

      const conversationIds = [...new Set([...selectedConvIds, ...convFromFriends])];
      await shareToMany({ conversationIds, friendIds: friendOnlyIds }, link);
      onClose();
    } catch {
      /* toast trong hook */
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || typeof document === 'undefined' || !link) return null;

  const loading = loadingConvs || loadingFriends;

  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Đóng"
        disabled={submitting}
        onClick={() => {
          if (!submitting) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-join-link-title"
        className="relative flex max-h-[min(92vh,640px)] w-full max-w-[440px] flex-col rounded-t-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2
            id="share-join-link-title"
            className="text-[17px] font-bold text-slate-900 dark:text-slate-50"
          >
            Chia sẻ link nhóm
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
          <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
            Gửi link mời nhóm{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {link.groupName}
            </span>
          </p>
        </div>

        <div className="shrink-0 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm bạn bè hoặc nhóm..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0068ff] focus:ring-1 focus:ring-[#0068ff]/30 dark:border-slate-600 dark:bg-zinc-800/80"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1 border-b border-slate-100 px-2 pt-1 dark:border-slate-800">
          {(
            [
              { id: 'all' as const, label: 'Tất cả' },
              { id: 'groups' as const, label: 'Nhóm chat' },
              { id: 'friends' as const, label: 'Bạn bè' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={submitting}
              onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 px-2.5 py-2 text-[13px] font-semibold transition-colors ${
                tab === t.id
                  ? 'border-[#0068ff] text-[#0068ff]'
                  : 'border-transparent text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-[200px] flex-1 overflow-y-auto px-1 py-1 custom-scrollbar">
          {loading ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">Đang tải…</p>
          ) : hasSearch || tab === 'all' ? (
            filteredGroups.length === 0 && filteredFriends.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500">
                {hasSearch ? 'Không tìm thấy kết quả.' : 'Chưa có nhóm hoặc bạn bè để chia sẻ.'}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredGroups.length > 0 ? (
                  <section>
                    <p className="px-2 pb-1 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
                      Nhóm chat
                    </p>
                    <ul className="space-y-0.5">{filteredGroups.map(renderGroupRow)}</ul>
                  </section>
                ) : null}
                {filteredFriends.length > 0 ? (
                  <section>
                    <p className="px-2 pb-1 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
                      Bạn bè
                    </p>
                    <ul className="space-y-0.5">{filteredFriends.map(renderFriendRow)}</ul>
                  </section>
                ) : null}
              </div>
            )
          ) : tab === 'friends' ? (
            filteredFriends.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500">
                Chưa có bạn bè để chia sẻ.
              </p>
            ) : (
              <ul className="space-y-0.5">{filteredFriends.map(renderFriendRow)}</ul>
            )
          ) : filteredGroups.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              Không có nhóm chat để chia sẻ.
            </p>
          ) : (
            <ul className="space-y-0.5">{filteredGroups.map(renderGroupRow)}</ul>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-3 py-3 dark:border-slate-700">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-full px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting || selectedCount === 0}
            onClick={() => void handleSend()}
            className="rounded-full bg-[#0068ff] px-6 py-2 text-sm font-semibold text-white disabled:opacity-45"
          >
            {submitting ? 'Đang gửi…' : `Gửi${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
