import { useState, useRef, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import EmojiPicker from 'emoji-picker-react';
import {
  BarChart2,
  CheckSquare,
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
import { apiClient } from '@/services/api';
import type { RootState } from '@/store/store';
import { useTheme } from '@/contexts/ThemeContext';
import {
  canUserCreatePollInGroup,
  canUserCreateTaskInGroup,
  canUserSendMessageInGroup,
} from '@/utils/groupConversationPermissions';
import { GroupMemberSendRestrictedBar } from '@/components/chat/GroupMemberSendRestrictedBar';
import {
  ChatPendingAttachmentsStrip,
  type PendingAttachment,
} from '@/components/chat/ChatPendingAttachmentsStrip';
import type { GroupMember } from '@/types/chat.group.types';

export type { PendingAttachment };

type ChatComposerProps = {
  activeConversation: IConversation | undefined;
  activeConversationId: string | null;
  /** Vai trĂ² trong nhĂ³m (Ä‘á»ƒ khá»›p quyá»n `groupSettings.memberPermissions`). */
  currentUserRole?: GroupMemberRole;
  onOpenPoll: () => void;
  onOpenTask: () => void;
  onOpenAISummary?: () => void;
  groupMembers?: GroupMember[];
};

export function ChatComposer({
  activeConversation,
  activeConversationId,
  currentUserRole,
  onOpenPoll,
  onOpenTask,
  onOpenAISummary,
  groupMembers = [],
}: ChatComposerProps) {
  type VoiceUiState = 'idle' | 'active-ui' | 'cancelled-ui';

  const { theme } = useTheme();
  const currentUserId = useSelector((state: RootState) => state.auth.user?.userId ?? '');
  const [aiReplyLoading, setAiReplyLoading] = useState(false);
  const [showAiQuickReplies, setShowAiQuickReplies] = useState(true);

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
  } = useChatComposerController(
    activeConversationId,
    activeConversation,
    currentUserRole,
    currentUserId,
    groupMembers,
  );

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
    void handleSendMessage('đŸ‘');
  };

  const handleVoiceUiClick = () => {
    if (voiceDisabled) return;
    setVoiceUiState((prev) => (prev === 'active-ui' ? 'idle' : 'active-ui'));
  };

  const appendFromFileList = (list: FileList | null) => {
    if (!list?.length) return;
    addPendingFiles(Array.from(list));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!activeConversationId || busy) return;

    const files: File[] = [];
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item?.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }
    if (files.length === 0 && e.clipboardData.files?.length) {
      files.push(...Array.from(e.clipboardData.files));
    }

    if (files.length === 0) return;

    e.preventDefault();
    addPendingFiles(files);
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

  const canSendInGroup = useMemo(() => {
    if (activeConversation?.type !== 'group') return true;
    return canUserSendMessageInGroup({
      conversation: activeConversation,
      userRole: currentUserRole,
      userId: currentUserId,
      members: groupMembers,
    });
  }, [activeConversation, currentUserRole, currentUserId, groupMembers]);

  if (groupDisbanded) {
    return (
      <div className="relative z-20 flex shrink-0 flex-col gap-2 border-t border-black/5 bg-ethereal-bg/80 p-4 backdrop-blur-md dark:border-white/5 dark:bg-midnight-bg/80 sm:p-6">
        <p className="text-center text-[15px] font-semibold text-slate-700 dark:text-slate-200">
          NhĂ³m Ä‘Ă£ Ä‘Æ°á»£c giáº£i tĂ¡n
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Không thể gửi tin nhắn mới trong cuộc trò chuyện này.
        </p>
      </div>
    );
  }

  if (!canSendInGroup) {
    return <GroupMemberSendRestrictedBar />;
  }

  return (
    <div className="relative z-20 p-4 sm:p-6 border-t border-black/5 dark:border-white/5 shrink-0 bg-ethereal-bg/80 dark:bg-midnight-bg/80 backdrop-blur-md flex flex-col gap-3">
      {replyingTo && (
        <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 px-4 py-3 rounded-xl border-l-4 border-blue-600 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-blue-600 mb-0.5">
              Äang tráº£ lá»i {replyingTo.senderDisplayName ?? replyingTo.senderId}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyingTo.isRecalled ? 'Tin nháº¯n Ä‘Ă£ Ä‘Æ°á»£c thu há»“i' : replyingTo.content}
            </p>
          </div>

          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={
                    !activeConversationId ||
                    !currentUserId ||
                    aiReplyLoading ||
                    replyingTo.isRecalled
                  }
                  onClick={async () => {
                    if (!activeConversationId) return;
                    if (!currentUserId) {
                      toast.error('KhĂ´ng tĂ¬m tháº¥y thĂ´ng tin ngÆ°á»i dĂ¹ng hiá»‡n táº¡i.');
                      return;
                    }
                    if (replyingTo.isRecalled) {
                      toast.info('Tin nháº¯n Ä‘Ă£ thu há»“i, khĂ´ng thá»ƒ gá»£i Ă½ tráº£ lá»i.');
                      return;
                    }

                    setAiReplyLoading(true);
                    try {
                      const res = await apiClient.post<{
                        success: boolean;
                        data: { suggestions: string[]; model: string; tokensUsed: number };
                      }>('/ai/suggest-reply-context', {
                        conversationId: activeConversationId,
                        meUserId: currentUserId,
                        theirUserId: replyingTo.senderId,
                        anchorMessageId: replyingTo.messageId,
                      });

                      const suggestions = res.data?.data?.suggestions ?? [];
                      const first = suggestions[0]?.trim();
                      if (!first) {
                        toast.warning('AI chÆ°a tráº£ vá» gá»£i Ă½ phĂ¹ há»£p.');
                        return;
                      }

                      setInputText(first);
                      window.setTimeout(() => textareaRef.current?.focus(), 0);
                    } catch {
                      toast.error('Gá»£i Ă½ tráº£ lá»i tháº¥t báº¡i. Vui lĂ²ng thá»­ láº¡i.');
                    } finally {
                      setAiReplyLoading(false);
                    }
                  }}
                  aria-label="AI gá»£i Ă½ cĂ¢u tráº£ lá»i"
                  className="p-1.5 rounded-full hover:bg-muted transition-colors text-blue-600 disabled:opacity-45 disabled:pointer-events-none"
                >
                  {aiReplyLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">AI gá»£i Ă½ tráº£ lá»i</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* X thay Smile â€” semantic Ä‘Ăºng hÆ¡n cho nĂºt Ä‘Ă³ng (Hamtech Rule) */}
          <button
            type="button"
            onClick={clearReply}
            aria-label="Há»§y tráº£ lá»i tin nháº¯n"
            className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <ChatPendingAttachmentsStrip
        attachments={pendingAttachments}
        onRemove={removePendingAttachment}
        removeDisabled={mediaUploading}
      />

      <TooltipProvider delayDuration={300}>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="relative" ref={emojiPickerRef}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  aria-label="Má»Ÿ báº£ng chá»n emoji"
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-blue-600"
                >
                  <Smile className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Emoji / NhĂ£n dĂ¡n</TooltipContent>
            </Tooltip>
            {showEmojiPicker && (
              <div
                ref={emojiPanelRef}
                className="absolute bottom-full left-0 z-[200] mb-2 animate-in overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl fade-in zoom-in-95 duration-150"
                style={{ transform: `translateX(${emojiTranslateX}px)` }}
              >
                <EmojiPicker onEmojiClick={onEmojiClick} theme={theme as any} />
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
                aria-label="ThĂªm áº£nh hoáº·c video"
                className="shrink-0 rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-blue-600 disabled:pointer-events-none disabled:opacity-40"
              >
                <Image className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">ThĂªm áº£nh/video</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={actionDisabled}
                onClick={() => fileInputRef.current?.click()}
                aria-label="ThĂªm tá»‡p tĂ i liá»‡u"
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
                aria-label="NĂºt voice báº£n xem trÆ°á»›c UI"
                aria-pressed={voiceUiState === 'active-ui'}
                title={
                  voiceUiState === 'active-ui'
                    ? 'Äang mĂ´ phá»ng ghi Ă¢m'
                    : voiceUiState === 'cancelled-ui'
                      ? 'ÄĂ£ há»§y mĂ´ phá»ng ghi Ă¢m'
                      : 'Voice UI preview (chÆ°a ghi Ă¢m tháº­t)'
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={!activeConversationId}
                aria-label={showAiQuickReplies ? 'Táº¯t gá»£i Ă½ AI' : 'Báº­t gá»£i Ă½ AI'}
                aria-pressed={showAiQuickReplies}
                onClick={() => setShowAiQuickReplies((prev) => !prev)}
                className={[
                  'shrink-0 rounded-lg p-2 transition-all disabled:pointer-events-none disabled:opacity-40',
                  showAiQuickReplies
                    ? 'bg-blue-600/10 text-blue-600 hover:bg-blue-600/15'
                    : 'text-muted-foreground hover:bg-muted hover:text-blue-600',
                ].join(' ')}
              >
                <Sparkles className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {showAiQuickReplies ? 'Táº¯t gá»£i Ă½ AI' : 'Báº­t gá»£i Ă½ AI'}
            </TooltipContent>
          </Tooltip>

          {activeConversation?.type === 'group' && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (
                    !canUserCreatePollInGroup({
                      conversation: activeConversation,
                      userRole: currentUserRole,
                      userId: currentUserId,
                    })
                  ) {
                    toast.error('NhĂ³m khĂ´ng cho phĂ©p thĂ nh viĂªn táº¡o bĂ¬nh chá»n.');
                    return;
                  }
                  onOpenPoll();
                }}
                title="Táº¡o bĂ¬nh chá»n (Poll)"
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
                      userId: currentUserId,
                    })
                  ) {
                    toast.error(
                      'NhĂ³m khĂ´ng cho phĂ©p thĂ nh viĂªn táº¡o cĂ´ng viá»‡c / nháº¯c háº¹n.',
                    );
                    return;
                  }
                  onOpenTask();
                }}
                title="Giao viá»‡c / Nháº¯c háº¹n"
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0"
              >
                <CheckSquare className="w-5 h-5" />
              </button>
              <button
                type="button"
                title="AI TĂ³m táº¯t nhĂ³m"
                onClick={() => onOpenAISummary?.()}
                disabled={!activeConversationId || !onOpenAISummary}
                className="ml-2 shrink-0 inline-flex items-center gap-2 rounded-lg border border-blue-600/20 bg-blue-600/5 p-2 text-xs font-bold text-blue-600 transition-all hover:bg-blue-600/10 hover:text-blue-700 disabled:opacity-45 disabled:pointer-events-none"
              >
                <Sparkles className="size-4" />
                <span>TĂ³m táº¯t Tin nháº¯n</span>
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
              <TooltipContent side="top">Báº£ng tráº¯ng tÆ°Æ¡ng tĂ¡c</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>

      {showAiQuickReplies && (
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
      )}

      <div className="relative flex items-end gap-2">
        <div className="relative flex flex-1 flex-col rounded-xl border border-border/45 bg-muted/35 transition-all focus-within:border-border focus-within:bg-background/90">
          <textarea
            ref={textareaRef}
            placeholder={
              activeConversation
                ? `Nháº­p tin nháº¯n tá»›i ${activeConversation.name ?? 'há»™i thoáº¡i'}...`
                : 'Chá»n há»™i thoáº¡i Ä‘á»ƒ nháº¯n tin'
            }
            rows={1}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => handleKeyDown(e)}
            onPaste={handlePaste}
            disabled={!activeConversationId}
            aria-label="Soáº¡n tin nháº¯n"
            className="max-h-32 min-h-10 w-full resize-none bg-transparent px-3.5 py-2.5 text-sm font-medium leading-5 outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasSendable ? (
            <button
              type="button"
              onClick={() => void handleSendMessage()}
              disabled={sendDisabled}
              aria-label={busy ? 'Äang gá»­i tin nháº¯n' : 'Gá»­i tin nháº¯n'}
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
              aria-label="Gá»­i like nhanh"
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
