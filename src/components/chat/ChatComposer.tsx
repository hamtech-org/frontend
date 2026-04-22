import { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
  BarChart2,
  CheckSquare,
  FileText,
  Image,
  Mic,
  Paperclip,
  Palette,
  Send,
  Smile,
  Sparkles,
  X,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { IConversation } from '@/types/chat.types';
import { useChatComposerController } from '@/pages/user/chat-page/hooks/useChatComposerController';

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
  onOpenPoll: () => void;
  onOpenTask: () => void;
};

export function ChatComposer({
  activeConversation,
  activeConversationId,
  onOpenPoll,
  onOpenTask,
}: ChatComposerProps) {
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
  } = useChatComposerController(activeConversationId);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = isSending || mediaUploading;
  const hasSendable = inputText.trim().length > 0 || pendingAttachments.length > 0;

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

  const onEmojiClick = (emojiObject: { emoji: string }) => {
    setInputText(inputText + emojiObject.emoji);
  };

  const handleLikeClick = () => {
    if (busy || !activeConversationId) return;
    void handleSendMessage('👍');
  };

  const appendFromFileList = (list: FileList | null) => {
    if (!list?.length) return;
    addPendingFiles(Array.from(list));
  };

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
            className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] p-2">
          {pendingAttachments.map((p) => (
            <div
              key={p.localId}
              className="relative group/at shrink-0 w-[4.5rem] rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 overflow-hidden"
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
                disabled={busy}
                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-90 hover:opacity-100 disabled:opacity-40"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="relative" ref={emojiPickerRef}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-blue-600 shrink-0"
                  >
                    <Smile className="size-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Emoji / Nhãn dán</TooltipContent>
              </Tooltip>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-50 animate-in fade-in zoom-in-95 duration-150 shadow-2xl rounded-2xl overflow-hidden border border-border/40 bg-card">
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
                  disabled={!activeConversationId || busy}
                  onClick={() => galleryInputRef.current?.click()}
                  className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-blue-600 shrink-0 disabled:opacity-40 disabled:pointer-events-none"
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
                  disabled={!activeConversationId || busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-blue-600 shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Paperclip className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Thêm tài liệu</TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-border mx-1" />

            {activeConversation?.type === 'group' && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onOpenPoll}
                      className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-blue-600 shrink-0"
                    >
                      <BarChart2 className="size-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Tạo bình chọn (Poll)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onOpenTask}
                      className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-blue-600 shrink-0 hidden sm:block"
                    >
                      <CheckSquare className="size-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Giao việc / Nhắc hẹn</TooltipContent>
                </Tooltip>
                <button
                  type="button"
                  title="AI Tóm tắt nhóm"
                  className="p-2 rounded-lg hover:bg-blue-600/10 transition-all text-blue-600 hover:text-blue-700 shrink-0 hidden sm:flex items-center gap-2 font-bold text-xs bg-blue-600/5 ml-2 border border-blue-600/20"
                >
                  <Sparkles className="size-4" />
                  Tóm tắt cuộc gọi / tin nhắn
                </button>
              </>
            )}

            {activeConversation?.type === 'direct' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="p-2 rounded-lg hover:bg-muted transition-all text-muted-foreground hover:text-blue-600 shrink-0 hidden sm:block"
                  >
                    <Palette className="size-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Bảng trắng tương tác</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </TooltipProvider>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold whitespace-nowrap">
          <Sparkles className="w-3 h-3 text-blue-600" />
          Dạ, em hiểu rồi ạ.
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold whitespace-nowrap">
          <Sparkles className="w-3 h-3 text-blue-600" />
          Cho mình xin link nhé!
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold whitespace-nowrap">
          <Sparkles className="w-3 h-3 text-blue-600" />
          OK, để mình check lại.
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold whitespace-nowrap">
          <Sparkles className="w-3 h-3 text-blue-600" />
          👍
        </button>
      </div>

      <div className="relative flex items-end gap-2">
        <div className="flex-1 relative flex flex-col bg-black/5 dark:bg-white/5 rounded-2xl border border-transparent focus-within:border-blue-600/30 focus-within:bg-white dark:focus-within:bg-black/40 transition-all">
          <textarea
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
            onKeyDown={(e) => {
              handleKeyDown(e);
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                // Clear input after sending
                setTimeout(() => setInputText(''), 0);
              }
            }}
            disabled={!activeConversationId}
            className="w-full bg-transparent px-4 py-3 outline-none text-sm font-medium resize-none max-h-32 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex items-center gap-2 pb-1 shrink-0">
          <button
            type="button"
            title="Ghi âm giọng nói"
            className="p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-muted-foreground hover:text-blue-600"
          >
            <Mic className="w-5 h-5" />
          </button>
          {hasSendable ? (
            <button
              type="button"
              onClick={() => void handleSendMessage()}
              disabled={!activeConversationId || busy}
              className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 animate-in fade-in zoom-in"
            >
              <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLikeClick}
              disabled={!activeConversationId || busy}
              className="p-3 rounded-xl bg-black/5 hover:bg-blue-600 dark:bg-white/5 dark:hover:bg-blue-600 text-blue-600 hover:text-white transition-all animate-in fade-in zoom-in group"
            >
              <span className="text-xl leading-none group-hover:scale-125 transition-transform inline-block">
                👍
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
