import { AnimatePresence, motion } from 'motion/react';
import { MoreHorizontal, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '@/services/api';
import { ConfirmModal } from '@/components/chat/ConfirmModal';
import { useEffect, useMemo, useState } from 'react';
import type { GroupMember, GroupRequest } from '@/types/chat.group.types';
import {
  countGroupAdmins,
  isGroupAdminSlotsFull,
  MAX_GROUP_ADMINS,
  normalizeGroupMembersList,
} from '@/utils/groupConversationPermissions';

type MemberTab = 'list' | 'pending';
type MemberUiVariant = 'modal' | 'inline';

type MemberManagementModalProps = {
  open: boolean;
  onClose: () => void;
  memberTab: MemberTab;
  onMemberTabChange: (tab: MemberTab) => void;
  members: GroupMember[];
  requests: GroupRequest[];
  currentUserId?: string;
  onApprove?: (userId: string) => void | Promise<void>;
  onReject?: (userId: string) => void | Promise<void>;
  onKick?: (userId: string) => void | Promise<void>;
  /** Owner-only: hạ phó nhóm (admin) xuống member. */
  onDemoteAdminToMember?: (userId: string) => void | Promise<void>;
  /** Owner-only: bổ nhiệm thành viên thường làm phó nhóm. */
  onPromoteMemberToAdmin?: (userId: string) => void | Promise<void>;
  /** Từ màn «Trưởng & phó» → mở danh sách thành viên để bổ nhiệm. */
  onBrowseMembersForPromote?: () => void;
  busy?: {
    approving?: boolean;
    rejecting?: boolean;
    removing?: boolean;
    changingRole?: boolean;
  };
  variant?: MemberUiVariant;
  /** Quyền duyệt/từ chối yêu cầu vào nhóm (owner/admin). */
  canModerate?: boolean;
  /** Quyền kick thành viên (chỉ owner theo nghiệp vụ). */
  canKick?: boolean;
  onAddMembersClick?: () => void;
  groupId?: string;
  conversationLeaderId?: string | null;
  conversationCreatorId?: string | null;
  onRefreshMembers?: (opts?: { force?: boolean }) => Promise<GroupMember[] | void>;
  /** Chỉ hiển thị trưởng & phó nhóm (từ Quản lý nhóm). */
  leadersOnly?: boolean;
};

export function MemberManagementModal({
  open,
  onClose,
  memberTab,
  onMemberTabChange,
  members,
  requests,
  currentUserId,
  onApprove,
  onReject,
  onKick,
  onDemoteAdminToMember,
  onPromoteMemberToAdmin,
  onBrowseMembersForPromote,
  busy,
  variant = 'modal',
  canModerate = false,
  canKick = false,
  onAddMembersClick: _onAddMembersClick,
  groupId,
  conversationLeaderId,
  conversationCreatorId,
  onRefreshMembers: _onRefreshMembers,
  leadersOnly = false,
}: MemberManagementModalProps) {
  const [brokenAvatars, setBrokenAvatars] = useState<Record<string, true>>({});
  const [kickConfirmUserId, setKickConfirmUserId] = useState<string | null>(null);
  const [kickSubmitting, setKickSubmitting] = useState(false);
  const [demoteConfirmUserId, setDemoteConfirmUserId] = useState<string | null>(null);
  const [demoteSubmitting, setDemoteSubmitting] = useState(false);
  const [promoteConfirmUserId, setPromoteConfirmUserId] = useState<string | null>(null);
  const [promoteSubmitting, setPromoteSubmitting] = useState(false);
  const [promotePickerOpen, setPromotePickerOpen] = useState(false);
  const [actionMenuUserId, setActionMenuUserId] = useState<string | null>(null);
  const [friendActionUserIds, setFriendActionUserIds] = useState<Record<string, true>>({});
  const tabBtnBase =
    'inline-flex h-10 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-3 text-[12px] font-bold transition-all';
  const tabBtnActive = 'bg-blue-600 text-white shadow-md shadow-blue-600/20';
  const tabBtnIdle =
    'bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10';

  const renderAvatar = (opts: { userId: string; name?: string; avatar?: string | null }) => {
    const label = (opts.name ?? opts.userId ?? 'U').trim();
    const first = (label.slice(0, 1) || 'U').toUpperCase();
    const isBroken = !!brokenAvatars[opts.userId];
    const src = opts.avatar ?? null;
    if (!src || isBroken) {
      return (
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-blue-700 dark:text-blue-200 font-bold">
          {first}
        </div>
      );
    }
    return (
      <img
        src={src}
        className="w-10 h-10 rounded-full object-cover shrink-0"
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBrokenAvatars((p) => ({ ...p, [opts.userId]: true }))}
      />
    );
  };

  const displayNameFor = (userId: string, rawName?: string | null) => {
    if (currentUserId && userId === currentUserId) return 'Bạn';
    const name = (rawName ?? '').trim();
    return name || userId;
  };

  const activeMembers = useMemo(
    () =>
      normalizeGroupMembersList(members, {
        leaderId: conversationLeaderId,
        creatorId: conversationCreatorId,
      }),
    [members, conversationLeaderId, conversationCreatorId],
  );

  const activeMemberIds = useMemo(
    () => new Set(activeMembers.map((m) => m.userId)),
    [activeMembers],
  );

  useEffect(() => {
    if (kickConfirmUserId && !activeMemberIds.has(kickConfirmUserId)) {
      setKickConfirmUserId(null);
    }
    if (demoteConfirmUserId && !activeMemberIds.has(demoteConfirmUserId)) {
      setDemoteConfirmUserId(null);
    }
    if (promoteConfirmUserId && !activeMemberIds.has(promoteConfirmUserId)) {
      setPromoteConfirmUserId(null);
    }
    if (promotePickerOpen && activeMembers.filter((m) => m.role === 'member').length === 0) {
      setPromotePickerOpen(false);
    }
  }, [
    activeMemberIds,
    activeMembers,
    demoteConfirmUserId,
    kickConfirmUserId,
    promoteConfirmUserId,
    promotePickerOpen,
  ]);

  const kickTarget = useMemo(() => {
    if (!kickConfirmUserId) return null;
    return activeMembers.find((m) => m.userId === kickConfirmUserId) ?? null;
  }, [kickConfirmUserId, activeMembers]);

  const demoteTarget = useMemo(() => {
    if (!demoteConfirmUserId) return null;
    return activeMembers.find((m) => m.userId === demoteConfirmUserId) ?? null;
  }, [demoteConfirmUserId, activeMembers]);

  const promoteTarget = useMemo(() => {
    if (!promoteConfirmUserId) return null;
    return activeMembers.find((m) => m.userId === promoteConfirmUserId) ?? null;
  }, [promoteConfirmUserId, activeMembers]);

  const promotableMembers = useMemo(
    () => activeMembers.filter((m) => m.role === 'member'),
    [activeMembers],
  );

  const adminCount = useMemo(() => countGroupAdmins(activeMembers), [activeMembers]);

  const listMembers = useMemo(() => {
    if (!leadersOnly) return activeMembers;
    return activeMembers.filter((m) => m.role === 'owner' || m.role === 'admin');
  }, [leadersOnly, activeMembers]);

  const adminSlotsFull = useMemo(() => isGroupAdminSlotsFull(activeMembers), [activeMembers]);

  const memberTabs = useMemo(() => {
    if (leadersOnly) return ['list'] as const;
    return ['list', ...(canModerate ? (['pending'] as const) : [])] as const;
  }, [canModerate, leadersOnly]);

  useEffect(() => {
    if (!(memberTabs as readonly MemberTab[]).includes(memberTab)) {
      onMemberTabChange('list');
    }
  }, [memberTab, memberTabs, onMemberTabChange]);

  useEffect(() => {
    if (!actionMenuUserId) return;
    const close = () => setActionMenuUserId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [actionMenuUserId]);

  const approve = async (userId: string) => {
    if (onApprove) return onApprove(userId);
    if (!groupId) {
      toast.error('Thiếu groupId để duyệt thành viên');
      return;
    }
    await apiClient.post(`/chat/groups/${groupId}/requests/${userId}/approve`);
  };

  const reject = async (userId: string) => {
    if (onReject) return onReject(userId);
    if (!groupId) {
      toast.error('Thiếu groupId để từ chối yêu cầu');
      return;
    }
    await apiClient.post(`/chat/groups/${groupId}/requests/${userId}/reject`);
  };

  const kick = async (userId: string) => {
    if (onKick) return onKick(userId);
    if (!groupId) {
      toast.error('Thiếu groupId để kick thành viên');
      return;
    }
    await apiClient.delete(`/chat/groups/${groupId}/members/${userId}`);
  };

  const demoteAdminToMember = async (userId: string) => {
    if (onDemoteAdminToMember) return onDemoteAdminToMember(userId);
    if (!groupId) {
      toast.error('Thiếu groupId để đổi vai trò');
      return;
    }
    await apiClient.put(`/chat/groups/${groupId}/members/${userId}/role`, { role: 'member' });
    toast.success('Đã hạ phó nhóm xuống thành viên');
  };

  const promoteMemberToAdmin = async (userId: string) => {
    if (onPromoteMemberToAdmin) return onPromoteMemberToAdmin(userId);
    if (!groupId) {
      toast.error('Thiếu groupId để đổi vai trò');
      return;
    }
    await apiClient.put(`/chat/groups/${groupId}/members/${userId}/role`, { role: 'admin' });
    toast.success('Đã bổ nhiệm phó nhóm');
  };

  const openPromoteFlow = () => {
    if (adminSlotsFull) {
      toast.error(
        `Nhóm chỉ có tối đa ${MAX_GROUP_ADMINS} phó nhóm. Hãy hạ một phó nhóm trước khi bổ nhiệm thêm.`,
      );
      return;
    }
    if (leadersOnly) {
      onBrowseMembersForPromote?.();
      return;
    }
    if (promotableMembers.length === 0) {
      toast.info('Không còn thành viên thường để bổ nhiệm phó nhóm');
      return;
    }
    setPromotePickerOpen(true);
  };

  const renderPromoteHeaderButton = (className: string) => {
    if (!canKick) return null;
    return (
      <button
        type="button"
        onClick={openPromoteFlow}
        disabled={busy?.changingRole || adminSlotsFull}
        className={className}
        title={
          adminSlotsFull ? `Đã đủ ${MAX_GROUP_ADMINS} phó nhóm` : 'Bổ nhiệm thành viên làm phó nhóm'
        }
      >
        + Bổ nhiệm phó nhóm
      </button>
    );
  };

  const addFriend = async (userId: string) => {
    try {
      await apiClient.post('/contacts/friends/request', { userId });
      setFriendActionUserIds((p) => ({ ...p, [userId]: true }));
      toast.success('Đã kết bạn');
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409) setFriendActionUserIds((p) => ({ ...p, [userId]: true }));
      toast.error(status === 409 ? 'Đã kết bạn' : 'Không thể kết bạn');
    }
  };

  const renderMemberTabBar = (className: string) => (
    <div className={className}>
      {memberTabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onMemberTabChange(tab)}
          className={`${tabBtnBase} ${memberTab === tab ? tabBtnActive : tabBtnIdle}`}
        >
          {tab === 'list' ? (
            <>
              <Users className="w-3.5 h-3.5" /> Thành viên ({members.length})
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5" /> Chờ duyệt{' '}
              {requests.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                  {requests.length}
                </span>
              )}
            </>
          )}
        </button>
      ))}
    </div>
  );

  // Inline: render thẳng trong panel (không overlay)
  if (variant === 'inline') {
    if (!open) return null;
    return (
      <div className="relative flex h-full w-full flex-col bg-white dark:bg-[#1a1a1a]">
        {memberTabs.length > 1
          ? renderMemberTabBar(
              'flex shrink-0 gap-1 border-b border-black/5 px-5 py-3 dark:border-white/5',
            )
          : null}
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-4 custom-scrollbar space-y-2">
          {memberTab === 'list' ? (
            listMembers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {leadersOnly ? 'Chưa có phó nhóm.' : 'Chưa có thành viên.'}
              </p>
            ) : (
              listMembers.map((member) => {
                const menuOpen = actionMenuUserId === member.userId;
                const isSelfAdmin = currentUserId === member.userId && member.role === 'admin';
                const canKickThis =
                  canKick && member.role !== 'owner' && member.userId !== currentUserId;
                const canDemote = (canKick || isSelfAdmin) && member.role === 'admin';
                const canPromote = canKick && member.role === 'member' && !adminSlotsFull;
                return (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {renderAvatar({
                      userId: member.userId,
                      name: displayNameFor(member.userId, member.name),
                      avatar: member.avatar,
                    })}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[14px] text-black dark:text-white truncate">
                        {displayNameFor(member.userId, member.name)}
                      </p>
                      {member.role === 'owner' ? (
                        <span className="mt-1 inline-flex max-w-full rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-600 dark:text-amber-400">
                          Trưởng nhóm
                        </span>
                      ) : member.role === 'admin' ? (
                        <span className="mt-1 inline-flex max-w-full rounded-md bg-blue-600/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-blue-700 dark:text-blue-300">
                          Phó nhóm
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {canPromote ? (
                        <button
                          type="button"
                          disabled={busy?.changingRole}
                          onClick={() => setPromoteConfirmUserId(member.userId)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0068ff]/10 text-[#0068ff] transition-colors hover:bg-[#0068ff]/15 disabled:opacity-50"
                          title="Bổ nhiệm phó nhóm"
                          aria-label="Bổ nhiệm phó nhóm"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                      ) : null}
                      {!leadersOnly && canKickThis ? (
                        <button
                          type="button"
                          disabled={busy?.removing}
                          onClick={() => setKickConfirmUserId(member.userId)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 transition-colors hover:bg-red-500/15 disabled:opacity-50"
                          title="Kick"
                          aria-label="Kick"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      ) : null}
                      {canDemote ? (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuUserId((prev) =>
                                prev === member.userId ? null : member.userId,
                              );
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                            title="Tùy chọn vai trò"
                            aria-label="Tùy chọn vai trò"
                            aria-expanded={menuOpen}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {menuOpen && (
                            <div
                              role="menu"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-9 w-44 rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f] border border-black/10 dark:border-white/10 shadow-xl"
                            >
                              {canDemote ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={busy?.changingRole}
                                  onClick={() => {
                                    setActionMenuUserId(null);
                                    setDemoteConfirmUserId(member.userId);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-foreground disabled:opacity-50"
                                >
                                  Hạ phó nhóm xuống thành viên
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )
          ) : !canModerate || leadersOnly ? null : (
            requests.map((person) => {
              const displayName = displayNameFor(
                person.userId,
                (person.name ?? person.displayName ?? person.userId) as string,
              );
              const subtitle =
                person.status === 'invited' ? 'Được mời vào nhóm' : 'Yêu cầu tham gia';
              const showAddFriend = !person.isFriend && !friendActionUserIds[person.userId];
              return (
                <div
                  key={person.userId}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 hover:border-blue-600/20 transition-colors"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {renderAvatar({
                      userId: person.userId,
                      name: displayName,
                      avatar: person.avatar,
                    })}
                    <div className="min-w-0">
                      <p
                        className="font-bold text-[14px] text-black dark:text-white truncate"
                        title={displayName}
                      >
                        {displayName}
                      </p>
                      <p className="text-[12px] text-muted-foreground font-medium truncate">
                        {subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {showAddFriend ? (
                      <button
                        type="button"
                        onClick={() => void addFriend(person.userId)}
                        className="rounded-lg bg-blue-600/10 px-3 py-1.5 text-[12px] font-bold text-blue-700 hover:bg-blue-600/15 dark:text-blue-300"
                      >
                        Kết bạn
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy?.rejecting}
                      onClick={() => void reject(person.userId)}
                      className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[12px] font-bold text-red-600 hover:bg-red-500/15 disabled:opacity-50"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      disabled={busy?.approving}
                      onClick={() => void approve(person.userId)}
                      className="rounded-lg bg-[#0068ff]/10 px-3 py-1.5 text-[12px] font-bold text-[#0068ff] hover:bg-[#0068ff]/15 disabled:opacity-50"
                    >
                      Duyệt
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <ConfirmModal
          open={kickConfirmUserId !== null}
          title="Mời khỏi nhóm"
          description={
            kickTarget
              ? `Mời "${kickTarget.name ?? kickTarget.userId}" ra khỏi nhóm?`
              : 'Mời người này ra khỏi nhóm?'
          }
          confirmLabel="Mời ra khỏi nhóm"
          variant="danger"
          isConfirming={kickSubmitting}
          onClose={() => {
            if (!kickSubmitting) setKickConfirmUserId(null);
          }}
          onConfirm={() => {
            if (!kickConfirmUserId) return;
            setKickSubmitting(true);
            void (async () => {
              try {
                await kick(kickConfirmUserId);
                toast.success('Đã mời thành viên ra khỏi nhóm');
                setKickConfirmUserId(null);
              } catch (e: unknown) {
                const status = (e as { response?: { status?: number } })?.response?.status;
                toast.error(status === 403 ? 'Bạn không có quyền' : 'Không thể mời ra khỏi nhóm');
              } finally {
                setKickSubmitting(false);
              }
            })();
          }}
        />

        <ConfirmModal
          open={demoteConfirmUserId !== null}
          title="Hạ phó nhóm"
          description={
            demoteTarget
              ? `Hạ "${demoteTarget.name ?? demoteTarget.userId}" xuống thành viên?`
              : 'Hạ người này xuống thành viên?'
          }
          confirmLabel="Hạ xuống thành viên"
          isConfirming={demoteSubmitting}
          onClose={() => {
            if (!demoteSubmitting) setDemoteConfirmUserId(null);
          }}
          onConfirm={() => {
            if (!demoteConfirmUserId) return;
            setDemoteSubmitting(true);
            void (async () => {
              try {
                await demoteAdminToMember(demoteConfirmUserId);
                setDemoteConfirmUserId(null);
              } catch (e: unknown) {
                const status = (e as { response?: { status?: number } })?.response?.status;
                toast.error(status === 403 ? 'Bạn không có quyền' : 'Không thể đổi vai trò');
              } finally {
                setDemoteSubmitting(false);
              }
            })();
          }}
        />

        <ConfirmModal
          open={promoteConfirmUserId !== null}
          title="Bổ nhiệm phó nhóm"
          description={
            promoteTarget
              ? `Bổ nhiệm "${promoteTarget.name ?? promoteTarget.userId}" làm phó nhóm?`
              : 'Bổ nhiệm người này làm phó nhóm?'
          }
          confirmLabel="Bổ nhiệm"
          isConfirming={promoteSubmitting}
          onClose={() => {
            if (!promoteSubmitting) setPromoteConfirmUserId(null);
          }}
          onConfirm={() => {
            if (!promoteConfirmUserId) return;
            setPromoteSubmitting(true);
            void (async () => {
              try {
                await promoteMemberToAdmin(promoteConfirmUserId);
                setPromoteConfirmUserId(null);
                setPromotePickerOpen(false);
              } catch (e: unknown) {
                const status = (e as { response?: { status?: number } })?.response?.status;
                toast.error(status === 403 ? 'Bạn không có quyền' : 'Không thể đổi vai trò');
              } finally {
                setPromoteSubmitting(false);
              }
            })();
          }}
        />

        {promotePickerOpen ? (
          <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40">
            <div className="max-h-[55vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-[#1a1a1a]">
              <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/5">
                <h4 className="text-[15px] font-bold text-foreground">Chọn thành viên</h4>
                <button
                  type="button"
                  onClick={() => setPromotePickerOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="custom-scrollbar overflow-y-auto px-3 py-2">
                {promotableMembers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Không còn thành viên thường để bổ nhiệm
                  </p>
                ) : (
                  promotableMembers.map((m) => (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => {
                        setPromotePickerOpen(false);
                        setPromoteConfirmUserId(m.userId);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      {renderAvatar({
                        userId: m.userId,
                        name: displayNameFor(m.userId, m.name),
                        avatar: m.avatar,
                      })}
                      <span className="flex-1 truncate text-[14px] font-semibold text-foreground">
                        {displayNameFor(m.userId, m.name)}
                      </span>
                      <span className="text-[12px] font-bold text-[#0068ff]">Bổ nhiệm</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[460px] w-full shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden max-h-[88vh]"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/5 px-5 py-4 dark:border-white/5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[17px] text-black dark:text-white">
                    Quản lý thành viên
                  </h3>
                  {canKick ? (
                    <p className="text-[12px] text-muted-foreground">
                      Phó nhóm: {adminCount}/{MAX_GROUP_ADMINS}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {renderPromoteHeaderButton(
                  'rounded-lg bg-[#0068ff]/10 px-2.5 py-1.5 text-[12px] font-bold text-[#0068ff] hover:bg-[#0068ff]/15 disabled:opacity-50',
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {renderMemberTabBar('flex shrink-0 gap-1 px-5 pt-4')}

            <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar space-y-2">
              {memberTab === 'list'
                ? members.map((member) => {
                    const menuOpen = actionMenuUserId === member.userId;
                    const isSelfAdmin = currentUserId === member.userId && member.role === 'admin';
                    const canKickThis =
                      canKick && member.role !== 'owner' && member.userId !== currentUserId;
                    const canDemote = (canKick || isSelfAdmin) && member.role === 'admin';
                    const canPromote = canKick && member.role === 'member' && !adminSlotsFull;
                    return (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        {renderAvatar({
                          userId: member.userId,
                          name: member.name,
                          avatar: member.avatar,
                        })}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[14px] text-black dark:text-white truncate">
                            {member.name}
                          </p>
                          {member.role === 'owner' ? (
                            <span className="mt-1 inline-flex max-w-full rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-600 dark:text-amber-400">
                              Trưởng nhóm
                            </span>
                          ) : member.role === 'admin' ? (
                            <span className="mt-1 inline-flex max-w-full rounded-md bg-blue-600/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-blue-700 dark:text-blue-300">
                              Phó nhóm
                            </span>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {canPromote ? (
                            <button
                              type="button"
                              disabled={busy?.changingRole}
                              onClick={() => setPromoteConfirmUserId(member.userId)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0068ff]/10 text-[#0068ff] transition-colors hover:bg-[#0068ff]/15 disabled:opacity-50"
                              title="Bổ nhiệm phó nhóm"
                              aria-label="Bổ nhiệm phó nhóm"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                          ) : null}
                          {canKickThis ? (
                            <button
                              type="button"
                              disabled={busy?.removing}
                              onClick={() => setKickConfirmUserId(member.userId)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 transition-colors hover:bg-red-500/15 disabled:opacity-50"
                              title="Kick"
                              aria-label="Kick"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          ) : null}
                          {canDemote ? (
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenuUserId((prev) =>
                                    prev === member.userId ? null : member.userId,
                                  );
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                                title="Tùy chọn vai trò"
                                aria-label="Tùy chọn vai trò"
                                aria-expanded={menuOpen}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {menuOpen && (
                                <div
                                  role="menu"
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-9 w-44 rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f] border border-black/10 dark:border-white/10 shadow-xl"
                                >
                                  {canDemote ? (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      disabled={busy?.changingRole}
                                      onClick={() => {
                                        setActionMenuUserId(null);
                                        setDemoteConfirmUserId(member.userId);
                                      }}
                                      className="w-full text-left px-3 py-2 text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-foreground disabled:opacity-50"
                                    >
                                      Hạ phó nhóm xuống thành viên
                                    </button>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                : requests.map((person) => {
                    const displayName = (person.name ??
                      person.displayName ??
                      person.userId) as string;
                    const subtitle =
                      person.status === 'invited' ? 'Được mời vào nhóm' : 'Yêu cầu tham gia';
                    const showAddFriend = !person.isFriend && !friendActionUserIds[person.userId];
                    return (
                      <div
                        key={person.userId}
                        className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 hover:border-blue-600/20 transition-colors"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {renderAvatar({
                            userId: person.userId,
                            name: displayName,
                            avatar: person.avatar,
                          })}
                          <div className="min-w-0">
                            <p
                              className="font-bold text-[14px] text-black dark:text-white truncate"
                              title={displayName}
                            >
                              {displayName}
                            </p>
                            <p className="text-[12px] text-muted-foreground font-medium truncate">
                              {subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          {showAddFriend ? (
                            <button
                              type="button"
                              onClick={() => void addFriend(person.userId)}
                              className="rounded-lg bg-blue-600/10 px-3 py-1.5 text-[12px] font-bold text-blue-700 hover:bg-blue-600/15 dark:text-blue-300"
                            >
                              Kết bạn
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy?.rejecting}
                            onClick={() => void reject(person.userId)}
                            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[12px] font-bold text-red-600 hover:bg-red-500/15 disabled:opacity-50"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            disabled={busy?.approving}
                            onClick={() => void approve(person.userId)}
                            className="rounded-lg bg-[#0068ff]/10 px-3 py-1.5 text-[12px] font-bold text-[#0068ff] hover:bg-[#0068ff]/15 disabled:opacity-50"
                          >
                            Duyệt
                          </button>
                        </div>
                      </div>
                    );
                  })}
            </div>

            <ConfirmModal
              open={kickConfirmUserId !== null}
              title="Mời khỏi nhóm"
              description={
                kickTarget
                  ? `Mời "${kickTarget.name ?? kickTarget.userId}" ra khỏi nhóm?`
                  : 'Mời người này ra khỏi nhóm?'
              }
              confirmLabel="Mời ra khỏi nhóm"
              variant="danger"
              isConfirming={kickSubmitting}
              onClose={() => {
                if (!kickSubmitting) setKickConfirmUserId(null);
              }}
              onConfirm={() => {
                if (!kickConfirmUserId) return;
                setKickSubmitting(true);
                void (async () => {
                  try {
                    await kick(kickConfirmUserId);
                    toast.success('Đã mời thành viên ra khỏi nhóm');
                    setKickConfirmUserId(null);
                  } catch (e: unknown) {
                    const status = (e as { response?: { status?: number } })?.response?.status;
                    toast.error(
                      status === 403 ? 'Bạn không có quyền' : 'Không thể mời ra khỏi nhóm',
                    );
                  } finally {
                    setKickSubmitting(false);
                  }
                })();
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
