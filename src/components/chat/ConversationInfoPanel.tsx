import {
  Bell,
  BellOff,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  File,
  FileText,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserPlus,
  Users,
  User,
  X,
  Trash2,
} from 'lucide-react';
import type { IConversation, IMessage } from '@/types/chat.types';
import type { GroupMember, GroupMemberRole, GroupRequest } from '@/types/chat.group.types';
import { useChatPageContext } from '@/pages/user/chat-page/ChatPageContext';
import type { ApiSuccessResponse } from '@/types/api.types';
import { apiClient } from '@/services/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MemberManagementModal } from '@/components/chat/MemberManagementModal';
import { GroupManagementModal } from '@/components/chat/GroupManagementModal';
import { ConversationSearchPanel } from '@/components/chat/ConversationSearchPanel';
import type { ConversationSearchMemberRow } from '@/components/chat/ConversationSearchPanel';
import {
  MuteNotificationsModal,
  type MuteNotificationsApplyPayload,
} from '@/components/chat/MuteNotificationsModal';
import { ConfirmModal } from '@/components/chat/ConfirmModal';
import { TaskDeadlineCalendar } from '@/components/chat/TaskDeadlineCalendar';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'react-toastify';
import { MIN_GROUP_MEMBERS } from '@/constants/group.constants';
import { isTaskJoinDeadlinePassed } from '@/utils/chatUtils';
import {
  canUserCreatePollInGroup,
  canUserCreateTaskInGroup,
} from '@/utils/groupConversationPermissions';

type GroupPoll = {
  pollId: string;
  question: string;
  options: Array<{ text: string; voters?: string[] }>;
  isClosed?: boolean;
  createdAt?: string;
  creatorId?: string;
  creatorDisplayName?: string | null;
};

type GroupTask = {
  taskId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  createdAt?: string;
  creatorId?: string;
  creatorDisplayName?: string | null;
  dueDate?: string | null;
  assignToAll?: boolean;
  broadcast?: boolean;
  assignees?: string[];
  participants?: string[];
};

/** Kiểu Zalo: 28/02/2026 lúc 16:24 */
function formatBulletinFooterTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} lúc ${time}`;
}

function SuccessorPickAvatar({ url, label }: { url?: string | null; label: string }) {
  const [broken, setBroken] = useState(false);
  const initial = label.trim().charAt(0).toUpperCase() || '?';
  if (url && !broken) {
    return (
      <img
        src={url}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/10 text-[15px] font-semibold text-foreground dark:bg-white/10">
      {initial}
    </div>
  );
}

function resolveCreatorLabel(
  creatorId: string | undefined | null,
  creatorDisplayName: string | null | undefined,
  currentUserId: string | undefined,
  memberNameById: Map<string, string>,
): string {
  const fromApi = creatorDisplayName?.trim();
  if (fromApi) return fromApi;
  if (creatorId && currentUserId && creatorId === currentUserId) return 'Bạn';
  if (creatorId) {
    const fromMembers = memberNameById.get(creatorId)?.trim();
    if (fromMembers) return fromMembers;
  }
  if (creatorId) return 'Thành viên';
  return 'Không rõ';
}

type BulletinFeedRow = {
  kind: 'poll' | 'task';
  id: string;
  atMs: number;
  createdAt?: string;
  creatorId?: string;
  creatorName: string;
  title: string;
  subtitle: string;
  poll?: GroupPoll;
  task?: GroupTask;
};

type BulletinTab = 'all' | 'pinned' | 'notes' | 'polls';

type MessageGalleryKind = 'media' | 'file' | 'link';

type MessageGalleryItem = {
  messageId: string;
  senderId: string;
  senderDisplayName: string | null;
  type: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
  mediaOriginalName: string | null;
  createdAt: string;
};

type BulletinCardRowProps = {
  item: BulletinFeedRow;
  memberAvatarById: Map<string, string>;
  currentUserId?: string;
  onVotePoll?: (pollId: string, optionIndex: number) => void;
  onOpenPollVote?: (pollId: string) => void;
  onAddPollOption?: (pollId: string) => void;
  onClosePoll?: (pollId: string) => void;
  /** Xác nhận tham gia task (đồng bộ với khung chat — gọi API join). */
  onTaskJoined?: (taskId: string) => void | Promise<void>;
  onEditTaskFromBulletin?: (task: GroupTask) => void;
  onDeleteTaskFromBulletin?: (taskId: string) => void;
  taskMutating?: boolean;
  focusTaskId?: string | null;
  focusFlashNonce?: number;
};

function BulletinCardRow({
  item,
  memberAvatarById,
  currentUserId,
  onVotePoll,
  onOpenPollVote,
  onAddPollOption,
  onClosePoll,
  onTaskJoined,
  onEditTaskFromBulletin,
  onDeleteTaskFromBulletin,
  taskMutating,
  focusTaskId,
  focusFlashNonce,
}: BulletinCardRowProps) {
  const avatarUrl = item.creatorId ? memberAvatarById.get(item.creatorId) : undefined;
  const footer = formatBulletinFooterTime(item.createdAt);
  const pollOpen = item.kind === 'poll' && item.poll && !item.poll.isClosed;
  const openPollVote = () => {
    if (!item.poll || item.poll.isClosed) return;
    if (onOpenPollVote) onOpenPollVote(item.id);
    else onVotePoll?.(item.id, 0);
  };

  const isFocusedTask =
    item.kind === 'task' && item.task ? String(item.task.taskId) === String(focusTaskId ?? '') : false;
  const domId = item.kind === 'task' && item.task ? `task-row-${item.task.taskId}` : undefined;
  return (
    <div
      id={domId}
      data-focus-flash={isFocusedTask ? focusFlashNonce ?? 0 : undefined}
      className={`rounded-2xl border border-black/[0.06] bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#242424] ${
        pollOpen ? 'cursor-pointer hover:border-blue-600/30' : ''
      } ${isFocusedTask ? 'ring-2 ring-blue-500/50' : ''}`}
      role={pollOpen ? 'button' : undefined}
      tabIndex={pollOpen ? 0 : undefined}
      onClick={() => {
        if (pollOpen) openPollVote();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && pollOpen) openPollVote();
      }}
    >
      <div className="flex gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">{item.creatorName}</p>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-blue-600">
            {item.kind === 'poll' ? (
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-90" />
            ) : (
              <CheckSquare className="h-3.5 w-3.5 shrink-0 opacity-90" />
            )}
            <span>{item.kind === 'poll' ? 'Bình chọn' : 'Công việc'}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {item.kind === 'task' && item.task ? (
          <div className="space-y-2">
            <p className="pr-1 text-[13px] font-semibold leading-snug text-foreground">{item.title}</p>
            {(() => {
              const t = item.task as GroupTask;
              const due = t.dueDate ? String(t.dueDate) : '';
              const dueOk = due && !Number.isNaN(new Date(due).getTime());
              const assignees = Array.isArray(t.assignees) ? t.assignees : [];
              const participants = Array.isArray(t.participants) ? t.participants : [];
              const assignToAll = Boolean(t.assignToAll) || Boolean(t.broadcast) || assignees.length === 0;
              const uid = String(currentUserId ?? '');
              const joined = uid ? participants.includes(uid) : false;
              const canJoin = assignToAll || (uid ? assignees.includes(uid) : false);
              const joinDeadlinePassed = dueOk && isTaskJoinDeadlinePassed(due);
              const showJoinButton =
                Boolean(onTaskJoined) && !joined && canJoin && !joinDeadlinePassed;
              return (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {dueOk ? <TaskDeadlineCalendar dateIso={due} size="sm" /> : null}
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 font-semibold dark:bg-white/10">
                    <Users className="h-3 w-3 shrink-0" />
                    {participants.length > 0 ? `${participants.length} đã tham gia` : 'Chưa ai tham gia'}
                  </span>
                  {joined ? (
                    <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      Bạn đã tham gia
                    </span>
                  ) : joinDeadlinePassed ? (
                    <span
                      className="ml-auto rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground dark:bg-white/10"
                      title="Đã quá hạn công việc"
                    >
                      Chưa tham gia
                    </span>
                  ) : showJoinButton ? (
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void onTaskJoined?.(String(t.taskId));
                      }}
                      className="ml-auto rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700"
                    >
                      Xác nhận tham gia
                    </button>
                  ) : null}
                </div>
              );
            })()}
            {item.subtitle ? (
              <p className="line-clamp-2 text-[12px] leading-snug text-muted-foreground">{item.subtitle}</p>
            ) : null}
            {(() => {
              const t = item.task;
              if (!t) return null;
              const uid = String(currentUserId ?? '');
              const isCreator = Boolean(t.creatorId && uid && String(t.creatorId) === uid);
              if (!isCreator || (!onEditTaskFromBulletin && !onDeleteTaskFromBulletin)) return null;
              return (
                <div className="flex flex-wrap gap-2 pt-1" onClick={(ev) => ev.stopPropagation()}>
                  {onEditTaskFromBulletin ? (
                    <button
                      type="button"
                      disabled={taskMutating}
                      onClick={() => onEditTaskFromBulletin(t)}
                      className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold text-foreground hover:bg-black/10 disabled:opacity-40 dark:bg-white/10 dark:hover:bg-white/15"
                    >
                      Sửa
                    </button>
                  ) : null}
                  {onDeleteTaskFromBulletin ? (
                    <button
                      type="button"
                      disabled={taskMutating}
                      onClick={() => onDeleteTaskFromBulletin(String(t.taskId))}
                      className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-bold text-red-700 hover:bg-red-500/15 disabled:opacity-40 dark:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                      Hủy công việc
                    </button>
                  ) : null}
                </div>
              );
            })()}
          </div>
        ) : (
          <p className="pr-1 text-[13px] font-semibold leading-snug">{item.title}</p>
        )}
        {item.kind !== 'task' && item.subtitle ? (
          <p className="line-clamp-3 text-[12px] leading-snug text-muted-foreground">{item.subtitle}</p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-muted-foreground">
        <span>{footer || '—'}</span>
        {pollOpen && (onOpenPollVote || onVotePoll) ? (
          <>
            <span className="text-black/20 dark:text-white/25">|</span>
            <button
              type="button"
              className="font-semibold text-blue-600 hover:underline"
              onClick={(ev) => {
                ev.stopPropagation();
                openPollVote();
              }}
            >
              Bỏ phiếu
            </button>
          </>
        ) : null}
      </div>
      {item.kind === 'poll' && item.poll ? (
        <div className="mt-2 flex flex-wrap gap-1.5" onClick={(ev) => ev.stopPropagation()}>
          <button
            type="button"
            onClick={() => onAddPollOption?.(item.poll!.pollId)}
            className="rounded-md bg-black/5 px-2 py-1 text-[10px] dark:bg-white/10"
          >
            + Option
          </button>
          <button
            type="button"
            onClick={() => onClosePoll?.(item.poll!.pollId)}
            className="rounded-md bg-black/5 px-2 py-1 text-[10px] dark:bg-white/10"
          >
            Đóng
          </button>
        </div>
      ) : null}
    </div>
  );
}

type ConversationInfoPanelProps = {
  activeConversation: IConversation | undefined;
  onOpenAISummaryFromPanel: () => void;
  // Legacy external modal trigger (giữ để tương thích)
  onOpenMemberModal?: (tab: 'list' | 'pending') => void;
  onLeaveGroup?: (opts?: { newOwnerUserId?: string }) => void | Promise<void>;
  /** Chuyển quyền trưởng nhóm (không rời nhóm) — giống mobile. */
  onTransferGroupOwner?: (newOwnerUserId: string) => void | Promise<void>;
  onDeleteGroup?: () => void;
  onEditGroup?: () => void;
  onAddMembers?: () => void;
  /** Chat 1-1: mở tạo nhóm (thay “thêm thành viên”). */
  onOpenCreateGroup?: () => void;
  /** Bật lại thông báo (xóa tắt tạm + tắt vĩnh viễn). */
  onToggleMuteNotifications?: () => void;
  /** Tắt thông báo theo lựa chọn trong modal (1p / 5p / 10p / đến khi mở lại). */
  onApplyMuteFromModal?: (payload: MuteNotificationsApplyPayload) => Promise<void>;
  onTogglePinConversation?: () => void;
  onRequestJoin?: () => void;
  onVotePoll?: (pollId: string, optionIndex: number) => void;
  onOpenPollVote?: (pollId: string) => void;
  onAddPollOption?: (pollId: string) => void;
  onClosePoll?: (pollId: string) => void;
  onTaskJoined?: (taskId: string) => void | Promise<void>;
  /** Mở modal tạo bình chọn (nút + trên bảng tin). */
  onOpenPollModalFromPanel?: () => void;
  /** Mở modal tạo công việc (nút + trên bảng tin). */
  onOpenTaskModalFromPanel?: () => void;
  onEditTaskFromBulletin?: (task: GroupTask) => void;
  onDeleteTaskFromBulletin?: (taskId: string) => void;
  /** Khóa nút Sửa/Hủy khi đang gọi API tạo/sửa/xóa công việc. */
  taskActionBusy?: boolean;
  polls?: GroupPoll[];
  tasks?: GroupTask[];
  isJoinRequested?: boolean;
  loading?: {
    polls?: boolean;
    tasks?: boolean;
    recap?: boolean;
    requestJoin?: boolean;
    updateGroup?: boolean;
    leaveGroup?: boolean;
    deleteGroup?: boolean;
  };
  busyMemberActions?: {
    approving: boolean;
    rejecting: boolean;
    removing: boolean;
    changingRole: boolean;
  };
  numRequests?: number;
  currentUserRole?: GroupMemberRole;
  currentUserId?: string;
  members?: GroupMember[];
  requests?: GroupRequest[];
  onApproveMember?: (userId: string) => void | Promise<void>;
  onRejectMember?: (userId: string) => void | Promise<void>;
  onKickMember?: (userId: string) => void | Promise<void>;

  /** Tin đã tải trong hội thoại — tìm trong phạm vi client. */
  conversationMessages?: IMessage[];
  /** Mỗi lần tăng (từ ChatHeader) → mở panel tìm kiếm inline. */
  conversationSearchRequestTick?: number;
  onJumpToMessage?: (messageId: string) => void;
  conversations?: IConversation[];
  onSelectConversation?: (conversationId: string) => void;
  /** Khi set: tự mở tab công việc và cuộn tới task tương ứng. */
  focusTaskId?: string | null;
  /** Tăng để trigger lại hiệu ứng focus/scroll. */
  focusTaskNonce?: number;
};

export function ConversationInfoPanel({
  activeConversation,
  onOpenAISummaryFromPanel,
  onOpenMemberModal,
  onLeaveGroup,
  onTransferGroupOwner,
  onDeleteGroup,
  onEditGroup,
  onAddMembers,
  onOpenCreateGroup,
  onToggleMuteNotifications,
  onApplyMuteFromModal,
  onTogglePinConversation,
  onRequestJoin,
  onVotePoll,
  onOpenPollVote,
  onAddPollOption,
  onClosePoll,
  onTaskJoined,
  onOpenPollModalFromPanel,
  onOpenTaskModalFromPanel,
  onEditTaskFromBulletin,
  onDeleteTaskFromBulletin,
  taskActionBusy = false,
  polls = [],
  tasks = [],
  isJoinRequested = false,
  loading,
  numRequests,
  currentUserRole,
  currentUserId,
  members = [],
  requests = [],
  onApproveMember,
  onRejectMember,
  onKickMember,
  busyMemberActions,
  conversationMessages = [],
  conversationSearchRequestTick = 0,
  onJumpToMessage,
  conversations = [],
  onSelectConversation,
  focusTaskId = null,
  focusTaskNonce = 0,
}: ConversationInfoPanelProps) {
  const { core, groupActions } = useChatPageContext();
  const isMuted = !!activeConversation?.isMuted;
  const isConvPinned = !!activeConversation?.isPinnedToTop;
  const scheduledMuteUntil =
    typeof activeConversation?.notificationsMutedUntil === 'string'
      ? activeConversation.notificationsMutedUntil.trim()
      : '';
  const scheduledMuteUntilMs = scheduledMuteUntil ? new Date(scheduledMuteUntil).getTime() : NaN;
  const hasActiveScheduledMute = Boolean(
    scheduledMuteUntil &&
      !Number.isNaN(scheduledMuteUntilMs) &&
      scheduledMuteUntilMs > Date.now(),
  );
  const isOwner = currentUserRole === 'owner';
  const canModerateMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canDisbandGroup = currentUserRole === 'owner' || currentUserRole === 'admin';

  const canCreatePollFromBulletin = useMemo(
    () => canUserCreatePollInGroup({ conversation: activeConversation ?? undefined, userRole: currentUserRole }),
    [activeConversation, currentUserRole],
  );
  const canCreateTaskFromBulletin = useMemo(
    () => canUserCreateTaskInGroup({ conversation: activeConversation ?? undefined, userRole: currentUserRole }),
    [activeConversation, currentUserRole],
  );

  const busyMemberActionsResolved = busyMemberActions ?? {
    approving: false,
    rejecting: false,
    removing: false,
    changingRole: false,
  };

  const listMemberCount = (members as unknown[]).length;
  const effectiveMemberCount =
    listMemberCount > 0 ? listMemberCount : (activeConversation?.memberCount ?? 0);
  /** Sau khi 1 người rời, nhóm phải còn ≥ MIN_GROUP_MEMBERS → hiện tại phải có > MIN. */
  const leaveBlockedByMinMembers = effectiveMemberCount <= MIN_GROUP_MEMBERS;
  const leaveMinMembersHint = `Nhóm cần còn tối thiểu ${MIN_GROUP_MEMBERS} thành viên sau khi có người rời (hiện ${effectiveMemberCount} người). Hãy mời thêm thành viên hoặc giải tán nhóm.`;

  const [memberTab, setMemberTab] = useState<'list' | 'pending'>('list');
  const [showInlineMembers, setShowInlineMembers] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [showConversationSearch, setShowConversationSearch] = useState(false);
  const [showMuteDurationModal, setShowMuteDurationModal] = useState(false);
  const [muteModalMode, setMuteModalMode] = useState<'create' | 'edit'>('create');
  const [muteModalSubmitting, setMuteModalSubmitting] = useState(false);
  const [leaveMemberModalOpen, setLeaveMemberModalOpen] = useState(false);
  const [leaveOwnerTransferOpen, setLeaveOwnerTransferOpen] = useState(false);
  const [transferOwnerOpen, setTransferOwnerOpen] = useState(false);
  const [selectedSuccessorId, setSelectedSuccessorId] = useState<string | null>(null);
  const [successorSearchQuery, setSuccessorSearchQuery] = useState('');
  const [deleteGroupModalOpen, setDeleteGroupModalOpen] = useState(false);
  const [bulletinAccordionOpen, setBulletinAccordionOpen] = useState(true);
  const [galleryKind, setGalleryKind] = useState<MessageGalleryKind | null>(null);
  const [galleryItems, setGalleryItems] = useState<MessageGalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [bulletinModalMode, setBulletinModalMode] = useState<null | 'reminders' | 'notesPolls'>(null);
  const showBulletinPollAdd = Boolean(onOpenPollModalFromPanel && canCreatePollFromBulletin);
  const showBulletinTaskAdd = Boolean(onOpenTaskModalFromPanel && canCreateTaskFromBulletin);
  const showBulletinAddMenu = bulletinModalMode === 'notesPolls' && (showBulletinPollAdd || showBulletinTaskAdd);
  const [bulletinTab, setBulletinTab] = useState<BulletinTab>('all');
  const [focusFlashNonce, setFocusFlashNonce] = useState(0);

  useEffect(() => {
    if (!focusTaskId) return;
    // Mở “nhắc hẹn / công việc” để user thấy task ngay.
    setBulletinModalMode('reminders');
    // Trigger highlight again
    setFocusFlashNonce((n) => n + 1);
    // Scroll after paint
    window.setTimeout(() => {
      const el = document.getElementById(`task-row-${focusTaskId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }, [focusTaskId, focusTaskNonce]);
  const [bulletinAddOpen, setBulletinAddOpen] = useState(false);
  const bulletinAddRef = useRef<HTMLDivElement>(null);

  const openConversationSearchHere = useCallback(() => {
    setShowInlineMembers(false);
    setGalleryKind(null);
    setBulletinModalMode(null);
    setBulletinAddOpen(false);
    setShowGroupManagement(false);
    setShowConversationSearch(true);
  }, []);

  const openMemberModalHere = useCallback(
    (tab: 'list' | 'pending') => {
      setMemberTab(tab);
      setShowInlineMembers(true);
      setShowGroupManagement(false);
      setShowConversationSearch(false);
      setGalleryKind(null);
      setBulletinModalMode(null);
      onOpenMemberModal?.(tab);
    },
    [],
  );

  const memberNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of members as Array<{ userId?: string; name?: string; displayName?: string }>) {
      if (!row?.userId) continue;
      const label = (row.displayName ?? row.name ?? '').trim();
      if (label) m.set(row.userId, label);
    }
    return m;
  }, [members]);

  /** Thành viên khác (không gồm bạn) — để chọn trưởng nhóm mới khi trưởng nhóm rời nhóm. */
  const successorCandidates = useMemo(() => {
    if (!currentUserId) return [] as Array<{ userId: string; label: string; role?: string; avatarUrl?: string | null }>;
    const out: Array<{ userId: string; label: string; role?: string; avatarUrl?: string | null }> = [];
    for (const row of members as Array<{
      userId?: string;
      name?: string;
      displayName?: string;
      role?: string;
      avatar?: string | null;
    }>) {
      if (!row?.userId || row.userId === currentUserId) continue;
      const label = (row.displayName ?? row.name ?? '').trim() || row.userId;
      const av = row.avatar?.trim();
      out.push({ userId: row.userId, label, role: row.role, avatarUrl: av || null });
    }
    return out;
  }, [members, currentUserId]);

  const filteredSuccessorCandidates = useMemo(() => {
    const q = successorSearchQuery.trim().toLowerCase();
    if (!q) return successorCandidates;
    return successorCandidates.filter(
      (c) => c.label.toLowerCase().includes(q) || c.userId.toLowerCase().includes(q),
    );
  }, [successorCandidates, successorSearchQuery]);

  const canConfirmOwnerLeave =
    !!selectedSuccessorId &&
    filteredSuccessorCandidates.some((c) => c.userId === selectedSuccessorId);
  const canConfirmOwnerTransfer = canConfirmOwnerLeave;

  const memberAvatarById = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of members as Array<{ userId?: string; avatar?: string }>) {
      if (!row?.userId || !row.avatar?.trim()) continue;
      m.set(row.userId, row.avatar.trim());
    }
    return m;
  }, [members]);

  /** ChatPage chỉ tải `members` cho nhóm; chat 1-1 cần 2 người để lọc “Người gửi” trong tìm kiếm. */
  const conversationSearchMembers = useMemo((): ConversationSearchMemberRow[] => {
    const fromGroup = members as ConversationSearchMemberRow[];
    if (fromGroup.length > 0) return fromGroup;
    if (!activeConversation || activeConversation.type === 'group') return [];
    const otherId = activeConversation.otherUserId?.trim();
    if (!otherId) return [];
    const rows: ConversationSearchMemberRow[] = [];
    const selfId = currentUserId?.trim();
    if (selfId) rows.push({ userId: selfId, displayName: 'Bạn' });
    const peerName = (activeConversation.name ?? '').trim();
    rows.push({ userId: otherId, displayName: peerName || null });
    return rows;
  }, [members, activeConversation, currentUserId]);

  const bulletinFeedItems = useMemo(() => {
    const items: BulletinFeedRow[] = [];
    for (const p of polls) {
      const at = p.createdAt ?? '';
      const preview = p.options
        .slice(0, 5)
        .map((o) => o.text?.trim())
        .filter(Boolean)
        .join(' · ');
      items.push({
        kind: 'poll',
        id: p.pollId,
        atMs: Date.parse(at) || 0,
        createdAt: p.createdAt,
        creatorId: p.creatorId,
        creatorName: resolveCreatorLabel(p.creatorId, p.creatorDisplayName, currentUserId, memberNameById),
        title: p.question,
        subtitle: preview,
        poll: p,
      });
    }
    for (const t of tasks) {
      const at = t.createdAt ?? '';
      const desc = (t.description ?? '').trim();
      items.push({
        kind: 'task',
        id: t.taskId,
        atMs: Date.parse(at) || 0,
        createdAt: t.createdAt,
        creatorId: t.creatorId,
        creatorName: resolveCreatorLabel(t.creatorId, t.creatorDisplayName, currentUserId, memberNameById),
        title: t.title,
        subtitle: desc,
        task: t,
      });
    }
    items.sort((a, b) => {
      if (b.atMs !== a.atMs) return b.atMs - a.atMs;
      return `${a.kind}-${a.id}`.localeCompare(`${b.kind}-${b.id}`);
    });
    return items;
  }, [polls, tasks, memberNameById, currentUserId]);

  const filteredBulletinItems = useMemo(() => {
    if (bulletinTab === 'all') return bulletinFeedItems;
    if (bulletinTab === 'polls') return bulletinFeedItems.filter((x) => x.kind === 'poll');
    if (bulletinTab === 'notes') return bulletinFeedItems.filter((x) => x.kind === 'task');
    return [];
  }, [bulletinFeedItems, bulletinTab]);

  const reminderFeedItems = useMemo(
    () => bulletinFeedItems.filter((x) => x.kind === 'task'),
    [bulletinFeedItems],
  );

  useEffect(() => {
    if (!bulletinAddOpen || bulletinModalMode !== 'notesPolls') return;
    const close = (e: MouseEvent) => {
      const el = bulletinAddRef.current;
      if (el && !el.contains(e.target as Node)) setBulletinAddOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [bulletinAddOpen, bulletinModalMode]);

  useEffect(() => {
    if (!bulletinModalMode && galleryKind === null && !showConversationSearch) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBulletinModalMode(null);
        setBulletinAddOpen(false);
        setGalleryKind(null);
        setShowConversationSearch(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bulletinModalMode, galleryKind, showConversationSearch]);

  useEffect(() => {
    setShowConversationSearch(false);
  }, [activeConversation?.conversationId]);

  useEffect(() => {
    if (!conversationSearchRequestTick) return;
    openConversationSearchHere();
  }, [conversationSearchRequestTick, openConversationSearchHere]);

  useEffect(() => {
    const convId = activeConversation?.conversationId;
    if (!galleryKind || !convId) return;
    let cancelled = false;
    setGalleryLoading(true);
    setGalleryError(null);
    void apiClient
      .get<ApiSuccessResponse<MessageGalleryItem[]>>(`/chat/conversations/${convId}/gallery`, {
        params: { category: galleryKind, limit: 120 },
      })
      .then((res: { data: ApiSuccessResponse<MessageGalleryItem[]> }) => {
        if (!cancelled) setGalleryItems(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setGalleryError('Không tải được danh sách.');
          setGalleryItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setGalleryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [galleryKind, activeConversation?.conversationId]);

  return (
    <div className="w-[280px] lg:w-[340px] h-full min-h-0 border-l border-black/5 dark:border-white/5 flex flex-col shrink-0 bg-white dark:bg-[#1a1a1a] overflow-hidden transition-all hidden md:flex">
      <div className="h-20 px-6 flex items-center justify-center border-b border-black/5 dark:border-white/5 font-bold text-lg sticky top-0 bg-inherit z-10 shrink-0">
        Thông tin {activeConversation?.type === 'group' ? 'nhóm' : 'hội thoại'}
      </div>

      {showInlineMembers ? (
        <div className="flex-1 min-h-0">
          <MemberManagementModal
            open={true}
            onClose={() => setShowInlineMembers(false)}
            memberTab={memberTab}
            onMemberTabChange={setMemberTab}
            members={members}
            requests={requests}
            currentUserId={core.currentUserId}
            onApprove={onApproveMember}
            onReject={onRejectMember}
            onKick={onKickMember}
            busy={busyMemberActionsResolved}
            variant="inline"
            canModerate={canModerateMembers}
            onAddMembersClick={groupActions.openAddMembersModal}
            groupId={activeConversation?.conversationId}
          />
        </div>
      ) : galleryKind !== null ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-full min-h-0 w-full flex-col bg-white dark:bg-[#1a1a1a]">
            <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  {galleryKind === 'media' ? (
                    <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : galleryKind === 'file' ? (
                    <File className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <h3 className="truncate text-[17px] font-bold text-black dark:text-white">
                  {galleryKind === 'media' ? 'Ảnh/Video' : galleryKind === 'file' ? 'File đã gửi' : 'Link đã gửi'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGalleryKind(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                title="Quay lại thông tin"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {galleryLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
              ) : galleryError ? (
                <p className="py-8 text-center text-sm text-red-500">{galleryError}</p>
              ) : galleryItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Chưa có mục nào trong lịch sử gần đây.</p>
              ) : (
                galleryItems.map((item) => {
                  const who = item.senderDisplayName?.trim() || 'Thành viên';
                  const when = formatBulletinFooterTime(item.createdAt);
                  if (galleryKind === 'link') {
                    const href = item.content?.trim() || '#';
                    return (
                      <a
                        key={item.messageId}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border border-black/[0.06] bg-white p-3 shadow-sm transition-colors hover:border-blue-600/25 dark:border-white/10 dark:bg-[#242424]"
                      >
                        <p className="line-clamp-2 break-all text-[13px] font-medium text-blue-600">{href}</p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {who} · {when || '—'}
                        </p>
                      </a>
                    );
                  }
                  if (galleryKind === 'file') {
                    const href = item.mediaUrl || '#';
                    const name = item.mediaOriginalName?.trim() || 'Tập tin';
                    return (
                      <a
                        key={item.messageId}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 rounded-xl border border-black/[0.06] bg-white p-3 shadow-sm transition-colors hover:border-blue-600/25 dark:border-white/10 dark:bg-[#242424]"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10">
                          <File className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">{name}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {who} · {when || '—'}
                          </p>
                        </div>
                      </a>
                    );
                  }
                  const src = item.thumbnailUrl || item.mediaUrl;
                  const isVideo = item.type === 'video' || (item.mediaType ?? '').startsWith('video/');
                  return (
                    <a
                      key={item.messageId}
                      href={item.mediaUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 rounded-xl border border-black/[0.06] bg-white p-2.5 shadow-sm transition-colors hover:border-blue-600/25 dark:border-white/10 dark:bg-[#242424]"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/10">
                        {src && !isVideo ? (
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        ) : src && isVideo ? (
                          <>
                            <img src={item.thumbnailUrl || src} alt="" className="h-full w-full object-cover" />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[10px] font-bold text-white">
                              ▶
                            </span>
                          </>
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                            Media
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="text-[13px] font-semibold">{who}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{when || '—'}</p>
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : bulletinModalMode !== null ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-full min-h-0 w-full flex-col bg-white dark:bg-[#1a1a1a]">
            <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  {bulletinModalMode === 'reminders' ? (
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <h3 className="truncate text-[17px] font-bold text-black dark:text-white">
                  {bulletinModalMode === 'reminders' ? 'Danh sách nhắc hẹn' : 'Ghi chú, ghim, bình chọn'}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {showBulletinAddMenu ? (
                  <div className="relative flex justify-end" ref={bulletinAddRef}>
                    <button
                      type="button"
                      onClick={() => setBulletinAddOpen((v) => !v)}
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                      aria-label="Thêm bình chọn hoặc công việc"
                      aria-expanded={bulletinAddOpen}
                    >
                      <Plus className="h-5 w-5" strokeWidth={2.2} />
                    </button>
                    {bulletinAddOpen && (
                      <div className="absolute right-0 top-full z-20 mt-1 min-w-[168px] rounded-xl border border-black/10 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[#2a2a2a]">
                        {showBulletinPollAdd ? (
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                            onClick={() => {
                              onOpenPollModalFromPanel?.();
                              setBulletinAddOpen(false);
                            }}
                          >
                            Tạo bình chọn
                          </button>
                        ) : null}
                        {showBulletinTaskAdd ? (
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                            onClick={() => {
                              onOpenTaskModalFromPanel?.();
                              setBulletinAddOpen(false);
                            }}
                          >
                            Tạo công việc
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setBulletinModalMode(null);
                    setBulletinAddOpen(false);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                  title="Quay lại thông tin"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {bulletinModalMode === 'reminders' ? (
              <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {loading?.tasks && reminderFeedItems.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Đang tải...</p>
                ) : reminderFeedItems.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Chưa có nhắc hẹn hay công việc.</p>
                ) : (
                  reminderFeedItems.map((item) => (
                    <BulletinCardRow
                      key={`${item.kind}-${item.id}`}
                      item={item}
                      memberAvatarById={memberAvatarById}
                      currentUserId={currentUserId}
                      onVotePoll={onVotePoll}
                      onOpenPollVote={onOpenPollVote}
                      onAddPollOption={onAddPollOption}
                      onClosePoll={onClosePoll}
                      onTaskJoined={onTaskJoined}
                      onEditTaskFromBulletin={onEditTaskFromBulletin}
                      onDeleteTaskFromBulletin={onDeleteTaskFromBulletin}
                      taskMutating={taskActionBusy}
                      focusTaskId={focusTaskId}
                      focusFlashNonce={focusFlashNonce}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 border-b border-black/5 px-1 text-[13px] font-semibold dark:border-white/5">
                  {(
                    [
                      { id: 'all' as const, label: 'Tất cả' },
                      { id: 'pinned' as const, label: 'Tin ghim' },
                      { id: 'notes' as const, label: 'Ghi chú' },
                      { id: 'polls' as const, label: 'Bình chọn' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBulletinTab(tab.id)}
                      className={`relative min-w-0 flex-1 py-2.5 text-center transition-colors ${
                        bulletinTab === tab.id
                          ? 'text-blue-600'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="block truncate px-0.5">{tab.label}</span>
                      {bulletinTab === tab.id && (
                        <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {bulletinTab === 'pinned' ? (
                    <p className="px-2 py-8 text-center text-[13px] text-muted-foreground">
                      Chưa có tin ghim trong hội thoại.
                    </p>
                  ) : bulletinTab === 'polls' && loading?.polls ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Đang tải bình chọn...</p>
                  ) : bulletinTab === 'notes' && loading?.tasks ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Đang tải...</p>
                  ) : bulletinTab === 'all' && (loading?.polls || loading?.tasks) && bulletinFeedItems.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Đang tải...</p>
                  ) : filteredBulletinItems.length === 0 ? (
                    <p className="px-2 py-8 text-center text-[13px] text-muted-foreground">
                      {bulletinTab === 'polls'
                        ? 'Chưa có bình chọn.'
                        : bulletinTab === 'notes'
                          ? 'Chưa có công việc.'
                          : 'Chưa có bình chọn hay công việc.'}
                    </p>
                  ) : (
                    filteredBulletinItems.map((item) => (
                      <BulletinCardRow
                        key={`${item.kind}-${item.id}`}
                        item={item}
                        memberAvatarById={memberAvatarById}
                        currentUserId={currentUserId}
                        onVotePoll={onVotePoll}
                        onOpenPollVote={onOpenPollVote}
                        onAddPollOption={onAddPollOption}
                        onClosePoll={onClosePoll}
                        onTaskJoined={onTaskJoined}
                        onEditTaskFromBulletin={onEditTaskFromBulletin}
                        onDeleteTaskFromBulletin={onDeleteTaskFromBulletin}
                        taskMutating={taskActionBusy}
                        focusTaskId={focusTaskId}
                        focusFlashNonce={focusFlashNonce}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : showConversationSearch ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <ConversationSearchPanel
            messages={conversationMessages}
            currentUserId={currentUserId}
            memberAvatarById={memberAvatarById}
            onClose={() => setShowConversationSearch(false)}
            onSelectMessage={(id) => onJumpToMessage?.(id)}
            conversationTitle={activeConversation?.name ?? undefined}
            conversationMembers={conversationSearchMembers}
            conversationId={activeConversation?.conversationId}
            conversations={conversations}
            onSelectConversation={onSelectConversation}
          />
        </div>
      ) : showGroupManagement && activeConversation?.type === 'group' ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <GroupManagementModal
            variant="inline"
            open
            onClose={() => setShowGroupManagement(false)}
            conversationId={activeConversation.conversationId}
            canEdit={canModerateMembers}
          />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto min-h-0 bg-black/5 dark:bg-transparent custom-scrollbar pb-12">
        <div className="p-6 flex flex-col items-center border-b border-black/5 dark:border-white/5 shrink-0 bg-white dark:bg-[#1a1a1a]">
          <div className="w-20 h-20 rounded-full overflow-hidden mb-4 relative bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            {activeConversation?.avatar ? (
              <img
                src={activeConversation.avatar}
                alt={activeConversation.name ?? ''}
                className="w-full h-full object-cover"
              />
            ) : activeConversation?.type === 'group' ? (
              <Users className="w-8 h-8 text-blue-600" />
            ) : (
              <User className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <h3 className="font-bold text-lg text-center leading-tight flex items-center gap-2">
            {activeConversation?.name ?? 'Hội thoại'}
            <button
              type="button"
              onClick={() => (onEditGroup ?? groupActions.openEditGroupModal)()}
              disabled={!!loading?.updateGroup}
              className="p-1 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Chỉnh sửa nhóm"
            >
              <Edit3 className="w-3 h-3 text-muted-foreground" />
            </button>
          </h3>
          {activeConversation?.type === 'group' && (
            <p className="text-sm text-muted-foreground mt-1 text-center font-medium opacity-80">
              {activeConversation.memberCount} thành viên
            </p>
          )}

          <div className="mt-4 w-full px-0.5">
            <div className="flex w-full flex-nowrap items-start justify-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => {
                if (isMuted) {
                  onToggleMuteNotifications?.();
                } else {
                  setMuteModalMode('create');
                  setShowMuteDurationModal(true);
                }
              }}
              disabled={isMuted ? !onToggleMuteNotifications : !onApplyMuteFromModal}
              className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-1.5 group disabled:opacity-40 disabled:pointer-events-none"
            >
              <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                {isMuted ? (
                  <BellOff className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                ) : (
                  <Bell className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">
                {isMuted ? (
                  <>
                    Bật thông
                    <br />
                    báo
                  </>
                ) : (
                  <>
                    Tắt thông
                    <br />
                    báo
                  </>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={onTogglePinConversation}
              disabled={!onTogglePinConversation}
              title="Ghim hoặc bỏ ghim hội thoại lên đầu danh sách"
              className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-1.5 group disabled:opacity-40 disabled:pointer-events-none"
            >
              <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                <Pin
                  className={`w-4 h-4 text-muted-foreground ${
                    isConvPinned ? 'opacity-100' : 'opacity-55'
                  } group-hover:opacity-100 group-hover:text-foreground`}
                  strokeWidth={isConvPinned ? 2 : 1.75}
                />
              </div>
              <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">
                {isConvPinned ? (
                  <>
                    Bỏ ghim
                    <br />
                    hội thoại
                  </>
                ) : (
                  <>
                    Ghim hội
                    <br />
                    thoại
                  </>
                )}
              </span>
            </button>
            {activeConversation?.type === 'group' ? (
              <button
                type="button"
                onClick={onAddMembers}
                disabled={!onAddMembers}
                className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-1.5 group disabled:opacity-40 disabled:pointer-events-none"
              >
                <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                  <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">
                  Thêm thành
                  <br />
                  viên
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenCreateGroup}
                disabled={!onOpenCreateGroup}
                className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-1.5 group disabled:opacity-40 disabled:pointer-events-none"
              >
                <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                  <Users className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">
                  Tạo nhóm
                  <br />
                  trò chuyện
                </span>
              </button>
            )}
            {activeConversation?.type === 'group' && (
              <button
                type="button"
                onClick={() => {
                  setShowInlineMembers(false);
                  setGalleryKind(null);
                  setBulletinModalMode(null);
                  setBulletinAddOpen(false);
                  setShowConversationSearch(false);
                  setShowGroupManagement(true);
                }}
                className="hidden min-w-0 flex-1 basis-0 flex-col items-center gap-1.5 group lg:flex"
                title="Quản lý nhóm"
              >
                <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
                  <Settings className="w-4 h-4 text-muted-foreground group-hover:text-black dark:group-hover:text-white" />
                </div>
                <span className="text-[10px] sm:text-[11px] text-center font-medium text-muted-foreground group-hover:text-black dark:group-hover:text-white">
                  Quản lý
                  <br />
                  nhóm
                </span>
              </button>
            )}
            </div>
            {hasActiveScheduledMute && onApplyMuteFromModal ? (
              <div className="mt-3 w-full rounded-xl border border-blue-500/20 bg-blue-500/[0.07] px-3 py-3 dark:border-blue-400/25 dark:bg-blue-500/10">
                <p className="text-[11px] font-semibold text-muted-foreground">Nhắc tắt thông báo đến</p>
                <p className="mt-1 text-[13px] font-bold text-foreground">
                  {new Date(scheduledMuteUntil).toLocaleString('vi-VN')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={muteModalSubmitting}
                    onClick={() => {
                      setMuteModalMode('edit');
                      setShowMuteDurationModal(true);
                    }}
                    className="rounded-lg bg-[#0068ff] px-3 py-1.5 text-[12px] font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    disabled={muteModalSubmitting}
                    onClick={() => {
                      void (async () => {
                        setMuteModalSubmitting(true);
                        try {
                          await onApplyMuteFromModal({ kind: 'clearScheduledMute' });
                        } catch {
                          /* toast ở ChatPage */
                        } finally {
                          setMuteModalSubmitting(false);
                        }
                      })();
                    }}
                    className="rounded-lg border border-red-500/35 bg-white px-3 py-1.5 text-[12px] font-bold text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:bg-zinc-900 dark:text-red-400"
                  >
                    Hủy lịch
                  </button>
                </div>
              </div>
            ) : null}
          </div>

        </div>
        {activeConversation?.type === 'group' && (
          <>

            <div className="p-4 bg-gradient-to-r from-blue-600/5 to-purple-600/5 border-b border-black/5 dark:border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl group-hover:opacity-30 transition-opacity">
                <Sparkles className="w-16 h-16 text-purple-600" />
              </div>
              <button
                type="button"
                onClick={() => onOpenAISummaryFromPanel()}
                className="w-full relative flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0068ff] to-[#8c52ff] hover:from-blue-700 hover:to-purple-700 text-white font-bold text-[14px] shadow-lg shadow-purple-600/20 transition-all hover:shadow-purple-600/40 hover:-translate-y-0.5"
              >
                <Sparkles className="w-[18px] h-[18px]" />
                AI tóm tắt toàn bộ tin nhắn
              </button>
              <p className="text-[11px] text-center mt-2 text-muted-foreground font-medium">
                Báo cáo siêu tốc những nội dung bị trôi.
              </p>
            </div>

            <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 bg-white dark:bg-transparent">
              <button
                type="button"
                onClick={() => {
                  if (onRequestJoin) void onRequestJoin();
                  else void groupActions.handleRequestJoin();
                }}
                disabled={isJoinRequested || !!loading?.requestJoin}
                className="w-full rounded-xl py-2.5 text-sm font-bold bg-blue-600 text-white disabled:bg-blue-200 disabled:cursor-not-allowed"
              >
                {isJoinRequested ? 'Đã gửi yêu cầu' : loading?.requestJoin ? 'Đang gửi...' : 'Yêu cầu tham gia'}
              </button>
            </div>

            <div className="bg-white dark:bg-transparent border-b border-black/5 dark:border-white/5">
              <div
                role="button"
                tabIndex={0}
                onClick={() => openMemberModalHere('list')}
                onKeyDown={(e) => e.key === 'Enter' && openMemberModalHere('list')}
                className="p-4 flex items-center justify-between font-bold text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Quản lý thành viên ({activeConversation.memberCount})
                <div className="flex items-center gap-2">
                  {(numRequests ?? 0) > 0 && (
                    <div className="w-[20px] h-[20px] rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white font-bold">
                      {numRequests}
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="px-4 pb-4 space-y-1">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openMemberModalHere('pending')}
                  onKeyDown={(e) => e.key === 'Enter' && openMemberModalHere('pending')}
                  className="flex items-center justify-between group/wait cursor-pointer p-2 -mx-2 rounded-lg hover:bg-blue-600/10 transition-colors"
                >
                  <div className="flex items-center gap-3 text-sm text-muted-foreground group-hover/wait:text-blue-600 font-medium transition-colors">
                    <UserPlus className="w-4 h-4 opacity-70" /> Duyệt người vào nhóm
                  </div>
                  {(numRequests ?? 0) > 0 && (
                    <div className="w-[22px] h-[22px] rounded-full bg-red-500 shadow-md shadow-red-500/20 flex items-center justify-center text-[10px] text-white font-bold">
                      {numRequests}
                    </div>
                  )}
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openMemberModalHere('list')}
                  onKeyDown={(e) => e.key === 'Enter' && openMemberModalHere('list')}
                  className="flex items-center gap-3 text-sm text-muted-foreground hover:text-red-500 cursor-pointer hover:bg-red-500/10 p-2 -mx-2 rounded-lg transition-colors font-medium"
                >
                  <Users className="w-4 h-4 opacity-70" /> Mời ra khỏi nhóm
                </div>
              </div>
            </div>
          </>
        )}
        <div className="mt-2 border-b border-black/5 bg-white dark:border-white/5 dark:bg-transparent">
          <button
            type="button"
            onClick={() => setBulletinAccordionOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 p-4 text-left text-sm font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${bulletinAccordionOpen ? '' : '-rotate-90'}`}
                aria-hidden
              />
              Bảng tin nhóm
            </span>
          </button>
          {bulletinAccordionOpen && (
            <div className="pb-2">
              <button
                type="button"
                onClick={() => {
                  setGalleryKind(null);
                  setBulletinAddOpen(false);
                  setShowConversationSearch(false);
                  setBulletinModalMode('reminders');
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <Clock className="h-4 w-4 shrink-0 opacity-70" />
                Danh sách nhắc hẹn
              </button>
              <button
                type="button"
                onClick={() => {
                  setGalleryKind(null);
                  setBulletinAddOpen(false);
                  setShowConversationSearch(false);
                  setBulletinTab('all');
                  setBulletinModalMode('notesPolls');
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <FileText className="h-4 w-4 shrink-0 opacity-70" />
                Ghi chú, ghim, bình chọn
              </button>
            </div>
          )}
        </div>

        <div className="mt-2 border-b border-black/5 bg-white dark:border-white/5 dark:bg-transparent">
          <button
            type="button"
            disabled={!activeConversation?.conversationId}
            onClick={() => {
              setBulletinModalMode(null);
              setBulletinAddOpen(false);
              setShowConversationSearch(false);
              setGalleryKind('media');
            }}
            className="flex w-full cursor-pointer items-center justify-between p-4 text-left text-sm font-bold transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/5"
          >
            Ảnh/Video
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="border-b border-black/5 bg-white dark:border-white/5 dark:bg-transparent">
          <button
            type="button"
            disabled={!activeConversation?.conversationId}
            onClick={() => {
              setBulletinModalMode(null);
              setBulletinAddOpen(false);
              setShowConversationSearch(false);
              setGalleryKind('file');
            }}
            className="flex w-full cursor-pointer items-center justify-between p-4 text-left text-sm font-bold transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/5"
          >
            File
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="border-b border-black/5 bg-white dark:border-white/5 dark:bg-transparent">
          <button
            type="button"
            disabled={!activeConversation?.conversationId}
            onClick={() => {
              setBulletinModalMode(null);
              setBulletinAddOpen(false);
              setShowConversationSearch(false);
              setGalleryKind('link');
            }}
            className="flex w-full cursor-pointer items-center justify-between p-4 text-left text-sm font-bold transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/5"
          >
            Link
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {activeConversation?.type === 'group' && !activeConversation.isDeleted && (
          <div className="p-4 bg-white dark:bg-transparent mt-2 flex flex-col gap-2 justify-center">
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  if (successorCandidates.length === 0) {
                    toast.warning('Không còn thành viên khác để chuyển quyền. Hãy giải tán nhóm.');
                    return;
                  }
                  setSuccessorSearchQuery('');
                  setSelectedSuccessorId(successorCandidates[0]!.userId);
                  setTransferOwnerOpen(true);
                }}
                disabled={!onTransferGroupOwner || busyMemberActionsResolved.changingRole}
                className="flex items-center justify-center gap-2 text-sm font-bold text-[#0068ff] hover:bg-blue-500/10 px-4 py-2 rounded-xl transition-colors border border-[#0068ff]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Chuyển quyền trưởng nhóm"
              >
                {busyMemberActionsResolved.changingRole ? 'Đang xử lý…' : 'Chuyển quyền trưởng nhóm'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (leaveBlockedByMinMembers) {
                  toast.warning(leaveMinMembersHint);
                  return;
                }
                if (isOwner) {
                  if (successorCandidates.length === 0) {
                    toast.warning('Không còn thành viên khác để chuyển quyền. Hãy giải tán nhóm.');
                    return;
                  }
                  setSuccessorSearchQuery('');
                  setSelectedSuccessorId(successorCandidates[0]!.userId);
                  setLeaveOwnerTransferOpen(true);
                  return;
                }
                setLeaveMemberModalOpen(true);
              }}
              disabled={!onLeaveGroup || loading?.leaveGroup}
              className={`flex items-center justify-center gap-2 text-sm font-bold text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${leaveBlockedByMinMembers ? 'opacity-60' : ''}`}
              title={leaveBlockedByMinMembers ? leaveMinMembersHint : 'Rời khỏi nhóm này'}
            >
              {loading?.leaveGroup ? 'Đang xử lý…' : 'Rời nhóm'}
            </button>
            {canDisbandGroup && (
              <button
                type="button"
                onClick={() => setDeleteGroupModalOpen(true)}
                disabled={!onDeleteGroup || loading?.deleteGroup}
                className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading?.deleteGroup ? 'Đang xử lý…' : 'Giải tán nhóm'}
              </button>
            )}
          </div>
        )}
      </div>
      )}

      <ConfirmModal
        open={leaveMemberModalOpen}
        title="Rời nhóm?"
        description="Bạn sẽ rời khỏi nhóm và không còn nhận tin nhắn từ nhóm này."
        confirmLabel="Rời nhóm"
        variant="danger"
        isConfirming={!!loading?.leaveGroup}
        onClose={() => {
          if (!loading?.leaveGroup) setLeaveMemberModalOpen(false);
        }}
        onConfirm={() => {
          void (async () => {
            if (!onLeaveGroup) return;
            try {
              await onLeaveGroup();
              setLeaveMemberModalOpen(false);
            } catch {
              /* lỗi đã toast ở ChatPage */
            }
          })();
        }}
      />

      <AnimatePresence>
        {leaveOwnerTransferOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
            role="presentation"
            onClick={() => !loading?.leaveGroup && setLeaveOwnerTransferOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="leave-owner-transfer-title"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="max-h-[min(520px,85vh)] w-full max-w-[440px] overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#1a1a1a]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 dark:border-white/5">
                <h3 id="leave-owner-transfer-title" className="text-[17px] font-bold text-foreground">
                  Chọn trưởng nhóm mới trước khi rời
                </h3>
                <button
                  type="button"
                  disabled={!!loading?.leaveGroup}
                  onClick={() => setLeaveOwnerTransferOpen(false)}
                  className="text-muted-foreground transition-colors hover:text-black disabled:opacity-50 dark:hover:text-white"
                >
                  <X className="h-6 w-6 stroke-[1.5]" />
                </button>
              </div>
              <div className="px-6 pb-2 pt-1">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={successorSearchQuery}
                    onChange={(e) => setSuccessorSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm"
                    disabled={!!loading?.leaveGroup}
                    className="w-full rounded-xl border border-black/10 bg-black/[0.04] py-2.5 pl-10 pr-3 text-[15px] text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-[#0068ff]/40 focus:ring-2 focus:ring-[#0068ff]/25 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06]"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="max-h-[min(340px,50vh)] overflow-y-auto px-6 py-2">
                <fieldset className="space-y-1">
                  <legend className="sr-only">Chọn thành viên nhận quyền trưởng nhóm</legend>
                  {filteredSuccessorCandidates.length === 0 ? (
                    <p className="py-6 text-center text-[14px] font-medium text-muted-foreground">
                      Không tìm thấy thành viên
                    </p>
                  ) : (
                    filteredSuccessorCandidates.map((c) => (
                      <label
                        key={c.userId}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      >
                        <input
                          type="radio"
                          name="leave-group-successor"
                          value={c.userId}
                          checked={selectedSuccessorId === c.userId}
                          onChange={() => setSelectedSuccessorId(c.userId)}
                          disabled={!!loading?.leaveGroup}
                          className="h-4 w-4 shrink-0 accent-[#0068ff]"
                        />
                        <SuccessorPickAvatar url={c.avatarUrl} label={c.label} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-[15px] font-medium text-foreground">{c.label}</span>
                          {c.role === 'admin' ? (
                            <span className="text-xs font-medium text-muted-foreground">Phó nhóm</span>
                          ) : null}
                        </span>
                      </label>
                    ))
                  )}
                </fieldset>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-black/5 px-6 py-4 dark:border-white/5">
                <button
                  type="button"
                  disabled={!!loading?.leaveGroup}
                  onClick={() => setLeaveOwnerTransferOpen(false)}
                  className="rounded-lg bg-black/5 px-6 py-2.5 text-[15px] font-bold text-black transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!!loading?.leaveGroup || !canConfirmOwnerLeave || !onLeaveGroup}
                  onClick={() => {
                    void (async () => {
                      if (!onLeaveGroup || !selectedSuccessorId) return;
                      try {
                        await onLeaveGroup({ newOwnerUserId: selectedSuccessorId });
                        setLeaveOwnerTransferOpen(false);
                      } catch {
                        /* lỗi đã toast ở ChatPage */
                      }
                    })();
                  }}
                  className="rounded-lg bg-[#0068ff] px-6 py-2.5 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading?.leaveGroup ? 'Đang xử lý…' : 'Chọn và tiếp tục'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {transferOwnerOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
            role="presentation"
            onClick={() => !busyMemberActionsResolved.changingRole && setTransferOwnerOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="transfer-owner-title"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="max-h-[min(520px,85vh)] w-full max-w-[440px] overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#1a1a1a]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 dark:border-white/5">
                <h3 id="transfer-owner-title" className="text-[17px] font-bold text-foreground">
                  Chuyển quyền trưởng nhóm
                </h3>
                <button
                  type="button"
                  disabled={busyMemberActionsResolved.changingRole}
                  onClick={() => setTransferOwnerOpen(false)}
                  className="text-muted-foreground transition-colors hover:text-black disabled:opacity-50 dark:hover:text-white"
                >
                  <X className="h-6 w-6 stroke-[1.5]" />
                </button>
              </div>
              <div className="px-6 pt-3">
                <p className="text-[13px] text-muted-foreground">
                  Bạn sẽ trở thành <span className="font-bold text-foreground">phó nhóm</span> sau khi chuyển quyền.
                </p>
              </div>
              <div className="px-6 pb-2 pt-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={successorSearchQuery}
                    onChange={(e) => setSuccessorSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm"
                    disabled={busyMemberActionsResolved.changingRole}
                    className="w-full rounded-xl border border-black/10 bg-black/[0.04] py-2.5 pl-10 pr-3 text-[15px] text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-[#0068ff]/40 focus:ring-2 focus:ring-[#0068ff]/25 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06]"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="max-h-[min(340px,50vh)] overflow-y-auto px-6 py-2">
                <fieldset className="space-y-1">
                  <legend className="sr-only">Chọn thành viên nhận quyền trưởng nhóm</legend>
                  {filteredSuccessorCandidates.length === 0 ? (
                    <p className="py-6 text-center text-[14px] font-medium text-muted-foreground">
                      Không tìm thấy thành viên
                    </p>
                  ) : (
                    filteredSuccessorCandidates.map((c) => (
                      <label
                        key={c.userId}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      >
                        <input
                          type="radio"
                          name="transfer-owner-successor"
                          value={c.userId}
                          checked={selectedSuccessorId === c.userId}
                          onChange={() => setSelectedSuccessorId(c.userId)}
                          disabled={busyMemberActionsResolved.changingRole}
                          className="h-4 w-4 shrink-0 accent-[#0068ff]"
                        />
                        <SuccessorPickAvatar url={c.avatarUrl} label={c.label} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-[15px] font-medium text-foreground">{c.label}</span>
                          {c.role === 'admin' ? (
                            <span className="text-xs font-medium text-muted-foreground">Phó nhóm</span>
                          ) : null}
                        </span>
                      </label>
                    ))
                  )}
                </fieldset>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-black/5 px-6 py-4 dark:border-white/5">
                <button
                  type="button"
                  disabled={busyMemberActionsResolved.changingRole}
                  onClick={() => setTransferOwnerOpen(false)}
                  className="rounded-lg bg-black/5 px-6 py-2.5 text-[15px] font-bold text-black transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={
                    busyMemberActionsResolved.changingRole ||
                    !canConfirmOwnerTransfer ||
                    !onTransferGroupOwner ||
                    !selectedSuccessorId
                  }
                  onClick={() => {
                    void (async () => {
                      if (!onTransferGroupOwner || !selectedSuccessorId) return;
                      try {
                        await onTransferGroupOwner(selectedSuccessorId);
                        setTransferOwnerOpen(false);
                      } catch {
                        /* lỗi đã toast ở ChatPage */
                      }
                    })();
                  }}
                  className="rounded-lg bg-[#0068ff] px-6 py-2.5 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {busyMemberActionsResolved.changingRole ? 'Đang xử lý…' : 'Chuyển quyền'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmModal
        open={deleteGroupModalOpen}
        title="Giải tán nhóm"
        description={
          <>
            Mời tất cả mọi người rời nhóm và xóa tin nhắn? Nhóm đã giải tán sẽ{' '}
            <span className="font-bold text-foreground">KHÔNG THỂ</span> khôi phục.
          </>
        }
        cancelLabel="Không"
        confirmLabel="Giải tán nhóm"
        variant="dangerSoft"
        isConfirming={!!loading?.deleteGroup}
        onClose={() => {
          if (!loading?.deleteGroup) setDeleteGroupModalOpen(false);
        }}
        onConfirm={() => {
          void (async () => {
            if (!onDeleteGroup) return;
            try {
              await onDeleteGroup();
              setDeleteGroupModalOpen(false);
            } catch {
              /* lỗi đã toast ở ChatPage */
            }
          })();
        }}
      />
      <MuteNotificationsModal
        open={showMuteDurationModal}
        mode={muteModalMode}
        scheduledUntilIso={muteModalMode === 'edit' ? scheduledMuteUntil || null : null}
        onClose={() => {
          if (!muteModalSubmitting) {
            setShowMuteDurationModal(false);
            setMuteModalMode('create');
          }
        }}
        isSubmitting={muteModalSubmitting}
        onConfirm={async (payload) => {
          if (!onApplyMuteFromModal) return;
          setMuteModalSubmitting(true);
          try {
            await onApplyMuteFromModal(payload);
            setShowMuteDurationModal(false);
            setMuteModalMode('create');
          } catch {
            /* lỗi API: giữ modal mở */
          } finally {
            setMuteModalSubmitting(false);
          }
        }}
      />
    </div>
  );
}
