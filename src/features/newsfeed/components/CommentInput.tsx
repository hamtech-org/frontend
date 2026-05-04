import { useState, useRef } from 'react';
import { SendHorizontal, Smile, Image as ImageIcon, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAddCommentMutation } from '@/store/api/newsfeedApi';
import { useUploadMediaMultiMutation } from '@/store/api/mediaApi';
import type { IComment } from '@/types/newsfeed.types';

const COMMON_EMOJIS = [
  '😀',
  '😂',
  '🥰',
  '😍',
  '😎',
  '😊',
  '🙂',
  '🤣',
  '😅',
  '😆',
  '😭',
  '😢',
  '😔',
  '😤',
  '😠',
  '😡',
  '🤔',
  '🤗',
  '😏',
  '😒',
  '😬',
  '🥺',
  '😱',
  '🤯',
  '🥳',
  '🤩',
  '😴',
  '🤮',
  '😷',
  '🤒',
  '😵',
  '🤐',
  '👍',
  '👎',
  '❤️',
  '🔥',
  '✨',
  '🎉',
  '💯',
  '👏',
  '🙏',
  '💪',
  '🤝',
  '👀',
  '💀',
  '🫶',
  '🎯',
  '💩',
];

interface CommentInputProps {
  postId: string;
  replyTo?: { commentId: string; authorName: string } | null;
  onClearReply?: () => void;
  onSubmitted?: (comment: IComment) => void;
  autoFocus?: boolean;
  authorName: string;
  authorAvatar: string;
  authorInitial: string;
}

export const CommentInput = ({
  postId,
  replyTo,
  onClearReply,
  onSubmitted,
  autoFocus = false,
  authorName,
  authorAvatar,
  authorInitial,
}: CommentInputProps) => {
  const [text, setText] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addComment, { isLoading: isAdding }] = useAddCommentMutation();
  const [uploadMediaMulti, { isLoading: isUploading }] = useUploadMediaMultiMutation();

  const insertEmoji = (emoji: string) => {
    const el = textRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    setShowEmoji(false);
    requestAnimationFrame(() => {
      if (el) {
        el.selectionStart = start + emoji.length;
        el.selectionEnd = start + emoji.length;
        el.focus();
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (!incoming.length) return;
    const file = incoming[0];
    setMediaFiles([file]);
    const reader = new FileReader();
    reader.onload = (ev) => setMediaPreviews([ev.target?.result as string]);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeMedia = (idx: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const content = text.trim();
    if (!content && mediaFiles.length === 0) return;

    let mediaUrls: string[] | undefined;
    if (mediaFiles.length > 0) {
      try {
        const res = await uploadMediaMulti({
          files: mediaFiles,
          deliveryScope: 'general',
        }).unwrap();
        mediaUrls = res.data.map((m) => m.url);
      } catch {
        return;
      }
    }

    try {
      const res = await addComment({
        postId,
        content,
        parentId: replyTo?.commentId,
        mediaUrls,
      }).unwrap();
      if (res.data) onSubmitted?.(res.data);
      setText('');
      setMediaFiles([]);
      setMediaPreviews([]);
      onClearReply?.();
    } catch {
      // no-op
    }
  };

  const isLoading = isAdding || isUploading;
  const canSubmit = !isLoading && (text.trim().length > 0 || mediaFiles.length > 0);

  return (
    <div className="flex items-start gap-2">
      <div className="size-8 rounded-full overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">{authorInitial}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* Media preview — ngoài khung text */}
        {mediaPreviews.length > 0 && (
          <div className="relative mb-1.5 overflow-hidden rounded-xl">
            {mediaFiles[0]?.type.startsWith('video/') ? (
              <video src={mediaPreviews[0]} className="max-h-48 w-full object-cover" />
            ) : (
              <img src={mediaPreviews[0]} alt="" className="max-h-48 w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => removeMedia(0)}
              className="absolute top-1.5 right-1.5 size-5 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
            >
              <X className="size-3" />
            </button>
          </div>
        )}

        <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
          {replyTo && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/40">
              <span className="text-xs text-muted-foreground">
                Đang trả lời{' '}
                <span className="font-semibold text-foreground">{replyTo.authorName}</span>
              </span>
              <button
                type="button"
                onClick={onClearReply}
                className="rounded-full p-0.5 hover:bg-muted transition-colors"
              >
                <X className="size-3 text-muted-foreground" />
              </button>
            </div>
          )}

          <textarea
            ref={textRef}
            value={text}
            autoFocus={autoFocus}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder={replyTo ? `Trả lời ${replyTo.authorName}...` : 'Viết bình luận...'}
            rows={1}
            className="w-full resize-none border-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground leading-5 max-h-28 overflow-y-auto"
          />

          <div className="flex items-center justify-between px-2 py-1.5 border-t border-border/40">
            <div className="flex items-center gap-0.5">
              <Popover open={showEmoji} onOpenChange={setShowEmoji}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-amber-500 hover:bg-muted/70 transition-colors"
                  >
                    <Smile className="size-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-64 p-2">
                  <div className="grid grid-cols-8 gap-0.5">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="size-7 flex items-center justify-center rounded hover:bg-muted text-base transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <button
                type="button"
                disabled={mediaFiles.length >= 1}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md p-1.5 text-green-600 hover:bg-muted/70 transition-colors disabled:opacity-40"
              >
                <ImageIcon className="size-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50 transition-opacity"
            >
              {isLoading ? (
                <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <SendHorizontal className="size-3.5" />
              )}
              {isUploading ? 'Đang tải...' : 'Gửi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
