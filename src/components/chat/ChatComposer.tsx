import { useState, useRef, type KeyboardEvent, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
  BarChart2,
  CheckSquare,
  Image,
  Mic,
  Paperclip,
  Palette,
  Send,
  Smile,
  Sparkles,
} from 'lucide-react';
import type { IConversation, IMessage } from '@/types/chat.types';

type ChatComposerProps = {
  activeConversation: IConversation | undefined;
  activeConversationId: string | null;
  inputText: string;
  onInputTextChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onTyping: () => void;
  onSend: (text?: string) => void;
  isSending: boolean;
  replyingTo: IMessage | null;
  onClearReply: () => void;
  onOpenPoll: () => void;
  onOpenTask: () => void;
};

export function ChatComposer({
  activeConversation,
  activeConversationId,
  inputText,
  onInputTextChange,
  onKeyDown,
  onTyping,
  onSend,
  isSending,
  replyingTo,
  onClearReply,
  onOpenPoll,
  onOpenTask,
}: ChatComposerProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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

  const onEmojiClick = (emojiObject: any) => {
    onInputTextChange(inputText + emojiObject.emoji);
  };

  const handleLikeClick = () => {
    if (isSending || !activeConversationId) return;
    onSend('👍');
  };

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
          <button
            onClick={onClearReply}
            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-muted-foreground"
          >
            <Smile className="w-4 h-4 rotate-45" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative" ref={emojiPickerRef}>
            <button
              type="button"
              title="Gửi nhãn dán / Emoji"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0"
            >
              <Smile className="w-5 h-5" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 z-50 animate-in fade-in zoom-in-95 duration-150 shadow-2xl rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900">
                <EmojiPicker onEmojiClick={onEmojiClick} theme={'auto' as any} />
              </div>
            )}
          </div>
          <button
            type="button"
            title="Gửi ảnh/video"
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0"
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            type="button"
            title="Đính kèm tài liệu"
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1" />

          {activeConversation?.type === 'group' && (
            <>
              <button
                type="button"
                onClick={onOpenPoll}
                title="Tạo bình chọn (Poll)"
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0"
              >
                <BarChart2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onOpenTask}
                title="Giao việc / Nhắc hẹn"
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0 hidden sm:block"
              >
                <CheckSquare className="w-5 h-5" />
              </button>
              <button
                type="button"
                title="AI Tóm tắt nhóm"
                className="p-2 rounded-lg hover:bg-blue-600/10 transition-all text-blue-600 hover:text-blue-700 shrink-0 hidden sm:flex items-center gap-2 font-bold text-xs bg-blue-600/5 ml-2 border border-blue-600/20"
              >
                <Sparkles className="w-4 h-4" />
                Tóm tắt cuộc gọi / tin nhắn
              </button>
            </>
          )}

          {activeConversation?.type === 'direct' && (
            <button
              type="button"
              title="Bảng trắng tương tác"
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-blue-600 shrink-0 hidden sm:block"
            >
              <Palette className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

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
              onInputTextChange(e.target.value);
              onTyping();
            }}
            onKeyDown={(e) => {
              onKeyDown(e);
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                // Clear input after sending
                setTimeout(() => onInputTextChange(''), 0);
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
          {inputText.trim() ? (
            <button
              type="button"
              onClick={() => void onSend()}
              disabled={!activeConversationId || isSending}
              className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 animate-in fade-in zoom-in"
            >
              <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLikeClick}
              disabled={!activeConversationId || isSending}
              className="p-3 rounded-xl bg-black/5 hover:bg-blue-600 dark:bg-white/5 dark:hover:bg-blue-600 text-blue-600 hover:text-white transition-all animate-in fade-in zoom-in group"
            >
              <span className="text-xl leading-none group-hover:scale-125 transition-transform inline-block">👍</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
