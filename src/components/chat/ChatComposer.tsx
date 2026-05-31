import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import EmojiPicker from 'emoji-picker-react';
import {
  BarChart2,
  CheckSquare,
  Image,
  Loader2,
  Mic,
  Paperclip,
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
import { escapeMentionLabel } from '@/utils/mentionHelper';

export type { PendingAttachment };

type ChatComposerProps = {
  activeConversation: IConversation | undefined;
  activeConversationId: string | null;
  /** Vai trò trong nhóm (để khớp quyền `groupSettings.memberPermissions`). */
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
  const { theme } = useTheme();
  const currentUserId = useSelector((state: RootState) => state.auth.user?.userId ?? '');
  const [aiReplyLoading, setAiReplyLoading] = useState(false);
  const [showAiQuickReplies, setShowAiQuickReplies] = useState(true);

  // Mentions local state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [mentionsMetadata, setMentionsMetadata] = useState<
    { userId: string; displayName: string }[]
  >([]);

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
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
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
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  const [emojiTranslateX, setEmojiTranslateX] = useState(0);
  const busy = isSending || mediaUploading;
  const hasTypedMessage = inputText.trim().length > 0;
  const hasSendable = hasTypedMessage || pendingAttachments.length > 0;
  const sendDisabled = !activeConversationId || busy;
  const actionDisabled = !activeConversationId;
  const voiceDisabled = !activeConversationId;

  // Filtered mention list
  const filteredMentionMembers = useMemo(() => {
    if (!showMentionDropdown) return [];

    const list = groupMembers.filter((m) => {
      if (m.userId === currentUserId) return false; // Không tự tag chính mình
      const nameLower = (m.displayName || m.name || '').toLowerCase();
      return nameLower.includes(mentionSearchTerm.toLowerCase());
    });

    const showAll =
      'cả nhóm'.includes(mentionSearchTerm.toLowerCase()) ||
      'all'.includes(mentionSearchTerm.toLowerCase()) ||
      mentionSearchTerm === '';
    if (showAll && activeConversation?.type === 'group') {
      return [
        { userId: 'all', displayName: 'Cả nhóm', name: 'Cả nhóm (@All)', avatar: '' },
        ...list,
      ];
    }
    return list;
  }, [showMentionDropdown, groupMembers, mentionSearchTerm, currentUserId, activeConversation]);

  useEffect(() => {
    if (showMentionDropdown && filteredMentionMembers.length === 0) {
      setShowMentionDropdown(false);
    }
  }, [showMentionDropdown, filteredMentionMembers]);

  const handleSelectMention = useCallback(
    (member: { userId: string; displayName?: string; name?: string }) => {
      if (mentionTriggerIndex === -1) return;
      const name = member.displayName || member.name || 'Thành viên';

      const escapedName = escapeMentionLabel(name);

      // Thêm thông tin tag vào metadata local để đổi sang markdown khi bấm gửi
      setMentionsMetadata((prev) => [...prev, { userId: member.userId, displayName: escapedName }]);

      const tag = `@${escapedName} `;

      const beforeAt = inputText.slice(0, mentionTriggerIndex);
      const afterCursor = inputText.slice(mentionTriggerIndex + mentionSearchTerm.length + 1);

      const newText = beforeAt + tag + afterCursor;
      setInputText(newText);
      setShowMentionDropdown(false);

      window.setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const cursorPosition = mentionTriggerIndex + tag.length;
          textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
        }
      }, 0);
    },
    [inputText, mentionTriggerIndex, mentionSearchTerm, setInputText],
  );

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown && filteredMentionMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveMentionIndex((prev) => (prev + 1) % filteredMentionMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveMentionIndex(
          (prev) => (prev - 1 + filteredMentionMembers.length) % filteredMentionMembers.length,
        );
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredMentionMembers[activeMentionIndex];
        if (selected) {
          handleSelectMention(selected as any);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
        return;
      }
    }

    // Intercept Enter key press to convert display tag to raw markdown before sending
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      let processedText = inputText;
      const sortedMetadata = [...mentionsMetadata].sort(
        (a, b) => b.displayName.length - a.displayName.length,
      );

      for (const item of sortedMetadata) {
        const escapedNameForRegex = item.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`@${escapedNameForRegex}`, 'g');
        const replacement =
          item.userId === 'all'
            ? `@[Cả nhóm](mention:all)`
            : `@[${item.displayName}](mention:${item.userId})`;
        processedText = processedText.replace(regex, replacement);
      }

      setMentionsMetadata([]);
      void handleSendMessage(processedText);
      return;
    }

    handleKeyDown(e);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMentionDropdown(false);
      }
    };
    if (showMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMentionDropdown]);

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
    if (isRecording) {
      void stopRecording(false);
    } else {
      void startRecording();
    }
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
  const chatPaused =
    activeConversation?.type === 'group' && activeConversation.chatEnabled === false;

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
          Nhóm đã được giải tán
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Không thể gửi tin nhắn mới trong cuộc trò chuyện này.
        </p>
      </div>
    );
  }

  if (chatPaused) {
    return (
      <div className="relative z-20 flex shrink-0 flex-col gap-2 border-t border-black/5 bg-ethereal-bg/80 p-4 backdrop-blur-md dark:border-white/5 dark:bg-midnight-bg/80 sm:p-6">
        <p className="text-center text-[15px] font-semibold text-slate-700 dark:text-slate-200">
          Trò chuyện tạm dừng
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Trò chuyện đã bị tắt bởi quản trị viên Cộng đồng.
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
              Đang trả lời {replyingTo.senderDisplayName ?? replyingTo.senderId}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyingTo.isRecalled ? 'Tin nhắn đã được thu hồi' : replyingTo.content}
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
                      toast.error('Không tìm thấy thông tin người dùng hiện tại.');
                      return;
                    }
                    if (replyingTo.isRecalled) {
                      toast.info('Tin nhắn đã thu hồi, không thể gợi ý trả lời.');
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
                        toast.warning('AI chưa trả về gợi ý phù hợp.');
                        return;
                      }

                      setInputText(first);
                      window.setTimeout(() => textareaRef.current?.focus(), 0);
                    } catch {
                      toast.error('Gợi ý trả lời thất bại. Vui lòng thử lại.');
                    } finally {
                      setAiReplyLoading(false);
                    }
                  }}
                  aria-label="AI gợi ý câu trả lời"
                  className="p-1.5 rounded-full hover:bg-muted transition-colors text-blue-600 disabled:opacity-45 disabled:pointer-events-none"
                >
                  {aiReplyLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">AI gợi ý trả lời</TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
                aria-label="Ghi âm tin nhắn thoại"
                className={`shrink-0 rounded-lg p-2 transition-all hover:bg-muted disabled:pointer-events-none disabled:opacity-40 ${
                  isRecording
                    ? 'text-red-500 bg-red-500/10 hover:text-red-600 hover:bg-red-500/15'
                    : 'text-muted-foreground hover:text-blue-600'
                }`}
              >
                {isRecording ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Mic className="size-5" />
                )}
                <span className="sr-only">Voice recording trigger</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isRecording ? 'Đang ghi âm (Bấm để hủy)' : 'Ghi âm tin nhắn thoại'}
            </TooltipContent>
          </Tooltip>

          <div className="mx-0.5 h-5 w-px bg-border sm:mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={!activeConversationId}
                aria-label={showAiQuickReplies ? 'Tắt gợi ý AI' : 'Bật gợi ý AI'}
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
              {showAiQuickReplies ? 'Tắt gợi ý AI' : 'Bật gợi ý AI'}
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
                      userId: currentUserId,
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

      {isRecording ? (
        <div className="flex items-center justify-between w-full bg-red-500/5 border border-red-500/20 px-4 py-2.5 rounded-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-duration-1000"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-xs font-semibold text-red-500 tracking-wider">
              ĐANG GHI ÂM TIN NHẮN THOẠI...
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-black text-foreground font-mono">
              {Math.floor(recordingDuration / 60)}:
              {(recordingDuration % 60).toString().padStart(2, '0')}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void stopRecording(false)}
                title="Hủy ghi âm"
                className="p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => void stopRecording(true)}
                title="Gửi tin nhắn thoại"
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex items-end gap-2">
          <div className="relative flex flex-1 flex-col rounded-xl border border-border/45 bg-muted/35 transition-all focus-within:border-border focus-within:bg-background/90">
            {showMentionDropdown && filteredMentionMembers.length > 0 && (
              <div
                ref={mentionDropdownRef}
                className="absolute bottom-full left-0 z-50 mb-2 max-h-60 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-in slide-in-from-bottom-2 duration-150 custom-scrollbar"
              >
                {filteredMentionMembers.map((member, idx) => {
                  const isActive = idx === activeMentionIndex;
                  return (
                    <button
                      key={member.userId}
                      type="button"
                      onClick={() => handleSelectMention(member as any)}
                      onMouseEnter={() => setActiveMentionIndex(idx)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {member.userId === 'all' ? (
                        <div className="size-6 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 font-bold text-[10px]">
                          @
                        </div>
                      ) : member.avatar ? (
                        <img
                          src={member.avatar}
                          alt=""
                          className="size-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-6 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                          {(member.displayName || member.name || 'U').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">
                        {member.displayName || member.name || 'Thành viên'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
                const val = e.target.value;
                setInputText(val);
                handleTyping(val);

                // Mentions trigger detection
                const cursorIndex = e.target.selectionStart;
                const textBeforeCursor = val.slice(0, cursorIndex);
                const lastAtIndex = textBeforeCursor.lastIndexOf('@');

                if (lastAtIndex !== -1 && activeConversation?.type === 'group') {
                  const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
                  // Chỉ trigger khi không chứa dấu cách
                  if (!/\s/.test(textAfterAt)) {
                    setShowMentionDropdown(true);
                    setMentionTriggerIndex(lastAtIndex);
                    setMentionSearchTerm(textAfterAt);
                    setActiveMentionIndex(0);
                  } else {
                    setShowMentionDropdown(false);
                  }
                } else {
                  setShowMentionDropdown(false);
                }
              }}
              onKeyDown={(e) => handleComposerKeyDown(e)}
              onPaste={handlePaste}
              disabled={!activeConversationId}
              aria-label="Soạn tin nhắn"
              className="max-h-32 min-h-10 w-full resize-none bg-transparent px-3.5 py-2.5 text-sm font-medium leading-5 outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {hasSendable ? (
              <button
                type="button"
                onClick={() => {
                  let processedText = inputText;
                  const sortedMetadata = [...mentionsMetadata].sort(
                    (a, b) => b.displayName.length - a.displayName.length,
                  );
                  for (const item of sortedMetadata) {
                    const escapedNameForRegex = item.displayName.replace(
                      /[.*+?^${}()|[\]\\]/g,
                      '\\$&',
                    );
                    const regex = new RegExp(`@${escapedNameForRegex}`, 'g');
                    const replacement =
                      item.userId === 'all'
                        ? `@[Cả nhóm](mention:all)`
                        : `@[${item.displayName}](mention:${item.userId})`;
                    processedText = processedText.replace(regex, replacement);
                  }
                  setMentionsMetadata([]);
                  void handleSendMessage(processedText);
                }}
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
      )}
      <p aria-live="polite" className="sr-only">
        {composerStatusMessage}
      </p>
    </div>
  );
}
