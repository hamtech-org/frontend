import { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
  BarChart2,
  CheckSquare,
  FileText,
  Image,
  Loader2,
  Mic,
  Paperclip,
  Palette,
  Send,
  Smile,
  Sparkles,
  ThumbsUp,
  X,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { IConversation } from '@/types/chat.types';
import type { GroupMemberRole } from '@/types/chat.group.types';
import { useChatComposerController } from '@/pages/user/chat-page/hooks/useChatComposerController';
import { toast } from 'react-toastify';
import { AiQuickReplies } from '@/components/chat/AiQuickReplies';
import {
  canUserCreatePollInGroup,
  canUserCreateTaskInGroup,
} from '@/utils/groupConversationPermissions';

export type PendingAttachment = {
  localId: string;
  file: File;
  previewUrl: string | null;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ChatComposerProps = {
  activeConversation: IConversation | undefined;
  activeConversationId: string | null;
  /** Vai trò trong nhóm (để khớp quyền `groupSettings.memberPermissions`). */
  currentUserRole?: GroupMemberRole;
  onOpenPoll: () => void;
  onOpenTask: () => void;
  onOpenAISummary?: () => void;
};

export function ChatComposer({
  activeConversation,
  activeConversationId,
  currentUserRole,
  onOpenPoll,
  onOpenTask,
  onOpenAISummary,
}: ChatComposerProps) {
  type VoiceUiState = 'idle' | 'active-ui' | 'cancelled-ui';

  const {
    inputText,
    isSending,
    pendingAttachments,
    replyingTo,
    setInputText,
    addPendingFiles,
    removePendingAttachment,
    handleSendMessage,
    handleKeyDown,
    handleTyping,
    clearReply,
    mediaUploading,
    composerStatusMessage,
  } = useChatComposerController(activeConversationId);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emojiTranslateX, setEmojiTranslateX] = useState(0);
  const [voiceUiState, setVoiceUiState] = useState<VoiceUiState>('idle');
  const busy = isSending || mediaUploading;
  const hasTypedMessage = inputText.trim().length > 0;
  const hasSendable = hasTypedMessage || pendingAttachments.length > 0;
  const sendDisabled = !activeConversationId || busy;
  const actionDisabled = !activeConversationId;
  const voiceDisabled = !activeConversationId;

  useEffect(() => {
    if (voiceUiState !== 'active-ui') return;
    const timer = window.setTimeout(() => {
      setVoiceUiState('cancelled-ui');
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [voiceUiState]);

  useEffect(() => {
    if (voiceUiState !== 'cancelled-ui') return;
    const timer = window.setTimeout(() => {
      setVoiceUiState('idle');
    }, 900);
    return () => window.clearTimeout(timer);
  }, [voiceUiState]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!showEmojiPicker) {
      setEmojiTranslateX(0);
      return;
    }

    const updateEmojiPopoverPosition = () => {
      const triggerEl = emojiPickerRef.current;
      const panelEl = emojiPanelRef.current;
      if (!triggerEl || !panelEl) return;

      const viewportPadding = 8;
      const triggerRect = triggerEl.getBoundingClientRect();
      const panelWidth = panelEl.getBoundingClientRect().width;

      let nextTranslateX = 0;
      const overflowRight = triggerRect.left + panelWidth + viewportPadding - window.innerWidth;
      if (overflowRight > 0) {
        nextTranslateX -= overflowRight;
      }

      const leftEdgeAfterTranslate = triggerRect.left + nextTranslateX;
      if (leftEdgeAfterTranslate < viewportPadding) {
        nextTranslateX += viewportPadding - leftEdgeAfterTranslate;
      }

      setEmojiTranslateX(nextTranslateX);
    };

    const rafId = window.requestAnimationFrame(updateEmojiPopoverPosition);
    window.addEventListener('resize', updateEmojiPopoverPosition);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateEmojiPopoverPosition);
    };
  }, [showEmojiPicker]);

  const onEmojiClick = (emojiObject: { emoji: string }) => {
    setInputText(inputText + emojiObject.emoji);
  };

  const handleLikeClick = () => {
    if (sendDisabled) return;
    void handleSendMessage('👍');
  };

  const handleVoiceUiClick = () => {
    if (voiceDisabled) return;
    setVoiceUiState((prev) => (prev === 'active-ui' ? 'idle' : 'active-ui'));
  };

  const appendFromFileList = (list: FileList | null) => {
    if (!list?.length) return;
    addPendingFiles(Array.from(list));
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    appendFromFileList(e.target.files);
    e.target.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    appendFromFileList(e.target.files);
    e.target.value = '';
  };

  const groupDisbanded = activeConversation?.type === 'group' && !!activeConversation.isDeleted;

  if (groupDisbanded) {
    return (
      <div className="flex shrink-0 flex-col gap-2 border-t border-black/5 bg-ethereal-bg/80 p-4 backdrop-blur-md dark:border-white/5 dark:bg-midnight-bg/80 sm:p-6">
        <p className="text-center text-[15px] font-semibold text-slate-700 dark:text-slate-200">
          Nhóm đã được giải tán
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Không thể gửi tin nhắn mới trong cuộc trò chuyện này.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 border-t border-black/5 dark:border-white/5 shrink-0 bg-ethereal-bg/80 dark:bg-midnight-bg/80 backdrop-blur-md flex flex-col gap-3">
      {replyingTo && (
        <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 px-4 py-3 rounded-xl border-l-4 border-blue-600 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-blue-600 mb-0.5">
              Đang trả lời {replyingTo.senderDisplayName ?? replyingTo.senderId}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyingTo.isRecalled ? 'Tin nhắn đã được thu hồi' : replyingTo.content}
            </p>
          </div>
          {/* X thay Smile — semantic đúng hơn cho nút đóng (Hamtech Rule) */}
          <button
            type="button"
            onClick={clearReply}
            aria-label="Hủy trả lời tin nhắn"
            className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10 bg-black/3 dark:bg-white/4 p-2">
          {pendingAttachments.map((p) => (
            <div
              key={p.localId}
              className="relative group/at shrink-0 w-18 rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 overflow-hidden"
            >
              {p.previewUrl ? (
                p.file.type.startsWith('video/') ? (
                  <video
                    src={p.previewUrl}
                    muted
                    playsInline
                    className="h-16 w-full object-cover bg-zinc-200/40 dark:bg-zinc-700/40"
                  />
                ) : (
                  <img
                    src={p.previewUrl}
                    alt=""
                    className="h-16 w-full object-contain bg-zinc-100/90 dark:bg-zinc-800/80"
                  />
                )
              ) : (
                <div className="h-16 w-full flex flex-col items-center justify-center gap-0.5 px-1 bg-black/5 dark:bg-white/5">
                  <FileText className="w-6 h-6 text-muted-foreground shrink-0" />
                </div>
              )}
              <div className="px-1 py-0.5 border-t border-black/5 dark:border-white/5">
                <p className="text-[9px] font-medium truncate leading-tight" title={p.file.name}>
                  {p.file.name}
                </p>
                <p className="text-[8px] text-muted-foreground">{formatFileSize(p.file.size)}</p>
              </div>
              <button
                type="button"
                title="Bỏ file"
                onClick={() => removePendingAttachment(p.localId)}
                disabled={mediaUploading}
                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-90 hover:opacity-100 disabled:opacity-40"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <TooltipProvider delayDuration={300}>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="relative" ref={emojiPickerRef}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  aria-label="Mở bảng chọn emoji"
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-blue-600"
                >
                  <Smile className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Emoji / Nhãn dán</TooltipContent>
            </Tooltip>
            {showEmojiPicker && (
              <div
                ref={emojiPanelRef}
                className="absolute bottom-full left-0 z-50 mb-2 animate-in overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl fade-in zoom-in-95 duration-150"
                style={{ transform: `translateX(${emojiTranslateX}px)` }}
              >
                <EmojiPicker onEmojiClick={onEmojiClick} theme={'auto' as any} />
              </div>
            )}
          </div>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleGalleryChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,audio/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={actionDisabled}
                onClick={() => galleryInputRef.current?.click()}
                aria-label="Thêm ảnh hoặc video"
                className="shrink-0 rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-blue-600 disabled:pointer-events-none disabled:opacity-40"
              >
                <Image className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Thêm ảnh/video</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={actionDisabled}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Thêm tệp tài liệu"
                className="shrink-0 rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-blue-600 disabled:pointer-events-none disabled:opacity-40"
              >
                <Paperclip className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Thêm tài liệu</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleVoiceUiClick}
                disabled={voiceDisabled}
                aria-label="Nút voice bản xem trước UI"
                aria-pressed={voiceUiState === 'active-ui'}
                title={
                  voiceUiState === 'active-ui'
                    ? 'Đang mô phỏng ghi âm'
                    : voiceUiState === 'cancelled-ui'
                      ? 'Đã hủy mô phỏng ghi âm'
                      : 'Voice UI preview (chưa ghi âm thật)'
                }
                className="shrink-0 rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-blue-600 disabled:pointer-events-none disabled:opacity-40"
              >
                {voiceUiState === 'active-ui' ? (
                  <Loader2 className="size-5 animate-spin text-blue-600" />
                ) : (
                  <Mic
                    className={
                      voiceUiState === 'cancelled-ui'
                        ? 'size-5 text-orange-500'
                        : 'size-5 text-inherit'
                    }
                  />
                )}
                <span className="sr-only">Voice UI placeholder</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Voice (preview)</TooltipContent>
          </Tooltip>

          <div className="mx-0.5 h-5 w-px bg-border sm:mx-1" />

          {activeConversation?.type === 'group' && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (
                    !canUserCreatePollInGroup({
                      conversation: activeConversation,
                      userRole: currentUserRole,
                    })
                  ) {
                    toast.error('Nhóm không cho phép thành viên tạo bình chọn.');
                    return;
                  }
                  onOpenPoll();
                }}
                title="Tạo bình chọn (Poll)"
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0"
              >
                <BarChart2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    !canUserCreateTaskInGroup({
                      conversation: activeConversation,
                      userRole: currentUserRole,
                    })
                  ) {
                    toast.error('Nhóm không cho phép thành viên tạo công việc / nhắc hẹn.');
                    return;
                  }
                  onOpenTask();
                }}
                title="Giao việc / Nhắc hẹn"
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0"
              >
                <CheckSquare className="w-5 h-5" />
              </button>
              <button
                type="button"
                title="AI Tóm tắt nhóm"
                onClick={() => onOpenAISummary?.()}
                disabled={!activeConversationId || !onOpenAISummary}
                className="ml-2 shrink-0 inline-flex items-center gap-2 rounded-lg border border-blue-600/20 bg-blue-600/5 p-2 text-xs font-bold text-blue-600 transition-all hover:bg-blue-600/10 hover:text-blue-700 disabled:opacity-45 disabled:pointer-events-none"
              >
                <Sparkles className="size-4" />
                <span>Tóm tắt Tin nhắn</span>
              </button>
            </>
          )}

          {activeConversation?.type === 'direct' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="hidden shrink-0 rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-blue-600 sm:block"
                >
                  <Palette className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Bảng trắng tương tác</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>

      <AiQuickReplies
        activeConversationId={activeConversationId}
        inputText={inputText}
        type="reply"
        language="vi"
        textareaRef={textareaRef}
        onPickReply={(text) => {
          setInputText(text);
        }}
      />

      <div className="relative flex items-end gap-2">
        <div className="relative flex flex-1 flex-col rounded-xl border border-border/45 bg-muted/35 transition-all focus-within:border-border focus-within:bg-background/90">
          <textarea
            ref={textareaRef}
            placeholder={
              activeConversation
                ? `Nhập tin nhắn tới ${activeConversation.name ?? 'hội thoại'}...`
                : 'Chọn hội thoại để nhắn tin'
            }
            rows={1}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => handleKeyDown(e)}
            disabled={!activeConversationId}
            aria-label="Soạn tin nhắn"
            className="max-h-32 min-h-10 w-full resize-none bg-transparent px-3.5 py-2.5 text-sm font-medium leading-5 outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasSendable ? (
            <button
              type="button"
              onClick={() => void handleSendMessage()}
              disabled={sendDisabled}
              aria-label={busy ? 'Đang gửi tin nhắn' : 'Gửi tin nhắn'}
              className="group animate-in flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/20 transition-all fade-in zoom-in hover:-translate-y-0.5 hover:from-blue-600 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-600/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:from-blue-600 disabled:hover:to-blue-700"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Send className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLikeClick}
              disabled={sendDisabled}
              aria-label="Gửi like nhanh"
              className="group animate-in flex size-10 items-center justify-center rounded-lg border border-border/60 bg-muted/45 text-blue-600 shadow-sm transition-all fade-in zoom-in hover:-translate-y-0.5 hover:border-blue-600/30 hover:bg-blue-600 hover:text-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            >
              <ThumbsUp className="size-5 transition-transform group-hover:scale-110" />
            </button>
          )}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {composerStatusMessage}
      </p>
    </div>
  );
}
