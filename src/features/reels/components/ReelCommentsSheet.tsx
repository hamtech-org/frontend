import { useState, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetReelCommentsQuery, useAddReelCommentMutation } from '@/store/api/newsfeedApi';
import type { IComment } from '@/types/newsfeed.types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

interface Props {
  reelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Sheet bình luận cho Reel — slide từ bên phải.
 * Load comments qua RTK Query, gửi comment mới.
 */
export const ReelCommentsSheet = ({ reelId, open, onOpenChange }: Props) => {
  const { data, isLoading } = useGetReelCommentsQuery({ reelId, limit: 30 }, { skip: !open });
  const [addComment, { isLoading: isSending }] = useAddReelCommentMutation();
  const [text, setText] = useState('');

  const comments = data?.data?.items ?? [];

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    try {
      await addComment({ reelId, content: trimmed }).unwrap();
      setText('');
    } catch {
      // Error handling — toast nếu cần
    }
  }, [text, isSending, reelId, addComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[400px] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/40"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold">Bình luận ({comments.length})</SheetTitle>
          </div>
        </SheetHeader>

        {/* Comments list */}
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 text-muted-foreground animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Chưa có bình luận nào</p>
              <p className="text-xs mt-1">Hãy là người đầu tiên bình luận!</p>
            </div>
          ) : (
            <div className="py-3 flex flex-col gap-3">
              {comments.map((comment) => (
                <CommentBubble key={comment.commentId} comment={comment} />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border/40 shrink-0">
          <div className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Viết bình luận..."
              className="flex-1 rounded-xl bg-muted/40 border-border/40"
              disabled={isSending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!text.trim() || isSending}
              className="rounded-xl shrink-0 bg-primary hover:bg-primary/90"
              aria-label="Gửi bình luận"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Internal comment bubble ──────────────────────────────────────────────────

function CommentBubble({ comment }: { comment: IComment }) {
  return (
    <div className="flex gap-2.5">
      <Avatar className="size-8 shrink-0">
        {comment.author?.avatar && (
          <AvatarImage src={comment.author.avatar} referrerPolicy="no-referrer" />
        )}
        <AvatarFallback className="text-xs bg-muted">
          {comment.author?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground truncate">
            {comment.author?.displayName ?? 'Người dùng'}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {dayjs(comment.createdAt).fromNow()}
          </span>
        </div>
        {comment.content && (
          <p className="text-sm text-foreground/90 mt-0.5 leading-snug break-words">
            {comment.content}
          </p>
        )}
        {comment.mediaUrls && comment.mediaUrls.length > 0 && (
          <img
            src={comment.mediaUrls[0]}
            alt="Media"
            className="mt-1.5 max-w-[200px] max-h-[150px] rounded-lg object-cover"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  );
}
