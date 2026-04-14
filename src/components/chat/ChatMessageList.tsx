import { useState, type Ref } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCheck,
  CalendarClock,
  ClipboardList,
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
} from 'lucide-react';
import type { IConversation, IMessage } from '@/types/chat.types';
import type { TypingUserEntry } from '@/store/slices/chatSlice';
import { formatTime, formatDate } from '@/utils/formatDate';
import { typingInitial, typingLabel } from '@/utils/chatUtils';
import { AuthenticatedMedia } from '@/components/chat/AuthenticatedMedia';
import { formatFileSize } from '@/utils/fileHelper';
import { apiClient } from '@/services/api';
import { toast } from 'react-toastify';

async function downloadAuthedFile(url: string, filename: string): Promise<void> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename || 'file';
  a.click();
  URL.revokeObjectURL(objectUrl);
}

function isRichMediaMessage(msg: IMessage): boolean {
  return msg.type === 'image' || msg.type === 'video' || msg.type === 'file';
}

function messageHasCaption(msg: IMessage): boolean {
  return (msg.content ?? '').trim().length > 0;
}

type CallLogContent =
  | { kind: 'completed' | 'missed' | 'rejected'; callType: 'audio' | 'video'; durationSec?: number }
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
  onTaskJoined?: (taskId: string) => void;
};

export function ChatMessageList({
  messagesContainerRef,
  messagesEndRef,
  allMessages,
  activeConversationId,
  activeConversation,
  currentUserId,
  typingUsers,
  unreadIncomingCount,
  actionMenuMsgId,
  onActionMenuMsgIdChange,
  onStartEdit,
  onTogglePin,
  onRecall,
  onDelete,
  onReply,
  onReact,
  onJumpToLatest,
  groupTasks,
  onTaskJoined,
}: ChatMessageListProps) {
  const scrollToMessage = (messageId: string) => {
    document.getElementById(`chat-msg-${messageId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const [hiddenReactPopupId, setHiddenReactPopupId] = useState<string | null>(null);

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-1 min-h-0 custom-scrollbar"
    >
      {!activeConversationId && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-bold opacity-40">Chọn hội thoại để bắt đầu nhắn tin</p>
        </div>
      )}
      {activeConversationId && (
        <>
          {allMessages.map((msg, index) => {
            // Centered system message for group events (e.g. name change, received, etc.)
            if (
              (msg as any).type === 'system' || (msg as any).position === 'center'
            ) {
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
                  content = content.replace(name, 'Bạn');
                }
              }

              // Task assigned card payload (JSON) -> render modern card UI.
              let taskCard: null | {
                taskId: string;
                actorName: string;
                title: string;
                dueDate: string | null;
                note: string | null;
                assigneeLabel: string;
              } = null;
              let taskJoinedLine: null | { actorName: string; title: string } = null;
              if (typeof content === 'string' && content.trim().startsWith('{')) {
                try {
                  const obj = JSON.parse(content) as any;
                  if (obj?.kind === 'task_assigned' && obj?.task?.title) {
                    taskCard = {
                      taskId: String(obj?.task?.taskId ?? ''),
                      actorName: String(obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó'),
                      title: String(obj.task.title ?? ''),
                      dueDate: obj.task.dueDate ? String(obj.task.dueDate) : null,
                      note: obj.task.note ? String(obj.task.note) : null,
                      assigneeLabel: String(obj.task.assigneeLabel ?? 'cả nhóm'),
                    };
                  }
                  if (obj?.kind === 'task_joined') {
                    taskJoinedLine = {
                      actorName: String(obj?.actor?.name ?? msg.senderDisplayName ?? 'Ai đó'),
                      title: String(obj?.task?.title ?? ''),
                    };
                  }
                } catch {
                  taskCard = null;
                }
              }

              return (
                <div key={msg.messageId} className="w-full flex flex-col items-center my-3 select-none">
                  <span className="mb-2 bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60 text-xs px-3 py-1 rounded-full font-medium">
                    {showDate ? `${timeLabel} ${dateLabel}` : timeLabel}
                  </span>
                  <div
                    className="bg-[#f1f1f1] dark:bg-zinc-800 px-3 py-2 rounded-2xl shadow-sm"
                    style={{ minWidth: 220, maxWidth: 420 }}
                  >
                    {taskCard ? (
                      <div className="w-full">
                        {(() => {
                          const t = (groupTasks ?? []).find((x: any) => String(x?.taskId) === String(taskCard?.taskId));
                          const participants = Array.isArray(t?.participants) ? (t.participants as string[]) : [];
                          const participantsCount = participants.length;
                          const joined = participants.includes(currentUserId);
                          const assignees = Array.isArray(t?.assignees) ? (t.assignees as string[]) : [];
                          const canJoinThisTask = assignees.includes(currentUserId);
                          const onJoin = async (): Promise<void> => {
                            if (!activeConversationId || !taskCard?.taskId) return;
                            try {
                              await apiClient.post(`/chat/groups/${activeConversationId}/tasks/${taskCard.taskId}/join`);
                              onTaskJoined?.(taskCard.taskId);
                              toast.success('Bạn đã tham gia công việc');
                            } catch (e) {
                              const status = (e as any)?.response?.status;
                              if (status === 403) toast.error('Bạn không được giao công việc này');
                              else toast.error('Không thể tham gia công việc');
                              console.error('[joinTask]', e);
                            }
                          };
                          return (
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <span className="text-[12px] font-semibold text-muted-foreground">
                                {participantsCount} người đã tham gia
                              </span>
                              <button
                                type="button"
                                onClick={onJoin}
                                disabled={joined || !canJoinThisTask}
                                className={
                                  joined
                                    ? 'px-3 py-1 rounded-full text-[12px] font-semibold bg-black/5 dark:bg-white/10 text-muted-foreground cursor-not-allowed'
                                    : !canJoinThisTask
                                      ? 'px-3 py-1 rounded-full text-[12px] font-semibold bg-blue-600/40 text-white/70 cursor-not-allowed'
                                      : 'px-3 py-1 rounded-full text-[12px] font-semibold bg-blue-600 text-white hover:bg-blue-700'
                                }
                              >
                                {joined ? 'Đã tham gia' : 'Tham gia'}
                              </button>
                            </div>
                          );
                        })()}
                        <div className="flex items-center justify-center gap-2 text-[12px] font-bold text-foreground mb-1.5">
                          <ClipboardList className="w-4 h-4 text-green-600 dark:text-green-400" />
                          Giao việc
                        </div>
                        <div className="rounded-xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/10 px-3 py-2">
                          <div className="text-[12px] font-semibold text-muted-foreground text-center mb-1">
                            {msg.senderId === currentUserId ? 'Bạn' : taskCard.actorName} đã giao việc
                          </div>
                          <div className="text-[13px] font-extrabold text-foreground text-center">
                            {taskCard.title}
                          </div>
                          <div className="mt-2 space-y-1.5 text-[12px] text-muted-foreground">
                            <div className="flex items-center justify-center gap-2">
                              <Users className="w-3.5 h-3.5" />
                              <span className="font-semibold">Giao cho:</span> {taskCard.assigneeLabel}
                            </div>
                            {taskCard.dueDate ? (
                              <div className="flex items-center justify-center gap-2">
                                <CalendarClock className="w-3.5 h-3.5" />
                                <span className="font-semibold">Deadline:</span>{' '}
                                {new Date(taskCard.dueDate).toLocaleString()}
                              </div>
                            ) : null}
                            {taskCard.note ? (
                              <div className="text-center whitespace-pre-line">
                                <span className="font-semibold">Ghi chú:</span> {taskCard.note}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : taskJoinedLine ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                        <span className="text-[12px] font-medium text-[#666] dark:text-zinc-300 whitespace-pre-line text-center">
                          {(msg.senderId === currentUserId ? 'Bạn' : taskJoinedLine.actorName) + ' đã tham gia công việc'}
                          {taskJoinedLine.title ? ` \"${taskJoinedLine.title}\"` : ''}
                        </span>
                      </div>
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
              const durationLabel =
                durationSec > 0
                  ? `${Math.floor(durationSec / 60)} phút ${durationSec % 60} giây`
                  : '0 phút 0 giây';

              const title =
                kind === 'missed'
                  ? 'Cuộc gọi nhỡ'
                  : kind === 'rejected'
                    ? 'Cuộc gọi bị từ chối'
                    : callType === 'video'
                      ? 'Cuộc gọi video'
                      : 'Cuộc gọi thoại';

              return (
                <motion.div
                  id={`chat-msg-${msg.messageId}`}
                  key={msg.messageId}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex justify-center my-3"
                >
                  <div className="min-w-[260px] max-w-[360px] rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {callType === 'video' ? (
                        <Video className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Phone className="w-4 h-4 text-blue-600" />
                      )}
                      <p className="text-sm font-bold text-foreground">{title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{durationLabel}</p>
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
            const showCaption = messageHasCaption(msg);
            return (
              <motion.div
                id={`chat-msg-${msg.messageId}`}
                key={msg.messageId}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`flex items-end gap-2 group/msg ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSameSenderAsPrev ? 'mt-0' : 'mt-1'}`}
              >
                {showAvatar ? (
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm mb-0.5">
                    {(msg.senderDisplayName ?? msg.senderId).trim().slice(0, 1).toUpperCase()}
                  </div>
                ) : isMe ? null : (
                  <div className="w-8 shrink-0" aria-hidden />
                )}

                <div
                  className={`flex flex-col max-w-[55%] sm:max-w-[45%] ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {!isMe && activeConversation?.type === 'group' && !isSameSenderAsPrev && (
                    <p className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 mb-1 px-1">
                      {msg.senderDisplayName ?? msg.senderId}
                    </p>
                  )}

                  <div
                    className={`relative flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${msg.reactions && Object.keys(msg.reactions).length > 0 ? 'mb-3.5' : ''}`}
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
                            ? `relative flex max-w-full min-w-0 flex-col px-0 py-0 rounded-xl text-[13px] leading-snug shadow-none wrap-break-word bg-transparent border-0 text-foreground selection:bg-blue-200 selection:text-black dark:selection:bg-blue-300 dark:selection:text-black ${
                                isMe ? 'items-end' : 'items-start'
                              }`
                            : `relative px-3 py-2 rounded-xl text-[13px] leading-snug shadow-sm wrap-break-word selection:bg-blue-200 selection:text-black dark:selection:bg-blue-300 dark:selection:text-black ${
                                isMe
                                  ? 'bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-br-sm'
                                  : 'bg-white dark:bg-white/8 border border-black/8 dark:border-white/10 text-foreground rounded-bl-sm'
                              }`
                        }
                      >
                        {msg.replyToDetails && (
                          <div
                            onClick={() => scrollToMessage(msg.replyToDetails!.messageId)}
                            className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-l-4 cursor-pointer transition-colors ${
                              isMediaMsg ? 'w-full max-w-[min(100%,20rem)]' : ''
                            } ${
                              isMe && !isMediaMsg
                                ? 'bg-white/10 border-white/30 hover:bg-white/20'
                                : 'bg-black/5 border-blue-500/50 hover:bg-black/10 dark:hover:bg-white/5'
                            }`}
                          >
                            <p
                              className={`text-[10px] font-bold mb-0.5 ${
                                isMe && !isMediaMsg ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {msg.replyToDetails.senderDisplayName ?? msg.replyToDetails.senderId}
                            </p>
                            <p
                              className={`text-[11px] truncate opacity-80 ${
                                isMe && !isMediaMsg ? 'text-white' : 'text-foreground'
                              }`}
                            >
                              {msg.replyToDetails.content?.trim() || '[Media]'}
                            </p>
                          </div>
                        )}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div
                            className={`w-fit max-w-full overflow-hidden rounded-lg ${showCaption || msg.replyToDetails ? 'mb-1.5' : ''}`}
                          >
                            <AuthenticatedMedia
                              src={(msg.thumbnailUrl ?? msg.mediaUrl) as string}
                              kind="image"
                              className="max-h-56 max-w-full object-cover rounded-lg"
                              alt="Ảnh đính kèm"
                            />
                          </div>
                        )}
                        {msg.type === 'video' && msg.mediaUrl && (
                          <div
                            className={`w-fit max-w-[min(100%,20rem)] min-w-0 overflow-hidden rounded-lg ${showCaption || msg.replyToDetails ? 'mb-1.5' : ''}`}
                          >
                            <AuthenticatedMedia
                              src={msg.mediaUrl}
                              kind="video"
                              className="block max-h-64 w-auto max-w-full rounded-lg bg-black/80"
                            />
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
                            <FileText className="w-8 h-8 shrink-0 text-muted-foreground" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <p
                                className="text-xs font-semibold text-foreground truncate"
                                title={msg.mediaOriginalName?.trim() || 'Tệp đính kèm'}
                              >
                                {msg.mediaOriginalName?.trim() || 'Tệp đính kèm'}
                              </p>
                              {msg.mediaSize != null && msg.mediaSize > 0 ? (
                                <p className="text-[10px] text-muted-foreground">{formatFileSize(msg.mediaSize)}</p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              aria-label="Tải xuống"
                              title="Tải xuống"
                              onClick={() =>
                                void downloadAuthedFile(
                                  msg.mediaUrl as string,
                                  msg.mediaOriginalName?.trim() || 'file',
                                )
                              }
                              className="shrink-0 p-2 rounded-lg text-foreground hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {isMediaMsg && showCaption && (
                          <div
                            className={`mt-0.5 max-w-[min(100%,20rem)] px-2.5 py-1.5 rounded-lg text-[13px] whitespace-pre-wrap wrap-break-word ${
                              isMe
                                ? 'bg-black/6 dark:bg-white/10 text-foreground'
                                : 'bg-black/5 dark:bg-white/10 text-foreground'
                            }`}
                          >
                            {msg.content}
                          </div>
                        )}
                        {!isMediaMsg && showCaption && (
                          <span className="whitespace-pre-wrap wrap-break-word">{msg.content}</span>
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
                        <button
                          type="button"
                          title={msg.isPinned ? 'Bỏ ghim' : 'Ghim'}
                          onClick={(e) => {
                            e.stopPropagation();
                            void onTogglePin(msg);
                          }}
                          className="p-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-blue-500/15 transition-colors"
                        >
                          <Pin
                            className={`w-3.5 h-3.5 ${msg.isPinned ? 'text-blue-600' : 'text-muted-foreground hover:text-blue-600'}`}
                          />
                        </button>
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
                      </div>
                    )}
                  </div>

                  {showMeta && (
                    <div
                      className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <span className="text-[10px] text-muted-foreground/70">
                        {formatTime(msg.createdAt)}
                      </span>
                      {isMe && !msg.isRecalled && !msg.isDeleted && (
                        <CheckCheck className="w-3 h-3 text-blue-400" />
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
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm">
                  {typingInitial(typingUsers[0])}
                </div>
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
          {unreadIncomingCount > 0 && (
            <div className="sticky bottom-3 z-20 flex justify-center">
              <button
                type="button"
                onClick={onJumpToLatest}
                className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors"
              >
                {unreadIncomingCount > 1
                  ? `${unreadIncomingCount} tin nhắn mới — bấm để xem`
                  : '1 tin nhắn mới — bấm để xem'}
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
