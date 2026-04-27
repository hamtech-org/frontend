import { AnimatePresence, motion } from 'motion/react';
import { UserPlus, Users, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '@/services/api';
import { ConfirmModal } from '@/components/chat/ConfirmModal';
import { useEffect, useMemo, useState } from 'react';
import type { GroupMember, GroupRequest } from '@/types/chat.group.types';

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
  busy,
  variant = 'modal',
  canModerate = false,
  canKick = false,
  onAddMembersClick,
  groupId,
}: MemberManagementModalProps) {
  const [brokenAvatars, setBrokenAvatars] = useState<Record<string, true>>({});
  const [kickConfirmUserId, setKickConfirmUserId] = useState<string | null>(null);
  const [kickSubmitting, setKickSubmitting] = useState(false);
  const [demoteConfirmUserId, setDemoteConfirmUserId] = useState<string | null>(null);
  const [demoteSubmitting, setDemoteSubmitting] = useState(false);
  const [actionMenuUserId, setActionMenuUserId] = useState<string | null>(null);
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

  const kickTarget = useMemo(() => {
    if (!kickConfirmUserId) return null;
    return members.find((m) => m.userId === kickConfirmUserId) ?? null;
  }, [kickConfirmUserId, members]);

  const demoteTarget = useMemo(() => {
    if (!demoteConfirmUserId) return null;
    return members.find((m) => m.userId === demoteConfirmUserId) ?? null;
  }, [demoteConfirmUserId, members]);

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
  };

  const addFriend = async (userId: string) => {
    try {
      await apiClient.post('/contacts/friends/request', { userId });
      toast.success('Đã kết bạn');
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      toast.error(status === 409 ? 'Đã kết bạn' : 'Không thể kết bạn');
    }
  };

  // Inline: render thẳng trong panel (không overlay)
  if (variant === 'inline') {
    if (!open) return null;
    return (
      <div className="h-full w-full flex flex-col bg-white dark:bg-[#1a1a1a]">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {onAddMembersClick && (
              <button
                type="button"
                onClick={onAddMembersClick}
                className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[13px] font-bold text-blue-600 dark:text-blue-400 transition-colors"
                title="Thêm thành viên"
              >
                + Thêm thành viên
              </button>
            )}
          </div>
        </div>

        <div className="flex px-5 pt-4 gap-1 shrink-0">
          {(['list', ...(canModerate ? (['pending'] as const) : [])] as const).map((tab) => (
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

        <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar space-y-2">
          {memberTab === 'list'
            ? members.map((member) => {
                const menuOpen = actionMenuUserId === member.userId;
                const canAct = canKick && member.role !== 'owner';
                const canDemote = canKick && member.role === 'admin';
                return (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    {renderAvatar({
                      userId: member.userId,
                      name: displayNameFor(member.userId, member.name),
                      avatar: member.avatar,
                    })}
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-[14px] text-black dark:text-white truncate">
                        {displayNameFor(member.userId, member.name)}
                      </p>
                    </div>
                    {member.role === 'owner' ? (
                      <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold shrink-0">
                        Trưởng nhóm
                      </span>
                    ) : member.role === 'admin' ? (
                      <span className="px-2 py-1 rounded-lg bg-blue-600/10 text-blue-700 dark:text-blue-300 text-[11px] font-bold shrink-0">
                        Phó nhóm
                      </span>
                    ) : null}
                    {canAct ? (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuUserId((prev) =>
                              prev === member.userId ? null : member.userId,
                            );
                          }}
                          className="h-9 w-9 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-muted-foreground font-black"
                          title="Tùy chọn"
                          aria-label="Tùy chọn"
                          aria-expanded={menuOpen}
                        >
                          ⋯
                        </button>

                        {menuOpen && (
                          <div
                            role="menu"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-10 w-44 rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f] border border-black/10 dark:border-white/10 shadow-xl"
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
                            <button
                              type="button"
                              role="menuitem"
                              disabled={busy?.removing}
                              onClick={() => {
                                setActionMenuUserId(null);
                                setKickConfirmUserId(member.userId);
                              }}
                              className="w-full text-left px-3 py-2 text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-red-600 disabled:opacity-50"
                            >
                              Kick
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            : !canModerate
              ? null
              : requests.map((person) => {
                  const displayName = displayNameFor(
                    person.userId,
                    (person.name ?? person.displayName ?? person.userId) as string,
                  );
                  const subtitle =
                    person.status === 'invited' ? 'Được mời vào nhóm' : 'Yêu cầu tham gia';
                  const menuOpen = actionMenuUserId === person.userId;
                  return (
                    <div
                      key={person.userId}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 hover:border-blue-600/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
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

                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuUserId((prev) =>
                              prev === person.userId ? null : person.userId,
                            );
                          }}
                          className="h-9 w-9 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-muted-foreground font-black"
                          title="Tùy chọn"
                          aria-label="Tùy chọn"
                        >
                          ⋯
                        </button>

                        {menuOpen && (
                          <div
                            role="menu"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-10 w-40 rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f] border border-black/10 dark:border-white/10 shadow-xl"
                          >
                            {!person.isFriend && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setActionMenuUserId(null);
                                  void addFriend(person.userId);
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-blue-700 dark:text-blue-300"
                              >
                                Kết bạn
                              </button>
                            )}
                            <button
                              type="button"
                              role="menuitem"
                              disabled={busy?.rejecting}
                              onClick={() => {
                                setActionMenuUserId(null);
                                void reject(person.userId);
                              }}
                              className="w-full text-left px-3 py-2 text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-red-600 disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              disabled={busy?.approving}
                              onClick={() => {
                                setActionMenuUserId(null);
                                void approve(person.userId);
                              }}
                              className="w-full text-left px-3 py-2 text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-foreground disabled:opacity-50"
                            >
                              Duyệt
                            </button>
                          </div>
                        )}
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
                toast.success('Đã hạ phó nhóm xuống thành viên');
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
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-[17px] text-black dark:text-white">
                  Quản lý thành viên
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex px-5 pt-4 gap-1 shrink-0">
              {(['list', 'pending'] as const).map((tab) => (
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

            <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar space-y-2">
              {memberTab === 'list'
                ? members.map((member) => {
                    const menuOpen = actionMenuUserId === member.userId;
                    const canAct = canKick && member.role !== 'owner';
                    const canDemote = canKick && member.role === 'admin';
                    return (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        {renderAvatar({
                          userId: member.userId,
                          name: member.name,
                          avatar: member.avatar,
                        })}
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-[14px] text-black dark:text-white truncate">
                            {member.name}
                          </p>
                        </div>
                        {member.role === 'owner' && (
                          <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold shrink-0">
                            Trưởng nhóm
                          </span>
                        )}
                        {member.role === 'admin' ? (
                          <span className="px-2 py-1 rounded-lg bg-blue-600/10 text-blue-700 dark:text-blue-300 text-[11px] font-bold shrink-0">
                            Phó nhóm
                          </span>
                        ) : null}
                        {canAct ? (
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuUserId((prev) =>
                                  prev === member.userId ? null : member.userId,
                                );
                              }}
                              className="h-9 w-9 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-muted-foreground font-black"
                              title="Tùy chọn"
                              aria-label="Tùy chọn"
                              aria-expanded={menuOpen}
                            >
                              ⋯
                            </button>

                            {menuOpen && (
                              <div
                                role="menu"
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-10 w-44 rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f] border border-black/10 dark:border-white/10 shadow-xl"
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
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={busy?.removing}
                                  onClick={() => {
                                    setActionMenuUserId(null);
                                    setKickConfirmUserId(member.userId);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-red-600 disabled:opacity-50"
                                >
                                  Kick
                                </button>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                : requests.map((person) => {
                    const displayName = (person.name ??
                      person.displayName ??
                      person.userId) as string;
                    const subtitle =
                      person.status === 'invited' ? 'Được mời vào nhóm' : 'Yêu cầu tham gia';
                    const menuOpen = actionMenuUserId === person.userId;
                    return (
                      <div
                        key={person.userId}
                        className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 hover:border-blue-600/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
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

                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuUserId((prev) =>
                                prev === person.userId ? null : person.userId,
                              );
                            }}
                            className="h-9 w-9 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-muted-foreground font-black"
                            title="Tùy chọn"
                            aria-label="Tùy chọn"
                          >
                            ⋯
                          </button>

                          {menuOpen && (
                            <div
                              role="menu"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-10 w-40 rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f] border border-black/10 dark:border-white/10 shadow-xl"
                            >
                              {!person.isFriend && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setActionMenuUserId(null);
                                    void addFriend(person.userId);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-blue-700 dark:text-blue-300"
                                >
                                  Kết bạn
                                </button>
                              )}
                              <button
                                type="button"
                                role="menuitem"
                                disabled={busy?.rejecting}
                                onClick={() => {
                                  setActionMenuUserId(null);
                                  void reject(person.userId);
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-red-600 disabled:opacity-50"
                              >
                                Từ chối
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                disabled={busy?.approving}
                                onClick={() => {
                                  setActionMenuUserId(null);
                                  void approve(person.userId);
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-foreground disabled:opacity-50"
                              >
                                Duyệt
                              </button>
                            </div>
                          )}
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
