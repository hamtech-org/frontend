import { useState, useCallback, useRef } from 'react';
import { Send, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  useGetReelCommentsQuery,
  useLazyGetReelCommentsQuery,
  useAddReelCommentMutation,
} from '@/store/api/newsfeedApi';
import { ReelCommentItem } from './ReelCommentItem';

interface Props {
  reelId: string;
  onClose: () => void;
}

export const ReelCommentsSheet = ({ reelId, onClose }: Props) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Initial load — limit 20
  const { data, isLoading } = useGetReelCommentsQuery({ reelId, limit: 20 });
  const [fetchMore] = useLazyGetReelCommentsQuery();
  const [addComment, { isLoading: isSending }] = useAddReelCommentMutation();

  const [extraComments, setExtraComments] = useState<import('@/types/newsfeed.types').IComment[]>(
    [],
  );
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const prevReelIdRef = useRef(reelId);

  // Khi reelId thay đổi (user scroll sang reel khác khi panel đang mở) — reset extra
  if (prevReelIdRef.current !== reelId) {
    prevReelIdRef.current = reelId;
    setExtraComments([]);
    setNextCursor(null);
    setHasMore(false);
  }

  const baseComments = data?.data?.items ?? [];
  const baseCursor = data?.data?.nextCursor ?? null;
  const baseHasMore = data?.data?.hasMore ?? false;

  // Tổng hợp: base + extra
  const allComments = [...baseComments, ...extraComments];
  const effectiveNextCursor = extraComments.length > 0 ? nextCursor : baseCursor;
  const effectiveHasMore = extraComments.length > 0 ? hasMore : baseHasMore;

  const handleLoadMore = useCallback(async () => {
    const cursor = effectiveNextCursor;
    if (!cursor || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const res = await fetchMore({ reelId, limit: 20, cursor }).unwrap();
      setExtraComments((prev) => [...prev, ...(res.data?.items ?? [])]);
      setNextCursor(res.data?.nextCursor ?? null);
      setHasMore(res.data?.hasMore ?? false);
    } catch {
      // no-op
    } finally {
      setIsFetchingMore(false);
    }
  }, [effectiveNextCursor, isFetchingMore, fetchMore, reelId]);

  // Input state
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ commentId: string; authorName: string } | null>(null);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    try {
      await addComment({
        reelId,
        content: trimmed,
        parentId: replyTo?.commentId,
      }).unwrap();
      setText('');
      setReplyTo(null);
    } catch {
      // silent
    }
  }, [text, isSending, reelId, replyTo, addComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const authorName = currentUser?.displayName ?? 'Bạn';
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <div className="w-95 shrink-0 flex flex-col bg-[hsl(0,0%,7%)] border-l border-white/10 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <span className="text-base font-bold text-white">Bình luận ({allComments.length})</span>
        <button
          type="button"
          onClick={onClose}
          className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          aria-label="Đóng bình luận"
        >
          <X className="size-4 text-white/70" />
        </button>
      </div>

      {/* Comments list */}
      <ScrollArea className="flex-1 px-4">
        {isLoading ? (
          <div className="py-4 flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-2 animate-pulse">
                <Skeleton className="size-7 rounded-full shrink-0 bg-white/10" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-20 rounded bg-white/10" />
                  <Skeleton className="h-8 w-3/4 rounded-xl bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : allComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <p className="text-sm">Chưa có bình luận nào</p>
            <p className="text-xs mt-1">Hãy là người đầu tiên bình luận!</p>
          </div>
        ) : (
          <div className="py-3 flex flex-col gap-4">
            {allComments.map((comment) => (
              <ReelCommentItem key={comment.commentId} comment={comment} reelId={reelId} />
            ))}

            {/* Load more */}
            {isFetchingMore && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="size-5 text-white/40 animate-spin" />
              </div>
            )}
            {effectiveHasMore && !isFetchingMore && (
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors text-center py-1"
              >
                Xem thêm bình luận
              </button>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-white/10 shrink-0">
        {/* Reply chip */}
        {replyTo && (
          <div className="flex items-center justify-between px-4 py-1.5 bg-white/5">
            <span className="text-xs text-white/50">
              Đang trả lời <span className="font-semibold text-white/80">{replyTo.authorName}</span>
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="size-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="size-3 text-white/50" />
            </button>
          </div>
        )}

        <div className="px-4 py-3 flex items-center gap-2">
          <Avatar className="size-7 shrink-0">
            {currentUser?.avatar && (
              <AvatarImage src={currentUser.avatar} referrerPolicy="no-referrer" />
            )}
            <AvatarFallback className="text-[10px] bg-white/10 text-white">
              {authorInitial}
            </AvatarFallback>
          </Avatar>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? `Trả lời ${replyTo.authorName}...` : 'Viết bình luận...'}
            className="flex-1 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
            disabled={isSending}
          />
          <Button
            size="icon"
            onClick={() => void handleSend()}
            disabled={!text.trim() || isSending}
            className="rounded-xl shrink-0 bg-blue-600 hover:bg-blue-700"
            aria-label="Gửi bình luận"
          >
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
