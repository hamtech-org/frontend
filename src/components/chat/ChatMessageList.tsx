import { useState, useCallback, useEffect, type Ref } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlarmClock,
  AlarmClockOff,
  Check,
  CheckCheck,
  ClipboardList,
  BarChart2,
  Download,
  FileText,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Pin,
  Pencil,
  Reply,
  RotateCcw,
  SmilePlus,
  Trash2,
  Users,
  Video,
  Maximize2,
  FolderOpen,
  CircleCheck,
  Image as LucideImage,
} from 'lucide-react';
import type { IConversation, IMessage, IReplyToDetails, MessageStatus } from '@/types/chat.types';
import type { TypingUserEntry } from '@/types/chat.types';
import { formatTime, formatDate } from '@/utils/formatDate';
import { isTaskJoinDeadlinePassed, typingLabel } from '@/utils/chatUtils';
import { AuthenticatedMedia } from '@/components/chat/AuthenticatedMedia';
import { ZaloStyleAvatar } from '@/components/chat/ZaloStyleAvatar';
import { MediaLightbox } from '@/components/chat/MediaLightbox';
import { ImageMessageContextMenu } from '@/components/chat/ImageMessageContextMenu';
import { ForwardMediaPickerModal } from '@/components/chat/ForwardMediaPickerModal';
import { formatFileSize } from '@/utils/fileHelper';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { TaskDeadlineCalendar } from '@/components/chat/TaskDeadlineCalendar';

async function downloadAuthedFile(url: string, filename: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || 'file';
    a.click();
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    return false;
  }
}

/** Trạng thái gửi/nhận/đã xem (Zalo) — chỉ tin của mình; nhóm chỉ hiện «đã gửi». */
function OutgoingDeliveryTicks({
  status,
  convIsDirect,
  isMe,
}: {
  status?: MessageStatus;
  convIsDirect: boolean;
  isMe: boolean;
}) {
  const s = status ?? 'sent';
  if (!convIsDirect) {
    const mono = isMe ? 'text-white/75' : 'text-muted-foreground';
    return <Check className={`w-3 h-3 shrink-0 ${mono}`} strokeWidth={2.5} aria-label="Đã gửi" />;
  }
  if (s === 'sent') {
    return (
      <Check
        className={`w-3 h-3 shrink-0 ${isMe ? 'text-white/75' : 'text-muted-foreground'}`}
        strokeWidth={2.5}
        aria-label="Đã gửi"
      />
    );
  }
  if (s === 'delivered') {
    return (
      <CheckCheck
        className={`w-3 h-3 shrink-0 ${isMe ? 'text-white/85' : 'text-slate-400 dark:text-slate-500'}`}
        strokeWidth={2.5}
        aria-label="Đã nhận"
      />
    );
  }
  return (
    <CheckCheck
      className={`w-3 h-3 shrink-0 ${isMe ? 'text-sky-200' : 'text-blue-500 dark:text-blue-400'}`}
      strokeWidth={2.5}
      aria-label="Đã xem"
    />
  );
}

function isRichMediaMessage(msg: IMessage): boolean {
  return msg.type === 'image' || msg.type === 'video' || msg.type === 'file';
}

/** Zalo: không ghim tin đã thu hồi / xóa / system. */
function canPinMessage(msg: IMessage): boolean {
  if (msg.isDeleted || msg.isRecalled) return false;
  if ((msg as { type?: string }).type === 'system') return false;
  return true;
}

/** Menu ⋯: không hiện «Sửa» với ảnh / video / file (chỉ tin thuần chữ). */
function canShowEditInMessageOverflowMenu(msg: IMessage): boolean {
  return !isRichMediaMessage(msg) && msg.type === 'text';
}

function messageHasCaption(msg: IMessage): boolean {
  return (msg.content ?? '').trim().length > 0;
}

/** Dòng preview tin đang trả lời — không dùng [Media], hạn chế [] / JSON. */
function replyQuotePreview(details: IReplyToDetails): string {
  const c0 = (details.content ?? '').trim();
  if (c0.includes('không khả dụng')) return 'Tin nhắn không khả dụng';
  if (c0.includes('Tin nhắn đã được thu hồi') || (c0.includes('thu hồi') && c0.length < 48)) {
    return 'Tin nhắn đã được thu hồi';
  }

  const ty = details.type;
  if (ty === 'image') return 'Hình ảnh';
  if (ty === 'video') return 'Video';
  if (ty === 'file') return 'Tệp tin';

  let s = (details.content ?? '').trim();
  if (!s) return 'Tin nhắn';
  if (/^\[(media|ảnh|video|file|hình ảnh|Ảnh)\]$/i.test(s)) {
    return 'Tin nhắn';
  }
  if (s.startsWith('{') && s.endsWith('}')) {
    try {
      JSON.parse(s);
      return 'Tin nhắn';
    } catch {
      /* không phải JSON hợp lệ — hiển thị đã làm sạch bên dưới */
    }
  }
  s = s
    .replace(/[[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s || 'Tin nhắn';
}

/** URL ảnh nhỏ trong dải trích dẫn (từ replyToDetails). */
function replyPreviewThumbSrc(details: IReplyToDetails): string | null {
  const full = details.mediaUrl ?? '';
  const thumb = details.thumbnailUrl ?? '';
  const mime = (details.mediaType ?? '').toLowerCase();
  if (details.type === 'image') {
    if (!full && !thumb) return null;
    if (mime.includes('heic') || mime.includes('heif')) return thumb || full || null;
    return full || thumb || null;
  }
  if (details.type === 'video') {
    return thumb || full || null;
  }
  return null;
}

/** Dòng phụ: chú thích media hoặc toàn bộ tin text; ẩn khi chỉ placeholder []. */
function replyQuoteSecondaryLine(details: IReplyToDetails): string | null {
  const c0 = (details.content ?? '').trim();
  if (c0.includes('không khả dụng')) return replyQuotePreview(details);
  if (c0.includes('Tin nhắn đã được thu hồi') || (c0.includes('thu hồi') && c0.length < 48)) {
    return replyQuotePreview(details);
  }

  const ty = details.type;
  if (ty === 'text' || ty === 'emoji' || ty === 'sticker' || ty === 'poll' || ty === 'call') {
    return replyQuotePreview(details);
  }

  const c = (details.content ?? '').trim();
  if (!c || c === ' ') return null;
  if (/^\[(media|ảnh|video|file|hình ảnh|Ảnh)\]$/i.test(c)) return null;
  if (c.startsWith('{') && c.endsWith('}')) {
    try {
      JSON.parse(c);
      return null;
    } catch {
      /* */
    }
  }
  const cleaned = c
    .replace(/[[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
}

type ReplyQuoteStripProps = {
  details: IReplyToDetails;
  isMe: boolean;
  isMediaMsg: boolean;
  isWideMediaBubble: boolean;
  onNavigate: () => void;
};

function ReplyQuoteStrip({
  details,
  isMe,
  isMediaMsg,
  isWideMediaBubble,
  onNavigate,
}: ReplyQuoteStripProps) {
  const thumbSrc = replyPreviewThumbSrc(details);
  const secondary = replyQuoteSecondaryLine(details);
  const name = details.senderDisplayName ?? details.senderId;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate();
        }
      }}
      className={`mb-1.5 flex flex-row gap-2.5 items-center px-2.5 py-2 rounded-lg border-l-4 cursor-pointer transition-colors ${
        isMediaMsg ? `w-full ${isWideMediaBubble ? 'max-w-full' : 'max-w-[min(100%,20rem)]'}` : ''
      } ${
        isMe && !isMediaMsg
          ? 'bg-white/10 border-white/30 hover:bg-white/20'
          : 'bg-black/5 border-blue-500/50 hover:bg-black/10 dark:hover:bg-white/5'
      }`}
    >
      <div className="shrink-0">
        {details.type === 'image' && thumbSrc ? (
          <div className="w-11 h-11 rounded-lg overflow-hidden bg-black/10 ring-1 ring-black/10 dark:ring-white/10">
            <AuthenticatedMedia
              src={thumbSrc}
              kind="image"
              className="h-full w-full object-cover"
              alt=""
            />
          </div>
        ) : details.type === 'image' ? (
          <div className="w-11 h-11 rounded-lg bg-slate-200/90 dark:bg-slate-700/90 flex items-center justify-center ring-1 ring-black/10">
            <LucideImage className="w-5 h-5 text-slate-500 dark:text-slate-400" aria-hidden />
          </div>
        ) : details.type === 'video' && thumbSrc ? (
          <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-zinc-900 ring-1 ring-black/10">
            <AuthenticatedMedia
              src={thumbSrc}
              kind="image"
              className="h-full w-full object-cover"
              alt=""
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
              <Video className="w-5 h-5 text-white drop-shadow-md" aria-hidden />
            </div>
          </div>
        ) : details.type === 'video' ? (
          <div className="w-11 h-11 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center ring-1 ring-black/5">
            <Video className="w-5 h-5 text-violet-600 dark:text-violet-400" aria-hidden />
          </div>
        ) : details.type === 'file' ? (
          <div className="w-11 h-11 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center ring-1 ring-black/5">
            <FileText className="w-5 h-5 text-amber-700 dark:text-amber-400" aria-hidden />
          </div>
        ) : (
          <ZaloStyleAvatar
            userId={details.senderId}
            displayName={name}
            avatarUrl={null}
            className="w-11 h-11"
          />
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p
          className={`text-[10px] font-bold truncate ${
            isMe && !isMediaMsg ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
          }`}
        >
          {name}
        </p>
        {secondary ? (
          <p
            className={`text-[11px] mt-0.5 line-clamp-2 opacity-85 ${
              isMe && !isMediaMsg ? 'text-white' : 'text-foreground'
            }`}
          >
            {secondary}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Ưu tiên ảnh gốc (mediaUrl); HEIC/HEIF dùng thumbnail JPEG vì thẻ img không hiển thị gốc. */
function imageDisplaySrc(msg: IMessage): string {
  const full = msg.mediaUrl ?? '';
  const thumb = msg.thumbnailUrl ?? '';
  const mime = (msg.mediaType ?? '').toLowerCase();
  if (mime.includes('heic') || mime.includes('heif')) {
    return thumb || full;
  }
  return full || thumb;
}

type CallLogContent =
  | {
      kind: 'completed' | 'missed' | 'rejected' | 'cancelled';
      callType: 'audio' | 'video';
      durationSec?: number;
      scope?: string;
      reason?: string;
    }
  | Record<string, unknown>;

export type ChatMessageListProps = {
  messagesContainerRef: Ref<HTMLDivElement>;
  messagesEndRef: Ref<HTMLDivElement>;
  allMessages: IMessage[];
  activeConversationId: string | null;
  activeConversation: IConversation | undefined;
  currentUserId: string;
  typingUsers: TypingUserEntry[];
  unreadIncomingCount: number;
  actionMenuMsgId: string | null;
  onActionMenuMsgIdChange: (id: string | null) => void;
  onStartEdit: (msg: IMessage) => void;
  onTogglePin: (msg: IMessage) => void;
  onRecall: (msg: IMessage) => void;
  onDelete: (msg: IMessage) => void;
  onReply: (msg: IMessage) => void;
  onReact: (msg: IMessage, emoji: string) => void;
  onJumpToLatest: () => void;
  groupTasks?: any[];
  groupMembers?: Array<{ userId: string; displayName?: string | null; avatar?: string | null }>;
  onTaskJoined?: (taskId: string) => void;
  onOpenPollVote?: (pollId: string) => void;
  /** Đánh dấu + hiệu ứng khi nhảy tới tin (ghim, tìm tin, …). */
  jumpHighlightMessageId?: string | null;
  /** Tăng mỗi lần nhảy tới tin để animation highlight chạy lại. */
  jumpFlashNonce?: number;
  /** Cuộn tới tin + bật highlight (ưu tiên hơn scroll nội bộ — dùng cho trích dẫn trả lời). */
  onJumpToMessage?: (messageId: string) => void;
  /** Danh sách hội thoại để gửi tiếp ảnh/video sang chat khác. */
  shareTargetConversations: IConversation[];
  onForwardMediaMessage: (
    targetConversationIds: string[],
    message: IMessage,
    caption: string,
  ) => Promise<void>;
  onEditGroupTask?: (taskId: string) => void;
  onDeleteGroupTask?: (taskId: string) => void;
};

export function ChatMessageList({
  messagesContainerRef,
  messagesEndRef,
  allMessages,
  activeConversationId,
  activeConversation,
  currentUserId,
  typingUsers,
  actionMenuMsgId,
  onActionMenuMsgIdChange,
  onStartEdit,
  onTogglePin,
  onRecall,
  onDelete,
  onReply,
  onReact,
  groupTasks,
  groupMembers,
  onTaskJoined,
  onOpenPollVote,
  jumpHighlightMessageId = null,
  jumpFlashNonce = 0,
  onJumpToMessage,
  shareTargetConversations,
  onForwardMediaMessage,
  onEditGroupTask,
  onDeleteGroupTask,
}: ChatMessageListProps) {
  // Prevent duplicated task cards (optimistic tmp + server/system duplicates).
  const seenTaskAssignedIds = new Set<string>();

  /** Map userId → avatar URL (dùng cho ZaloStyleAvatar trong bubble). */
  const memberAvatarMap = new Map<string, string | null>();
  for (const m of groupMembers ?? []) {
    memberAvatarMap.set(m.userId, m.avatar ?? null);
  }
  /** Fallback cho direct chat: avatar người kia = activeConversation.avatar. */
  const directOtherAvatar =
    activeConversation?.type === 'direct' ? (activeConversation.avatar ?? null) : null;

  const scrollToMessage = (messageId: string) => {
    if (onJumpToMessage) {
      onJumpToMessage(messageId);
      return;
    }
    document.getElementById(`chat-msg-${messageId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const [hiddenReactPopupId, setHiddenReactPopupId] = useState<string | null>(null);
  const [mediaLightbox, setMediaLightbox] = useState<{
    src: string;
    kind: 'image' | 'video';
  } | null>(null);
  /** Tin nhắn đã bấm tải file về máy trong phiên (hiện “Đã có trên máy”). */
  const [downloadedMediaIds, setDownloadedMediaIds] = useState<Set<string>>(() => new Set());

  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [taskDetailTaskId, setTaskDetailTaskId] = useState<string | null>(null);
  const [taskDetail, setTaskDetail] = useState<{
    title: string;
    note?: string | null;
    dueDate?: string | null;
    assigneeLabel?: string;
    participantsCount?: number;
    participantIds?: string[];
    actorLabel?: string;
    subtasks?: { assigneeName?: string; content?: string; done?: boolean }[];
  } | null>(null);

  const handleTaskDetailDialogOpenChange = useCallback((open: boolean) => {
    setTaskDetailOpen(open);
    if (!open) {
      setTaskDetail(null);
      setTaskDetailTaskId(null);
    }
  }, []);

  const openTaskDetailById = useCallback(
    (
      taskId: string,
      opts?: {
        actorLabel?: string;
        fallback?: {
          title?: string;
          dueDate?: string | null;
          note?: string | null;
          subtasks?: any[];
        };
      },
    ) => {
      const id = String(taskId ?? '').trim();
      if (!id) return;

      const t = (groupTasks ?? []).find((x: any) => String(x?.taskId) === id) as any;
      const nameById = new Map(
        (groupMembers ?? []).map((m) => [
          String(m.userId),
          String(m.displayName ?? (m as any)?.name ?? m.userId ?? '').trim(),
        ]),
      );
      const subs = Array.isArray(t?.subtasks) ? (t.subtasks as any[]) : [];
      const participantIds = Array.isArray(t?.participants)
        ? (t.participants as unknown[]).map((x) => String(x))
        : [];
      const subAssigneeIds = Array.from(
        new Set(subs.map((s) => String(s?.assigneeId ?? '').trim()).filter(Boolean)),
      );
      const topAssignees = Array.isArray(t?.assignees)
        ? (t.assignees as unknown[]).map((x) => String(x)).filter(Boolean)
        : [];
      const isAll = Boolean(t?.assignToAll) || Boolean(t?.broadcast);
      const ids = subs.length > 0 ? subAssigneeIds : topAssignees;
      const assigneeLabel = isAll
        ? 'Cả nhóm'
        : ids.length > 0
          ? ids.map((x) => nameById.get(String(x)) || String(x)).join(', ')
          : undefined;

      const fb = opts?.fallback ?? {};
      const fallbackTitle = String(fb.title ?? '').trim();
      const fallbackNote =
        fb.note != null && String(fb.note).trim() !== '' ? String(fb.note) : null;
      const fallbackDue =
        fb.dueDate != null && String(fb.dueDate).trim() !== '' ? String(fb.dueDate) : null;
      const fallbackSubsRaw = Array.isArray(fb.subtasks) ? fb.subtasks : [];
      const fallbackSubs = fallbackSubsRaw.map((s: any) => ({
        assigneeName: String(s?.assigneeName ?? s?.assignee ?? s?.assigneeId ?? '').trim(),
        content: String(s?.content ?? s?.text ?? '').trim(),
        done: Boolean(s?.done),
      }));

      setTaskDetailTaskId(id);
      setTaskDetail({
        title: String(t?.title ?? fallbackTitle ?? ''),
        note:
          t?.description != null && String(t.description).trim() !== ''
            ? String(t.description)
            : fallbackNote,
        dueDate: t?.dueDate != null ? String(t.dueDate) : fallbackDue,
        assigneeLabel,
        participantsCount: participantIds.length,
        participantIds,
        actorLabel: opts?.actorLabel,
        subtasks:
          subs.length > 0
            ? subs.map((s) => ({
                assigneeName:
                  String(s?.assigneeName ?? '').trim() ||
                  nameById.get(String(s?.assigneeId ?? '').trim()) ||
                  String(s?.assigneeId ?? ''),
                content: String(s?.content ?? ''),
                done: Boolean(s?.done),
              }))
            : fallbackSubs.length > 0
              ? fallbackSubs
              : [],
      });
      setTaskDetailOpen(true);
    },
    [groupMembers, groupTasks],
  );

  useEffect(() => {
    if (!taskDetailOpen || !taskDetailTaskId) return;
    const t = (groupTasks ?? []).find(
      (x: any) => String(x?.taskId) === String(taskDetailTaskId),
    ) as any;
    if (!t) return;
    setTaskDetail((prev) => {
      const participantIds = Array.isArray(t.participants)
        ? (t.participants as unknown[]).map((id) => String(id))
        : (prev?.participantIds ?? []);
      const subs = Array.isArray(t.subtasks) ? (t.subtasks as any[]) : [];
      const nameById = new Map(
        (groupMembers ?? []).map((m) => [
          String(m.userId),
          String(m.displayName ?? (m as any)?.name ?? m.userId ?? '').trim(),
        ]),
      );
      const subAssigneeIds = Array.from(
        new Set(subs.map((s) => String(s?.assigneeId ?? '').trim()).filter(Boolean)),
      );
      const topAssignees = Array.isArray(t.assignees)
        ? (t.assignees as unknown[]).map((x) => String(x)).filter(Boolean)
        : [];
      const isAll = Boolean(t.assignToAll) || Boolean(t.broadcast);
      const assigneeLabel = isAll
        ? 'Cả nhóm'
        : (subs.length > 0 ? subAssigneeIds : topAssignees).length > 0
          ? (subs.length > 0 ? subAssigneeIds : topAssignees)
              .map((id) => nameById.get(id) || id)
              .join(', ')
          : (prev?.assigneeLabel ?? undefined);
      const noteFromApi =
        t.description != null && String(t.description).trim() !== ''
          ? String(t.description)
          : prev?.note;
      return {
        ...(prev ?? { title: String(t.title ?? ''), note: null }),
        title: String(t.title ?? prev?.title ?? ''),
        note: noteFromApi ?? null,
        dueDate: t.dueDate != null ? String(t.dueDate) : (prev?.dueDate ?? null),
        assigneeLabel,
        participantsCount: participantIds.length,
        participantIds,
        subtasks: subs.map((s) => ({
          assigneeName:
            String(s?.assigneeName ?? '').trim() ||
            nameById.get(String(s?.assigneeId ?? '').trim()) ||
            String(s?.assigneeId ?? ''),
          content: String(s?.content ?? ''),
          done: Boolean(s?.done),
        })),
      };
    });
  }, [groupMembers, groupTasks, taskDetailOpen, taskDetailTaskId]);

  const markMediaDownloaded = useCallback((messageId: string) => {
    setDownloadedMediaIds((prev) => {
      if (prev.has(messageId)) return prev;
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });
  }, []);

  const handleMediaDownload = useCallback(
    async (messageId: string, url: string, filename: string) => {
      const ok = await downloadAuthedFile(url, filename);
      if (ok) {
        markMediaDownloaded(messageId);
      } else {
        toast.error('Không tải được file. Thử lại sau.');
      }
    },
    [markMediaDownloaded],
  );

  const openDownloadsFolderHint = useCallback(() => {
    toast.info(
      'Trình duyệt thường lưu vào thư mục Tải xuống (Downloads). Mở Explorer / Finder và vào Downloads để xem file.',
      undefined,
    );
  }, []);

  const [mediaContextMenu, setMediaContextMenu] = useState<{
    x: number;
    y: number;
    msg: IMessage;
    kind: 'image' | 'video';
  } | null>(null);
  const [forwardMediaMessage, setForwardMediaMessage] = useState<IMessage | null>(null);

  const copyImageToClipboard = useCallback(async (url: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('fetch');
      const blob = await res.blob();
      const type = blob.type || 'image/png';
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        toast.error('Trình duyệt không hỗ trợ copy ảnh (cần HTTPS).');
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
      toast.success('Đã copy hình ảnh');
    } catch {
      toast.error('Không copy được hình ảnh');
    }
  }, []);

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 flex flex-col gap-1 min-h-0 custom-scrollbar"
    >
      {!activeConversationId && (
        <div className="flex flex-col items-center justify-center h-full gap-5 select-none">
          <div className="size-24 rounded-3xl bg-primary/5 flex items-center justify-center shadow-inner">
            <MessageCircle className="size-12 text-primary/25" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-foreground/40">Chọn hội thoại</p>
            <p className="text-sm text-muted-foreground/50 mt-1">và bắt đầu nhắn tin</p>
          </div>
        </div>
      )}
      {activeConversationId && (
        <>
          {allMessages.map((msg, index) => {
            // Centered system message for group events (e.g. name change, received, etc.)
            if ((msg as any).type === 'system' || (msg as any).position === 'center') {
              if ((msg as any).isRecalled || (msg as any).isDeleted) {
                return null;
              }
              // Show date above bubble if first system message of the day or first message
              const prevMsg = index > 0 ? allMessages[index - 1] : undefined;
              const prevDate = prevMsg ? prevMsg.createdAt?.slice(0, 10) : null;
              const currDate = msg.createdAt?.slice(0, 10);
              const showDate = !prevMsg || prevDate !== currDate;
              // Show 'Hôm nay' if date is today
              const todayStr = new Date().toISOString().slice(0, 10);
              const isToday = currDate === todayStr;
              const dateLabel = showDate ? (isToday ? 'Hôm nay' : formatDate(msg.createdAt)) : '';
              const timeLabel = formatTime(msg.createdAt);
              // Nếu là thông báo hệ thống do chính mình thực hiện thì xưng "Bạn" (chỉ phía người cập nhật).
              let content = msg.content;
              // Giữ logic cũ (case avatar nhóm) để tránh thay đổi hành vi đang ổn định.
              if (
                msg.content?.includes('đã cập nhật ảnh đại diện nhóm') &&
                msg.senderId === currentUserId
              ) {
                content = 'Bạn đã cập nhật ảnh đại diện nhóm';
              }
              // Bổ sung: các system message khác có format "Tên đã ..." thì thay "Tên" -> "Bạn" khi chính mình là sender.
              // Không đụng tới nội dung phía người nhận (senderId != currentUserId) nên người nhận vẫn thấy đúng tên người cập nhật.
              if (msg.senderId === currentUserId && msg.senderDisplayName) {
                const name = msg.senderDisplayName.trim();
                if (name) {
                  // Chỉ replace 1 lần để tránh "Tên" xuất hiện ở chỗ khác trong câu.
                  // Quan trọng: KHÔNG replace trong JSON system payload (task/poll/...) vì sẽ làm hỏng dữ liệu (vd: title/assigneeLabel).
                  const raw = typeof content === 'string' ? content.trim() : '';
                  if (!raw.startsWith('{')) {
                    content = content.replace(name, 'Bạn');
                  }
                }
              }

              // Task assigned card payload (JSON) -> render modern card UI.
              let taskCard: null | {
                taskId: string;
                actorId: string | null;
                actorName: string;
                title: string;
                dueDate: string | null;
                note: string | null;
                assigneeLabel: string;
                assignToAll: boolean;
                broadcast: boolean;
                assigneeUserIds: string[];
                assigneesCount?: number;
                subtasksFromMessage?: any[];
              } = null;
              let taskJoinedLine: null | {
                actorId: string | null;
                actorName: string;
                title: string;
              } = null;
              // Hội thoại 1-1 KHÔNG có khái niệm "công việc nhóm" — bất kỳ
              // system message dạng task_* nào lọt vào đây (do race lúc đổi
              // hội thoại trong `useTaskReminderScheduler`, hoặc tin tồn dư
              // trong cache từ phiên cũ) đều bị bỏ qua. Tránh hiển thị nhầm
              // "Công việc đã bị hủy" / "Đến hạn công việc" trong chat riêng
              // cho task vốn thuộc về một nhóm khác.
              const isDirectChat = activeConversation?.type === 'direct';
              if (isDirectChat && typeof content === 'string' && content.trim().startsWith('{')) {
                try {
                  const probe = JSON.parse(content) as { kind?: string };
                  const k = String(probe?.kind ?? '');
                  if (
                    k === 'task_assigned' ||
                    k === 'task_joined' ||
                    k === 'task_updated' ||
                    k === 'task_deleted' ||
                    k === 'task_due' ||
                    k === 'task_reminder'
                  ) {
                    return null;
                  }
                } catch {
                  /* không phải JSON hợp lệ — render fallback bình thường */
                }
              }

              // Trong NHÓM: thẻ `task_assigned` có messageId dạng
              // `local-task-card:<convId>:<taskId>` là card LOCAL do
              // `useTaskReminderScheduler` bơm vào dựa trên `groupTasks`. Khi
              // người dùng chuyển nhóm A → B, `activeConversationId` đổi sang B
              // ngay nhưng `groupTasks` còn 1 nhịp render là dữ liệu của A →
              // hook bơm nhầm card của task thuộc nhóm A vào cache của nhóm B.
              // Sau khi tasks của B load xong, taskId đó không có trên board →
              // logic `taskMissingFromBoard` ở dưới sẽ render "Công việc đã bị
              // hủy" sai. Lưới chắn bổ sung: nếu là local card mà taskId không
              // còn trên board của nhóm hiện tại → bỏ qua hoàn toàn (return
              // null) thay vì hiển thị nhầm là đã hủy.
              if (
                !isDirectChat &&
                typeof msg.messageId === 'string' &&
                msg.messageId.startsWith('local-task-card:') &&
                typeof content === 'string' &&
                content.trim().startsWith('{')
              ) {
                try {
                  const probe = JSON.parse(content) as {
                    kind?: string;
                    task?: { taskId?: string };
                  };
                  if (probe?.kind === 'task_assigned') {
                    const probeTaskId = String(probe?.task?.taskId ?? '').trim();
                    if (probeTaskId && !probeTaskId.startsWith('tmp-')) {
                      const onBoard = (groupTasks ?? []).some(
                        (x: { taskId?: string }) => String(x?.taskId) === probeTaskId,
                      );
                      if (!onBoard) {
                        return null;
                      }
                    }
                  }
                } catch {
                  /* không phải JSON hợp lệ — bỏ qua, render theo nhánh dưới */
                }
              }

              if (typeof content === 'string' && content.trim().startsWith('{')) {
                try {
                  const obj = JSON.parse(content) as any;
                  if (obj?.kind === 'task_assigned' && obj?.task?.title) {
                    const rawIds = obj?.task?.assigneeUserIds;
                    const assigneeUserIds = Array.isArray(rawIds)
                      ? rawIds.map((x: unknown) => String(x)).filter(Boolean)
                      : [];
                    const subsRaw = obj?.task?.subtasks;
                    const subtasksFromMessage = Array.isArray(subsRaw) ? subsRaw : undefined;
                    const ac = obj?.task?.assigneesCount;
                    taskCard = {
                      taskId: String(obj?.task?.taskId ?? ''),
                      actorId: obj?.actor?.userId ? String(obj.actor.userId) : null,
                      actorName: String(obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó'),
                      title: String(obj.task.title ?? ''),
                      dueDate: obj.task.dueDate ? String(obj.task.dueDate) : null,
                      note: obj.task.note ? String(obj.task.note) : null,
                      assigneeLabel: String(obj.task.assigneeLabel ?? 'cả nhóm'),
                      assignToAll: Boolean(obj?.task?.assignToAll),
                      broadcast: Boolean(obj?.task?.broadcast),
                      assigneeUserIds,
                      ...(typeof ac === 'number' ? { assigneesCount: ac } : {}),
                      ...(subtasksFromMessage ? { subtasksFromMessage } : {}),
                    };
                  }
                  if (obj?.kind === 'task_joined' && obj?.task?.taskId) {
                    taskJoinedLine = {
                      actorId: obj?.actor?.userId ? String(obj.actor.userId) : null,
                      actorName: String(obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó'),
                      title: String(obj?.task?.title ?? ''),
                    };
                  }
                } catch {
                  taskCard = null;
                }
              }

              // Dedupe: only render first occurrence for each taskId.
              if (taskCard?.taskId) {
                const id = String(taskCard.taskId);
                if (seenTaskAssignedIds.has(id)) return null;
                seenTaskAssignedIds.add(id);
              }

              return (
                <div
                  key={msg.messageId}
                  className="w-full flex flex-col items-center my-3 select-none"
                >
                  <span className="mb-2 bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60 text-xs px-3 py-1 rounded-full font-medium">
                    {showDate ? `${timeLabel} ${dateLabel}` : timeLabel}
                  </span>
                  <div
                    className={`bg-white dark:bg-zinc-800/95 rounded-2xl shadow-sm border border-black/[0.06] dark:border-white/10 ${
                      taskCard ? 'overflow-hidden' : 'px-3 py-2'
                    }`}
                    style={{ minWidth: 280, maxWidth: 480 }}
                  >
                    {taskCard ? (
                      <div className="w-full">
                        {(() => {
                          const tBoard = (groupTasks ?? []).find(
                            (x: any) => String(x?.taskId) === String(taskCard?.taskId),
                          );
                          const taskMissingFromBoard =
                            Boolean(taskCard?.taskId) &&
                            !String(taskCard.taskId).startsWith('tmp-') &&
                            !tBoard;
                          const creatorIdForTask = (tBoard as any)?.creatorId ?? taskCard.actorId;
                          const isTaskCreator = Boolean(
                            currentUserId &&
                            creatorIdForTask &&
                            String(creatorIdForTask) === String(currentUserId),
                          );

                          // Nếu task đã bị hủy/xóa và không còn trên board, chỉ hiển thị dòng hệ thống `task_deleted`
                          // (tránh hiện thêm "thẻ công việc đã hủy" to gây rối).
                          if (taskMissingFromBoard) {
                            const titleStr = String(taskCard?.title ?? '').trim();
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <AlarmClockOff
                                  className="h-4 w-4 shrink-0 text-muted-foreground/85"
                                  strokeWidth={1.75}
                                  aria-hidden
                                />
                                <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                                  {'Công việc đã bị hủy'}
                                  {titleStr ? ` "${titleStr}"` : ''}
                                </span>
                              </div>
                            );
                          }

                          const byId = new Map(
                            (groupMembers ?? []).map((m) => [
                              String(m.userId),
                              String(m.displayName ?? (m as any)?.name ?? m.userId ?? '').trim(),
                            ]),
                          );
                          const t = tBoard;
                          const assignees = Array.isArray((t as any)?.assignees)
                            ? ((t as any).assignees as string[])
                            : [];
                          const subsBoard = Array.isArray((t as any)?.subtasks)
                            ? ((t as any).subtasks as any[])
                            : [];
                          const subsFromMsg = Array.isArray(taskCard.subtasksFromMessage)
                            ? taskCard.subtasksFromMessage
                            : [];
                          const subs = subsBoard.length > 0 ? subsBoard : subsFromMsg;
                          const subAssigneeIds = subs
                            .map((s) => String(s?.assigneeId ?? '').trim())
                            .filter(Boolean);
                          const labelRaw = String(taskCard.assigneeLabel ?? '');
                          const labelNorm = labelRaw
                            .toLowerCase()
                            .normalize('NFD')
                            // strip Vietnamese accents/diacritics
                            .replace(/[\u0300-\u036f]/g, '');
                          const labelLooksLikeGroup =
                            labelNorm.includes('ca nhom') ||
                            labelNorm.includes('group') ||
                            labelNorm.includes('all');
                          const participants = Array.isArray((t as any)?.participants)
                            ? ((t as any).participants as string[])
                            : [];
                          const joined = participants.includes(currentUserId);
                          const isSubtaskAssignee = subAssigneeIds.includes(String(currentUserId));
                          const topIds =
                            taskCard.assigneeUserIds.length > 0
                              ? taskCard.assigneeUserIds
                              : assignees;
                          const isTopLevelAssignee = topIds
                            .map(String)
                            .includes(String(currentUserId));
                          const explicitAssignToAll =
                            Boolean((t as any)?.assignToAll) ||
                            Boolean((t as any)?.broadcast) ||
                            Boolean(taskCard.assignToAll) ||
                            Boolean(taskCard.broadcast);
                          const hasTopLevelAssignees = topIds.length > 0;
                          const hasSubtasksAssignees = subAssigneeIds.length > 0;
                          const canJoinThisTask = hasSubtasksAssignees
                            ? isSubtaskAssignee
                            : explicitAssignToAll ||
                              // legacy: không có assignees/subtasks mà label ghi "cả nhóm"
                              (!hasTopLevelAssignees &&
                                !hasSubtasksAssignees &&
                                labelLooksLikeGroup) ||
                              // legacy: không có assignees/subtasks → coi như cả nhóm
                              (!hasTopLevelAssignees && !hasSubtasksAssignees) ||
                              isTopLevelAssignee;
                          const dueForJoin =
                            (t as any)?.dueDate != null && String((t as any).dueDate).trim() !== ''
                              ? String((t as any).dueDate)
                              : taskCard.dueDate;
                          const joinDeadlinePassed = isTaskJoinDeadlinePassed(
                            dueForJoin ?? undefined,
                          );
                          const showJoin = !joined;
                          return (
                            <div className="flex flex-col gap-0 w-full text-left bg-transparent relative group">
                              <button
                                type="button"
                                onClick={() => {
                                  const tt = tBoard as any;
                                  const subs = Array.isArray(tt?.subtasks)
                                    ? (tt.subtasks as any[])
                                    : [];
                                  const participantIds = Array.isArray(tt?.participants)
                                    ? (tt.participants as unknown[]).map((x) => String(x))
                                    : [];
                                  const subAssigneeIds = Array.from(
                                    new Set(
                                      subs
                                        .map((s) => String(s?.assigneeId ?? '').trim())
                                        .filter(Boolean),
                                    ),
                                  );
                                  const topIds =
                                    taskCard.assigneeUserIds.length > 0
                                      ? taskCard.assigneeUserIds
                                      : Array.isArray(tt?.assignees)
                                        ? (tt.assignees as unknown[])
                                            .map((x) => String(x))
                                            .filter(Boolean)
                                        : [];
                                  const isAll =
                                    Boolean(tt?.assignToAll) ||
                                    Boolean(tt?.broadcast) ||
                                    Boolean(taskCard.assignToAll) ||
                                    Boolean(taskCard.broadcast);
                                  const assigneeDisplay = isAll
                                    ? 'Cả nhóm'
                                    : (subs.length > 0 ? subAssigneeIds : topIds).length > 0
                                      ? (subs.length > 0 ? subAssigneeIds : topIds)
                                          .map((id) => byId.get(String(id)) ?? String(id))
                                          .join(', ')
                                      : taskCard.assigneeLabel;
                                  setTaskDetailTaskId(String(taskCard.taskId));
                                  setTaskDetail({
                                    title: taskCard.title,
                                    note: taskCard.note,
                                    dueDate: taskCard.dueDate,
                                    assigneeLabel: assigneeDisplay,
                                    participantsCount: participantIds.length,
                                    participantIds,
                                    actorLabel:
                                      (taskCard.actorId && taskCard.actorId === currentUserId
                                        ? 'Bạn'
                                        : taskCard.actorName) + ' đã giao việc',
                                    subtasks: subs.map((s) => {
                                      const assigneeId = String(s?.assigneeId ?? '').trim();
                                      const nameRaw = String(s?.assigneeName ?? '').trim();
                                      const name =
                                        nameRaw ||
                                        (assigneeId ? (byId.get(assigneeId) ?? assigneeId) : '');
                                      return {
                                        assigneeName: name,
                                        content: String(s?.content ?? ''),
                                        done: Boolean(s?.done),
                                      };
                                    }),
                                  });
                                  setTaskDetailOpen(true);
                                }}
                                className="px-4 py-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors w-full text-left rounded-t-2xl outline-none"
                              >
                                {/* Task Info Header */}
                                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                                  <ClipboardList className="w-3.5 h-3.5" />
                                  {(taskCard.actorId && taskCard.actorId === currentUserId
                                    ? 'Bạn'
                                    : taskCard.actorName) + ' đã giao việc'}
                                </div>

                                {/* Title */}
                                <div className="text-[16px] font-black text-foreground break-words leading-snug mb-3.5 pr-2">
                                  {taskCard.title}
                                </div>

                                {/* Assignees & Deadline */}
                                <div className="space-y-2.5">
                                  <div className="flex items-center gap-2.5 text-[13px]">
                                    <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0 flex-1 flex items-center flex-wrap gap-1">
                                      <span className="font-semibold text-muted-foreground mr-0.5">
                                        Giao cho:
                                      </span>
                                      {(() => {
                                        const subs = Array.isArray((tBoard as any)?.subtasks)
                                          ? ((tBoard as any).subtasks as any[])
                                          : [];
                                        const subAssignees =
                                          subs.length > 0
                                            ? Array.from(
                                                new Set(
                                                  subs
                                                    .map((s) => String(s?.assigneeId ?? '').trim())
                                                    .filter(Boolean),
                                                ),
                                              )
                                            : [];
                                        const topIds =
                                          taskCard.assigneeUserIds.length > 0
                                            ? taskCard.assigneeUserIds
                                            : Array.isArray((tBoard as any)?.assignees)
                                              ? (
                                                  ((tBoard as any).assignees as unknown[]) ?? []
                                                ).map((x) => String(x))
                                              : [];
                                        const ids = subs.length > 0 ? subAssignees : topIds;
                                        const display =
                                          Boolean((tBoard as any)?.assignToAll) ||
                                          Boolean((tBoard as any)?.broadcast) ||
                                          Boolean(taskCard.assignToAll) ||
                                          Boolean(taskCard.broadcast)
                                            ? 'Cả nhóm'
                                            : ids.length > 0
                                              ? ids
                                                  .map((id) => byId.get(String(id)) ?? String(id))
                                                  .join(', ')
                                              : taskCard.assigneeLabel;
                                        return (
                                          <span
                                            className="font-bold text-foreground truncate"
                                            title={display}
                                          >
                                            {display}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                  {taskCard.dueDate ? (
                                    <div className="flex items-center gap-2.5 text-[13px]">
                                      <AlarmClock className="w-4 h-4 text-muted-foreground shrink-0" />
                                      <div className="min-w-0 flex-1 flex items-center flex-wrap gap-1.5">
                                        <span className="font-semibold text-muted-foreground mr-0.5">
                                          Hạn chót:
                                        </span>
                                        <TaskDeadlineCalendar
                                          dateIso={taskCard.dueDate}
                                          size="sm"
                                        />
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                                {/* Subtasks Preview */}
                                {(() => {
                                  const subs = Array.isArray((tBoard as any)?.subtasks)
                                    ? ((tBoard as any).subtasks as any[])
                                    : [];
                                  if (subs.length === 0) return null;
                                  const completedCount = subs.filter((s) => s?.done).length;
                                  const totalCount = subs.length;
                                  const progress = Math.round((completedCount / totalCount) * 100);

                                  return (
                                    <div className="mt-4 flex items-center gap-3 text-[12px] text-muted-foreground/90 font-medium bg-black/[0.02] dark:bg-white/[0.02] p-2.5 rounded-xl border border-black/5 dark:border-white/5">
                                      <div className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                      <span className="shrink-0 font-bold">
                                        {completedCount}/{totalCount} mục
                                      </span>
                                    </div>
                                  );
                                })()}
                              </button>

                              {/* Action Bar (Footer) */}
                              <div className="border-t border-black/5 dark:border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-black/[0.015] dark:bg-white/[0.015] rounded-b-2xl">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground shadow-sm">
                                    <span aria-hidden>👥</span>
                                    <span>
                                      {participants.length > 0
                                        ? `${participants.length} đã tham gia`
                                        : 'Chưa có ai'}
                                    </span>
                                  </span>
                                  {joined ? (
                                    <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                                      Đã tham gia
                                    </span>
                                  ) : joinDeadlinePassed ? (
                                    <span
                                      className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-black/5 text-muted-foreground dark:bg-white/10 border border-black/5 dark:border-white/10"
                                      title="Đã quá hạn công việc"
                                    >
                                      Chưa tham gia
                                    </span>
                                  ) : showJoin ? (
                                    <button
                                      type="button"
                                      disabled={!canJoinThisTask}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!canJoinThisTask) return;
                                        onTaskJoined?.(taskCard.taskId);
                                      }}
                                      className={
                                        !canJoinThisTask
                                          ? 'px-3 py-1.5 rounded-full text-[11px] font-bold bg-black/5 dark:bg-white/10 text-muted-foreground cursor-not-allowed border border-black/5 dark:border-white/5'
                                          : 'px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm transition-colors'
                                      }
                                    >
                                      Xác nhận tham gia
                                    </button>
                                  ) : null}
                                </div>

                                {isTaskCreator && (onEditGroupTask || onDeleteGroupTask) ? (
                                  <div className="flex items-center gap-0.5">
                                    {onEditGroupTask && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEditGroupTask(String(taskCard.taskId));
                                        }}
                                        className="px-2.5 py-1.5 text-[12px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors flex items-center gap-1.5"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Sửa</span>
                                      </button>
                                    )}
                                    {onDeleteGroupTask && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteGroupTask(String(taskCard.taskId));
                                        }}
                                        className="px-2.5 py-1.5 text-[12px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Hủy</span>
                                      </button>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : taskJoinedLine ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                        <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                          {(taskJoinedLine.actorId && taskJoinedLine.actorId === currentUserId
                            ? 'Bạn'
                            : taskJoinedLine.actorName) + ' đã tham gia công việc'}
                          {taskJoinedLine.title ? ` "${taskJoinedLine.title}"` : ''}
                        </span>
                      </div>
                    ) : typeof content === 'string' && content.trim().startsWith('{') ? (
                      (() => {
                        try {
                          const obj = JSON.parse(content) as any;
                          if (obj?.kind === 'poll_created') {
                            const actorName = String(
                              obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó',
                            );
                            const question = String(obj?.poll?.question ?? '').trim();
                            const pollId = String(obj?.poll?.pollId ?? '').trim();
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <BarChart2 className="w-4 h-4 text-orange-500 shrink-0" />
                                <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                                  {(msg.senderId === currentUserId ? 'Bạn' : actorName) +
                                    ' đã tạo một bình chọn'}
                                  {question ? `: ${question}` : ''}
                                </span>
                                {pollId && onOpenPollVote ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpenPollVote(pollId)}
                                    className="ml-1 px-2 py-1 rounded-full text-[11px] font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                                  >
                                    Bình chọn
                                  </button>
                                ) : null}
                              </div>
                            );
                          }
                          if (obj?.kind === 'poll_voted') {
                            const actorName = String(
                              obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó',
                            );
                            const optionText = String(obj?.poll?.optionText ?? '').trim();
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <BarChart2 className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                                  {(msg.senderId === currentUserId ? 'Bạn' : actorName) +
                                    ' đã bình chọn'}
                                  {optionText ? `: ${optionText}` : ''}
                                </span>
                              </div>
                            );
                          }
                          if (obj?.kind === 'poll_vote_changed') {
                            const actorName = String(
                              obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó',
                            );
                            const optionText = String(obj?.poll?.optionText ?? '').trim();
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <BarChart2 className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                                  {(msg.senderId === currentUserId ? 'Bạn' : actorName) +
                                    ' đã thay đổi bình chọn'}
                                  {optionText ? `: ${optionText}` : ''}
                                </span>
                              </div>
                            );
                          }
                          if (obj?.kind === 'poll_unvoted') {
                            const actorName = String(
                              obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó',
                            );
                            const optionText = String(obj?.poll?.optionText ?? '').trim();
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <BarChart2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                                  {(msg.senderId === currentUserId ? 'Bạn' : actorName) +
                                    ' đã rút phiếu'}
                                  {optionText ? `: ${optionText}` : ''}
                                </span>
                              </div>
                            );
                          }
                          if (obj?.kind === 'poll_option_added') {
                            const actorName = String(
                              obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó',
                            );
                            const optionText = String(obj?.poll?.optionText ?? '').trim();
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <BarChart2 className="w-4 h-4 text-orange-500 shrink-0" />
                                <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                                  {(msg.senderId === currentUserId ? 'Bạn' : actorName) +
                                    ' đã thêm lựa chọn'}
                                  {optionText ? `: ${optionText}` : ''}
                                </span>
                              </div>
                            );
                          }
                          if (obj?.kind === 'poll_closed') {
                            const actorName = String(
                              obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó',
                            );
                            const question = String(obj?.poll?.question ?? '').trim();
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <BarChart2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                                  {(msg.senderId === currentUserId ? 'Bạn' : actorName) +
                                    ' đã đóng bình chọn'}
                                  {question ? `: ${question}` : ''}
                                </span>
                              </div>
                            );
                          }
                          if (obj?.kind === 'task_updated') {
                            const actorName = String(
                              obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó',
                            );
                            const titleStr = String(obj?.task?.title ?? '').trim();
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <Pencil className="w-4 h-4 text-blue-400 shrink-0" />
                                <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                                  {(msg.senderId === currentUserId ? 'Bạn' : actorName) +
                                    ' đã cập nhật công việc'}
                                  {titleStr ? ` "${titleStr}"` : ''}
                                </span>
                              </div>
                            );
                          }
                          if (obj?.kind === 'task_deleted') {
                            const actorName = String(
                              obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó',
                            );
                            const titleStr = String(obj?.task?.title ?? '').trim();
                            return (
                              <div className="flex items-center justify-center gap-2">
                                <AlarmClockOff
                                  className="h-4 w-4 shrink-0 text-muted-foreground/85"
                                  strokeWidth={1.75}
                                  aria-hidden
                                />
                                <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                                  {(msg.senderId === currentUserId ? 'Bạn' : actorName) +
                                    ' đã hủy công việc'}
                                  {titleStr ? ` "${titleStr}"` : ''}
                                </span>
                              </div>
                            );
                          }
                          if (obj?.kind === 'task_due') {
                            const titleStr = String(obj?.task?.title ?? '').trim();
                            const taskId = String(obj?.task?.taskId ?? '').trim();
                            return (
                              <div className="flex w-full items-center justify-between gap-2">
                                <div className="min-w-0 flex items-center gap-2">
                                  <AlarmClock
                                    className="h-4 w-4 shrink-0 text-orange-500"
                                    aria-hidden
                                  />
                                  <span className="min-w-0 truncate text-[12px] font-medium text-[#666] dark:text-zinc-300">
                                    {titleStr ? `Đến hạn: "${titleStr}"` : 'Đến hạn công việc'}
                                  </span>
                                </div>
                                {taskId ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openTaskDetailById(taskId);
                                    }}
                                    className="ml-1 inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border border-black/10 bg-black/[0.03] px-3 text-[11px] font-bold text-foreground/80 hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.10] transition-colors"
                                  >
                                    Mở công việc
                                  </button>
                                ) : null}
                              </div>
                            );
                          }
                        } catch {
                          // ignore
                        }
                        return (
                          <div className="flex items-center justify-center gap-2">
                            <Pencil className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                              {content}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Pencil className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                          {content}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            if (msg.type === 'call') {
              let payload: CallLogContent | null = null;
              try {
                payload = JSON.parse(msg.content) as CallLogContent;
              } catch {
                payload = null;
              }
              const kind = (payload as any)?.kind as string | undefined;
              const callType = (payload as any)?.callType as string | undefined;
              const durationSec = Number((payload as any)?.durationSec ?? 0);
              const isMeCall = msg.senderId === currentUserId;
              const durationLabel =
                kind === 'missed' || kind === 'rejected' || kind === 'cancelled'
                  ? '—'
                  : durationSec > 0
                    ? `${Math.floor(durationSec / 60)} phút ${String(durationSec % 60).padStart(2, '0')} giây`
                    : '0 phút 0 giây';

              const title =
                kind === 'missed'
                  ? 'Cuộc gọi nhỡ'
                  : kind === 'rejected'
                    ? 'Cuộc gọi bị từ chối'
                    : kind === 'cancelled' && isMeCall
                      ? callType === 'video'
                        ? 'Bạn đã hủy cuộc gọi video'
                        : 'Bạn đã hủy cuộc gọi thoại'
                      : kind === 'cancelled' && !isMeCall
                        ? 'Cuộc gọi nhỡ'
                        : callType === 'video'
                          ? 'Cuộc gọi video'
                          : 'Cuộc gọi thoại';
              const prevCall = index > 0 ? allMessages[index - 1] : undefined;
              const nextCall = index < allMessages.length - 1 ? allMessages[index + 1] : undefined;
              const isSameSenderAsPrevCall = !!prevCall && prevCall.senderId === msg.senderId;
              const isSameSenderAsNextCall = !!nextCall && nextCall.senderId === msg.senderId;
              const showAvatarCall = !isMeCall && !isSameSenderAsNextCall;
              const showMetaCall = !isSameSenderAsNextCall;

              return (
                <motion.div
                  id={`chat-msg-${msg.messageId}`}
                  key={msg.messageId}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={`flex items-end gap-2 group/msg ${isMeCall ? 'flex-row-reverse' : 'flex-row'} ${isSameSenderAsPrevCall ? 'mt-0' : 'mt-1'}`}
                >
                  {showAvatarCall ? (
                    <ZaloStyleAvatar
                      userId={msg.senderId}
                      displayName={msg.senderDisplayName ?? msg.senderId}
                      avatarUrl={memberAvatarMap.get(msg.senderId) ?? directOtherAvatar}
                      className="w-8 h-8 shadow-sm mb-0.5"
                    />
                  ) : isMeCall ? null : (
                    <div className="w-8 shrink-0" aria-hidden />
                  )}

                  <div
                    className={`flex flex-col max-w-[55%] sm:max-w-[45%] ${isMeCall ? 'items-end' : 'items-start'}`}
                  >
                    {!isMeCall &&
                      activeConversation?.type === 'group' &&
                      !isSameSenderAsPrevCall && (
                        <p className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 mb-1 px-1">
                          {msg.senderDisplayName ?? msg.senderId}
                        </p>
                      )}

                    <div
                      className={
                        isMeCall
                          ? 'min-w-[200px] max-w-full rounded-2xl rounded-br-sm px-4 py-3 shadow-sm bg-linear-to-br from-blue-500 to-blue-600 text-white'
                          : 'min-w-[200px] max-w-full rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm bg-white dark:bg-white/8 border border-black/8 dark:border-white/10 text-foreground'
                      }
                    >
                      <div
                        className={`flex items-center gap-2 ${isMeCall ? 'justify-end' : 'justify-start'} flex-wrap`}
                      >
                        {callType === 'video' ? (
                          <Video
                            className={`w-4 h-4 shrink-0 ${isMeCall ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}
                          />
                        ) : (
                          <Phone
                            className={`w-4 h-4 shrink-0 ${isMeCall ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}
                          />
                        )}
                        <p
                          className={`text-sm font-bold ${isMeCall ? 'text-white' : 'text-foreground'}`}
                        >
                          {title}
                        </p>
                      </div>
                      <p
                        className={`text-xs mt-1 ${isMeCall ? 'text-blue-100/90 text-right' : 'text-muted-foreground'}`}
                      >
                        {durationLabel}
                      </p>
                    </div>

                    {showMetaCall && (
                      <div
                        className={`flex items-center gap-1 mt-1 px-1 ${isMeCall ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMeCall && <CheckCheck className="w-3 h-3 text-blue-400" />}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            }

            const isMe = msg.senderId === currentUserId;
            const prevMsg = index > 0 ? allMessages[index - 1] : undefined;
            const nextMsg = index < allMessages.length - 1 ? allMessages[index + 1] : undefined;
            const isSameSenderAsPrev = !!prevMsg && prevMsg.senderId === msg.senderId;
            const isSameSenderAsNext = !!nextMsg && nextMsg.senderId === msg.senderId;
            const showAvatar = !isMe && !isSameSenderAsNext;
            const showMeta = !isSameSenderAsNext;
            const isMediaMsg = isRichMediaMessage(msg);
            const isWideMediaBubble = msg.type === 'image' || msg.type === 'video';
            const showCaption = messageHasCaption(msg);
            const mediaSavedOnDevice = downloadedMediaIds.has(msg.messageId);
            const isJumpHighlight = jumpHighlightMessageId === msg.messageId;
            return (
              <motion.div
                id={`chat-msg-${msg.messageId}`}
                key={msg.messageId}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`flex items-end gap-2 group/msg relative ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSameSenderAsPrev ? 'mt-0' : 'mt-1'}`}
              >
                {isJumpHighlight && (
                  <div
                    key={jumpFlashNonce}
                    className="absolute -inset-x-1 -inset-y-0.5 z-[1] rounded-2xl pointer-events-none chat-msg-jump-highlight"
                    aria-hidden
                  />
                )}
                {showAvatar ? (
                  <ZaloStyleAvatar
                    userId={msg.senderId}
                    displayName={msg.senderDisplayName ?? msg.senderId}
                    avatarUrl={memberAvatarMap.get(msg.senderId) ?? directOtherAvatar}
                    className="relative z-[2] w-8 h-8 shadow-sm mb-0.5"
                  />
                ) : isMe ? null : (
                  <div className="relative z-[2] w-8 shrink-0" aria-hidden />
                )}

                <div
                  className={`relative z-[2] flex flex-col ${
                    isWideMediaBubble
                      ? 'w-full max-w-[min(96vw,44rem)] sm:max-w-[min(92%,42rem)]'
                      : 'max-w-[85%] md:max-w-[75%] lg:max-w-[65%]'
                  } ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {!isMe && activeConversation?.type === 'group' && !isSameSenderAsPrev && (
                    <p className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 mb-1 px-1">
                      {msg.senderDisplayName ?? msg.senderId}
                    </p>
                  )}

                  <div
                    className={`relative flex max-w-full min-w-0 items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${msg.reactions && Object.keys(msg.reactions).length > 0 ? 'mb-3.5' : ''}`}
                  >
                    {msg.isDeleted ? (
                      <div className="px-3 py-2 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-muted-foreground text-xs italic select-none">
                        Tin nhắn đã bị xóa
                      </div>
                    ) : msg.isRecalled ? (
                      <div className="px-3 py-2 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-muted-foreground text-xs italic select-none">
                        Tin nhắn đã được thu hồi
                      </div>
                    ) : (
                      <div
                        className={
                          isMediaMsg
                            ? `relative flex max-w-full min-w-0 flex-col px-0 py-0 rounded-xl text-[13px] leading-snug shadow-none break-words whitespace-pre-wrap bg-transparent border-0 text-foreground selection:bg-blue-200 selection:text-black dark:selection:bg-blue-300 dark:selection:text-black ${
                                isMe ? 'items-end' : 'items-start'
                              }`
                            : `relative px-3 py-2 rounded-xl text-[13px] leading-snug shadow-sm min-w-0 break-words whitespace-pre-wrap selection:bg-blue-200 selection:text-black dark:selection:bg-blue-300 dark:selection:text-black ${
                                isMe
                                  ? 'bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-br-sm'
                                  : 'bg-white dark:bg-white/8 border border-black/8 dark:border-white/10 text-foreground rounded-bl-sm'
                              }`
                        }
                      >
                        {msg.replyToDetails && (
                          <ReplyQuoteStrip
                            details={msg.replyToDetails}
                            isMe={isMe}
                            isMediaMsg={isMediaMsg}
                            isWideMediaBubble={isWideMediaBubble}
                            onNavigate={() => scrollToMessage(msg.replyToDetails!.messageId)}
                          />
                        )}
                        {msg.type === 'image' && (msg.mediaUrl || msg.thumbnailUrl) && (
                          <div
                            className={`w-full ${showCaption || msg.replyToDetails ? 'mb-1.5' : ''}`}
                          >
                            <div
                              className={`w-full overflow-hidden rounded-2xl border shadow-md ${
                                isMe
                                  ? 'border-blue-200/50 bg-blue-50/90 dark:border-blue-800/50 dark:bg-blue-950/35'
                                  : 'border-black/10 bg-slate-50/95 dark:border-white/10 dark:bg-zinc-900/50'
                              }`}
                            >
                              <button
                                type="button"
                                aria-label="Xem ảnh lớn"
                                className="relative block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMediaLightbox({ src: imageDisplaySrc(msg), kind: 'image' });
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMediaContextMenu({
                                    x: e.clientX,
                                    y: e.clientY,
                                    msg,
                                    kind: 'image',
                                  });
                                  onActionMenuMsgIdChange(null);
                                }}
                              >
                                <AuthenticatedMedia
                                  src={imageDisplaySrc(msg)}
                                  kind="image"
                                  className="block w-full h-auto max-h-[min(78vh,640px)] object-contain bg-black/[0.04] dark:bg-black/40"
                                  alt="Ảnh đính kèm"
                                />
                              </button>
                            </div>
                          </div>
                        )}
                        {msg.type === 'video' && msg.mediaUrl && (
                          <div
                            className={`w-full min-w-0 ${showCaption || msg.replyToDetails ? 'mb-1.5' : ''}`}
                          >
                            <div
                              className={`w-full overflow-hidden rounded-2xl border shadow-md ${
                                isMe
                                  ? 'border-blue-200/50 bg-blue-50/90 dark:border-blue-800/50 dark:bg-blue-950/35'
                                  : 'border-black/10 bg-slate-50/95 dark:border-white/10 dark:bg-zinc-900/50'
                              }`}
                            >
                              <div
                                className="relative w-full aspect-video max-h-[min(78vh,640px)] bg-zinc-950"
                                onContextMenuCapture={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMediaContextMenu({
                                    x: e.clientX,
                                    y: e.clientY,
                                    msg,
                                    kind: 'video',
                                  });
                                  onActionMenuMsgIdChange(null);
                                }}
                              >
                                <AuthenticatedMedia
                                  src={msg.mediaUrl}
                                  kind="video"
                                  className="absolute inset-0 h-full w-full object-contain bg-black"
                                />
                                <button
                                  type="button"
                                  aria-label="Xem video toàn màn hình"
                                  title="Xem toàn màn hình"
                                  className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-lg bg-black/65 hover:bg-black/80 text-white text-[11px] font-semibold px-2.5 py-1.5 backdrop-blur-sm shadow-lg border border-white/15"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMediaLightbox({
                                      src: msg.mediaUrl as string,
                                      kind: 'video',
                                    });
                                  }}
                                >
                                  <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                                  <span className="hidden sm:inline pr-0.5">Toàn màn hình</span>
                                </button>
                              </div>
                              <div className="flex items-center gap-2.5 px-3 py-2.5 border-t border-black/5 dark:border-white/10 bg-white/90 dark:bg-zinc-950/80">
                                <div className="shrink-0 rounded-lg bg-violet-100 dark:bg-violet-900/40 p-2">
                                  <Video
                                    className="w-5 h-5 text-violet-600 dark:text-violet-400"
                                    aria-hidden
                                  />
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                  <p className="text-[13px] font-semibold text-foreground truncate">
                                    {msg.mediaOriginalName?.trim() || 'Video'}
                                  </p>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    {msg.mediaSize != null && msg.mediaSize > 0 ? (
                                      <span className="text-[11px] text-muted-foreground">
                                        {formatFileSize(msg.mediaSize)}
                                      </span>
                                    ) : null}
                                    {mediaSavedOnDevice && (
                                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                        <CircleCheck className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                        Đã có trên máy
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    aria-label="Gợi ý thư mục tải xuống"
                                    title="Thư mục Tải xuống"
                                    className="shrink-0 p-2.5 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-900 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDownloadsFolderHint();
                                    }}
                                  >
                                    <FolderOpen className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Tải video xuống"
                                    title="Tải xuống"
                                    className="shrink-0 p-2.5 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-900 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleMediaDownload(
                                        msg.messageId,
                                        msg.mediaUrl as string,
                                        msg.mediaOriginalName?.trim() || 'video.mp4',
                                      );
                                    }}
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {msg.type === 'file' && msg.mediaUrl && (
                          <div
                            className={`flex w-full max-w-[min(100%,20rem)] items-center gap-2 rounded-lg px-2.5 py-2 min-w-0 ${
                              showCaption || msg.replyToDetails ? 'mb-1.5' : ''
                            } ${
                              isMe
                                ? 'bg-black/8 dark:bg-white/10'
                                : 'bg-black/6 dark:bg-white/10 border border-black/8 dark:border-white/10'
                            }`}
                          >
                            <FileText
                              className="w-8 h-8 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className="text-xs font-semibold text-foreground truncate"
                                title={msg.mediaOriginalName?.trim() || 'Tệp đính kèm'}
                              >
                                {msg.mediaOriginalName?.trim() || 'Tệp đính kèm'}
                              </p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                {msg.mediaSize != null && msg.mediaSize > 0 ? (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatFileSize(msg.mediaSize)}
                                  </span>
                                ) : null}
                                {mediaSavedOnDevice && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                    <CircleCheck className="w-3 h-3 shrink-0" aria-hidden />
                                    Đã có trên máy
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                aria-label="Gợi ý thư mục tải xuống"
                                title="Thư mục Tải xuống"
                                onClick={() => openDownloadsFolderHint()}
                                className="shrink-0 p-2 rounded-lg text-foreground hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                              >
                                <FolderOpen className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Tải xuống"
                                title="Tải xuống"
                                onClick={() =>
                                  void handleMediaDownload(
                                    msg.messageId,
                                    msg.mediaUrl as string,
                                    msg.mediaOriginalName?.trim() || 'file',
                                  )
                                }
                                className="shrink-0 p-2 rounded-lg text-foreground hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        {isMediaMsg && showCaption && (
                          <div
                            className={`mt-0.5 w-full ${isWideMediaBubble ? 'max-w-full' : 'max-w-[min(100%,20rem)]'} px-2.5 py-1.5 rounded-lg text-[13px] break-words whitespace-pre-wrap ${
                              isMe
                                ? 'bg-black/6 dark:bg-white/10 text-foreground'
                                : 'bg-black/5 dark:bg-white/10 text-foreground'
                            }`}
                          >
                            {msg.content}
                          </div>
                        )}
                        {!isMediaMsg && showCaption && (
                          <span className="break-words whitespace-pre-wrap">{msg.content}</span>
                        )}
                        {msg.isEdited && (
                          <span
                            className={`ml-1.5 text-[10px] ${
                              isMe && !isMediaMsg ? 'text-blue-100/70' : 'text-muted-foreground/70'
                            }`}
                          >
                            (đã sửa)
                          </span>
                        )}

                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div
                            className={`absolute -bottom-3 ${isMe ? '-left-2' : '-right-2 flex-row-reverse'} flex flex-wrap gap-1 z-10`}
                          >
                            {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                              <div
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReact(msg, emoji);
                                }}
                                className={`px-1.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 ${userIds.includes(currentUserId) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-600' : 'border-black/10 dark:border-white/10 text-foreground'} text-[14px] shadow-sm flex items-center gap-1 cursor-pointer select-non hover:bg-gray-100 dark:hover:bg-gray-700`}
                                title={userIds.length > 0 ? `${userIds.length} người` : ''}
                              >
                                <span className="leading-none">{emoji}</span>
                                {userIds.length > 1 && (
                                  <span className="text-[10px] font-semibold opacity-70">
                                    {userIds.length}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!msg.isDeleted && !msg.isRecalled && (
                      <div
                        className={`flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-all duration-150 shrink-0 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div
                          className="relative group/reactbtn"
                          onMouseLeave={() => {
                            if (hiddenReactPopupId === msg.messageId) setHiddenReactPopupId(null);
                          }}
                        >
                          <button
                            type="button"
                            title="Thả cảm xúc"
                            className="p-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-blue-500/15 transition-colors"
                          >
                            <SmilePlus className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600" />
                          </button>
                          <div
                            className={`absolute bottom-full ${isMe ? 'right-0' : 'left-0'} mb-1 p-1.5 rounded-full bg-white dark:bg-zinc-800 shadow-xl border border-black/10 dark:border-white/10 flex items-center gap-1 transition-all translate-y-2 z-50 after:content-[''] after:absolute after:left-0 after:-bottom-5 after:w-full after:h-5 ${hiddenReactPopupId === msg.messageId ? 'hidden' : 'opacity-0 pointer-events-none group-hover/reactbtn:opacity-100 group-hover/reactbtn:pointer-events-auto group-hover/reactbtn:translate-y-0'}`}
                          >
                            {['❤️', '👍', '😂', '😮', '😢', '😡'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReact(msg, emoji);
                                  setHiddenReactPopupId(msg.messageId);
                                }}
                                className="text-xl hover:scale-125 transition-transform px-1"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          title="Trả lời"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReply(msg);
                          }}
                          className="p-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-blue-500/15 transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600" />
                        </button>
                        {canPinMessage(msg) && (
                          <button
                            type="button"
                            title={msg.isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
                            onClick={(e) => {
                              e.stopPropagation();
                              void onTogglePin(msg);
                            }}
                            className="p-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-blue-500/15 transition-colors"
                          >
                            <Pin
                              className={`w-3.5 h-3.5 ${
                                msg.isPinned
                                  ? 'text-[#0068ff] dark:text-blue-400 fill-blue-500/25'
                                  : 'text-muted-foreground hover:text-[#0068ff] dark:hover:text-blue-400'
                              }`}
                              strokeWidth={msg.isPinned ? 2.25 : 2}
                            />
                          </button>
                        )}
                        {isMe && (
                          <div className="relative">
                            <button
                              type="button"
                              title="Thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                onActionMenuMsgIdChange(
                                  actionMenuMsgId === msg.messageId ? null : msg.messageId,
                                );
                              }}
                              className="p-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-blue-500/15 transition-colors"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600" />
                            </button>
                            {actionMenuMsgId === msg.messageId && (
                              <div
                                className={`absolute z-50 min-w-[156px] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl py-1 ${isMe ? 'right-0 bottom-full mb-1' : 'left-0 bottom-full mb-1'}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {canShowEditInMessageOverflowMenu(msg) && (
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                                    onClick={() => {
                                      onStartEdit(msg);
                                      onActionMenuMsgIdChange(null);
                                    }}
                                  >
                                    <Pencil className="w-3.5 h-3.5 shrink-0" /> Sửa
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
                                  onClick={() => void onRecall(msg)}
                                >
                                  <RotateCcw className="w-3.5 h-3.5 shrink-0" /> Thu hồi
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-red-500/10 text-red-600 flex items-center gap-2"
                                  onClick={() => void onDelete(msg)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" /> Xóa
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {!isMe && (
                          <div className="relative">
                            <button
                              type="button"
                              title="Thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                onActionMenuMsgIdChange(
                                  actionMenuMsgId === msg.messageId ? null : msg.messageId,
                                );
                              }}
                              className="p-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-blue-500/15 transition-colors"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600" />
                            </button>
                            {actionMenuMsgId === msg.messageId && (
                              <div
                                className="absolute z-50 min-w-[168px] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl py-1 left-0 bottom-full mb-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-red-500/10 text-red-600 flex items-center gap-2"
                                  onClick={() => void onDelete(msg)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" /> Xóa
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {showMeta && (
                    <div
                      className={`mt-1 px-1 ${isMe ? 'flex flex-col items-end gap-0.5' : 'flex flex-row items-center gap-1'}`}
                    >
                      <div
                        className={`flex items-center gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMe && !msg.isRecalled && !msg.isDeleted && (
                          <OutgoingDeliveryTicks
                            status={msg.status}
                            convIsDirect={activeConversation?.type === 'direct'}
                            isMe={isMe}
                          />
                        )}
                      </div>
                      {isMe &&
                        !msg.isRecalled &&
                        !msg.isDeleted &&
                        msg.readBy &&
                        msg.readBy.length > 0 && (
                          <div
                            className="flex flex-wrap items-center justify-end gap-x-1 gap-y-0 max-w-[min(100%,280px)]"
                            title={msg.readBy
                              .map((r) => (r.displayName?.trim() ? r.displayName : 'Thành viên'))
                              .join(', ')}
                          >
                            <span className="text-[10px] text-white/65 shrink-0">Đã xem</span>
                            {msg.readBy.slice(0, 6).map((r) => (
                              <span
                                key={r.userId}
                                className="text-[10px] font-semibold text-white/90 truncate max-w-[100px]"
                              >
                                {r.displayName?.trim() || 'Người dùng'}
                              </span>
                            ))}
                            {msg.readBy.length > 6 ? (
                              <span className="text-[10px] text-white/65">
                                +{msg.readBy.length - 6}
                              </span>
                            ) : null}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.9 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-end gap-2"
              >
                <ZaloStyleAvatar
                  userId={typingUsers[0].userId}
                  displayName={typingUsers[0].displayName}
                  avatarUrl={memberAvatarMap.get(typingUsers[0].userId) ?? directOtherAvatar}
                  className="w-8 h-8 shadow-sm"
                />
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[11px] font-semibold text-foreground/70 px-0.5">
                    {typingUsers.length === 1
                      ? typingLabel(typingUsers[0])
                      : `${typingLabel(typingUsers[0])} và ${typingUsers.length - 1} người khác`}
                  </span>
                  <div className="bg-white dark:bg-white/8 border border-black/8 dark:border-white/10 rounded-xl rounded-bl-sm px-3 py-2 flex gap-[4px] items-center shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="block w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
                        animate={{ scale: [1, 1.35, 1], opacity: [0.45, 1, 0.45] }}
                        transition={{
                          duration: 1.1,
                          repeat: Infinity,
                          delay: i * 0.18,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground/60 italic px-0.5">
                    Đang soạn tin nhắn...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
          <MediaLightbox
            open={mediaLightbox !== null}
            onClose={() => setMediaLightbox(null)}
            src={mediaLightbox?.src ?? ''}
            kind={mediaLightbox?.kind ?? 'image'}
          />
          <Dialog open={taskDetailOpen} onOpenChange={handleTaskDetailDialogOpenChange}>
            <DialogContent className="bg-white dark:bg-zinc-900 rounded-3xl max-w-[540px] w-full shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden max-h-[90vh] p-0 gap-0">
              <DialogHeader className="shrink-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                    <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="font-extrabold text-[18px] text-foreground">Chi tiết công việc</h3>
                </div>
              </DialogHeader>
              {taskDetail ? (
                <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      {taskDetail.actorLabel ? (
                        <div className="text-[12px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                          {taskDetail.actorLabel}
                        </div>
                      ) : null}
                      <div className="text-[20px] font-black text-foreground break-words leading-snug">
                        {taskDetail.title}
                      </div>
                    </div>
                    <div className="space-y-4">
                      {(() => {
                        const t = taskDetailTaskId
                          ? ((groupTasks ?? []).find(
                              (x: any) => String(x?.taskId) === String(taskDetailTaskId),
                            ) as any)
                          : null;
                        if (!t && !taskDetail.assigneeLabel) return null;
                        const nameById = new Map(
                          (groupMembers ?? []).map((m) => [
                            String(m.userId),
                            String(m.displayName ?? (m as any)?.name ?? m.userId ?? '').trim(),
                          ]),
                        );
                        const subs = Array.isArray(t?.subtasks) ? (t.subtasks as any[]) : [];
                        const subAssignees = Array.from(
                          new Set(
                            subs.map((s) => String(s?.assigneeId ?? '').trim()).filter(Boolean),
                          ),
                        );
                        const topAssignees = Array.isArray(t?.assignees)
                          ? (t.assignees as unknown[]).map((x) => String(x)).filter(Boolean)
                          : [];
                        const isAll = Boolean(t?.assignToAll) || Boolean(t?.broadcast);
                        const ids = subs.length > 0 ? subAssignees : topAssignees;
                        const display = isAll
                          ? 'Cả nhóm'
                          : ids.length > 0
                            ? ids.map((id) => nameById.get(id) || id).join(', ')
                            : (taskDetail.assigneeLabel ?? '');
                        if (!display.trim()) return null;
                        return (
                          <div className="flex items-start gap-3 text-[14px]">
                            <Users className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="font-bold text-muted-foreground mr-1.5 block mb-0.5">
                                Giao cho:
                              </span>
                              <span className="text-foreground font-semibold" title={display}>
                                {display}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      {(() => {
                        const ids = taskDetail.participantIds ?? [];
                        if (ids.length === 0) {
                          return (
                            <div className="flex items-start gap-3 text-[14px]">
                              <CircleCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-muted-foreground block mb-0.5">
                                  Đã tham gia:
                                </span>
                                <span className="text-muted-foreground/80 italic font-medium">
                                  Chưa có ai
                                </span>
                              </div>
                            </div>
                          );
                        }
                        const nameById = new Map(
                          (groupMembers ?? []).map((m) => [
                            String(m.userId),
                            String(m.displayName ?? (m as any)?.name ?? m.userId ?? '').trim(),
                          ]),
                        );
                        const names = ids.map((id) => {
                          const uid = String(id);
                          const label =
                            uid === String(currentUserId) ? 'Bạn' : (nameById.get(uid) ?? uid);
                          return { id: uid, label };
                        });
                        return (
                          <div className="flex items-start gap-3 text-[14px]">
                            <CircleCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 w-full">
                              <span className="font-bold text-muted-foreground block mb-1.5">
                                Đã tham gia ({ids.length}):
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {names.map((n) => (
                                  <span
                                    key={n.id}
                                    className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20 px-3 py-1 text-[12px] font-bold text-indigo-700 dark:text-indigo-300"
                                  >
                                    {n.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {taskDetail.dueDate ? (
                        <div className="flex items-start gap-3 text-[14px]">
                          <AlarmClock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0 flex flex-wrap items-center gap-2.5">
                            <span className="font-bold text-muted-foreground">Hạn hoàn thành:</span>
                            <TaskDeadlineCalendar dateIso={taskDetail.dueDate} size="md" />
                          </div>
                        </div>
                      ) : null}
                      {taskDetail.note ? (
                        <div className="flex items-start gap-3 text-[14px]">
                          <FileText className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0 w-full">
                            <span className="font-bold text-muted-foreground block mb-1">
                              Ghi chú:
                            </span>
                            <div className="rounded-xl border border-black/5 dark:border-white/5 bg-slate-50 dark:bg-zinc-800/50 p-3.5">
                              <div className="whitespace-pre-line break-words text-[14px] leading-relaxed font-medium text-foreground">
                                {taskDetail.note}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {taskDetail.subtasks && taskDetail.subtasks.length > 0 ? (
                      <div className="pt-2">
                        <div className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span>Công việc theo từng người</span>
                          <span className="bg-slate-100 dark:bg-zinc-800 text-muted-foreground px-2 py-0.5 rounded-full text-[10px]">
                            {taskDetail.subtasks.length} mục
                          </span>
                        </div>
                        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/50 overflow-hidden divide-y divide-black/5 dark:divide-white/5">
                          {taskDetail.subtasks.map((s, idx) => {
                            const done = Boolean(s?.done);
                            const name = String(s?.assigneeName ?? '').trim();
                            const content = String(s?.content ?? '').trim();
                            const line = `${done ? '✓' : '•'} ${name} — ${content}`;
                            return (
                              <div
                                key={`${idx}-${line}`}
                                className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-900/50"
                              >
                                <span
                                  className={`mt-[2px] inline-flex size-[22px] shrink-0 items-center justify-center rounded-full text-[12px] font-black shadow-sm ${
                                    done
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : 'bg-slate-100 dark:bg-zinc-800 text-muted-foreground border border-black/5 dark:border-white/5'
                                  }`}
                                  aria-hidden
                                >
                                  {done ? '✓' : '•'}
                                </span>
                                <div className="min-w-0 flex-1" title={line}>
                                  <div
                                    className={`text-[14px] font-extrabold ${
                                      done
                                        ? 'text-muted-foreground line-through'
                                        : 'text-foreground'
                                    }`}
                                  >
                                    {name || 'Thành viên'}
                                  </div>
                                  <div
                                    className={`mt-1 text-[14px] font-medium break-words whitespace-pre-line leading-relaxed ${
                                      done
                                        ? 'text-muted-foreground line-through'
                                        : 'text-muted-foreground/90'
                                    }`}
                                  >
                                    {content || '…'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
          {mediaContextMenu && (
            <ImageMessageContextMenu
              open
              mediaKind={mediaContextMenu.kind}
              anchorX={mediaContextMenu.x}
              anchorY={mediaContextMenu.y}
              onClose={() => setMediaContextMenu(null)}
              isMe={mediaContextMenu.msg.senderId === currentUserId}
              isPinned={!!mediaContextMenu.msg.isPinned}
              onReply={() => {
                onReply(mediaContextMenu.msg);
              }}
              onShare={() => {
                if (!mediaContextMenu) return;
                setForwardMediaMessage(mediaContextMenu.msg);
              }}
              onCopyImage={() => void copyImageToClipboard(imageDisplaySrc(mediaContextMenu.msg))}
              onSaveToDevice={() =>
                void handleMediaDownload(
                  mediaContextMenu.msg.messageId,
                  mediaContextMenu.kind === 'video'
                    ? (mediaContextMenu.msg.mediaUrl as string)
                    : imageDisplaySrc(mediaContextMenu.msg),
                  mediaContextMenu.msg.mediaOriginalName?.trim() ||
                    (mediaContextMenu.kind === 'video' ? 'video.mp4' : 'image.jpg'),
                )
              }
              onTogglePin={() => void onTogglePin(mediaContextMenu.msg)}
              onRecall={() => void onRecall(mediaContextMenu.msg)}
              onDeleteForMe={() => void onDelete(mediaContextMenu.msg)}
            />
          )}
          <ForwardMediaPickerModal
            open={forwardMediaMessage !== null}
            onClose={() => setForwardMediaMessage(null)}
            conversations={shareTargetConversations}
            excludeConversationId={activeConversationId}
            message={forwardMediaMessage}
            onShare={async (conversationIds, caption) => {
              if (!forwardMediaMessage) return;
              await onForwardMediaMessage(conversationIds, forwardMediaMessage, caption);
            }}
          />
        </>
      )}
    </div>
  );
}
