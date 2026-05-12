import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import type { IComment } from '@/types/newsfeed.types';
import {
  useReactToReelCommentMutation,
  useLazyGetReelCommentRepliesQuery,
  useAddReelCommentMutation,
} from '@/store/api/newsfeedApi';
import { ReactionButton } from '@/components/common/ReactionButton';
import { ReactionSummary } from '@/components/common/ReactionButton/ReactionSummary';
import { MediaLightbox } from '@/features/newsfeed/components/MediaLightbox';
import { formatRelative } from '@/utils/formatDate';
import { cn } from '@/utils/cn';
import { Loader2, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Props {
  comment: IComment;
  reelId: string;
  isNested?: boolean;
}

export const ReelCommentItem = ({ comment, reelId, isNested = false }: Props) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<IComment[]>([]);
  const [replyNextCursor, setReplyNextCursor] = useState<string | null>(null);
  const [hasMoreReplies, setHasMoreReplies] = useState(false);
  const [localRepliesCount, setLocalRepliesCount] = useState(comment.repliesCount ?? 0);
  const [replyText, setReplyText] = useState('');

  const [localReaction, setLocalReaction] = useState<
    import('@/types/reaction.types').ReactionType | null
  >(comment.currentUserReaction ?? null);
  const [localReactionsCount, setLocalReactionsCount] = useState(comment.reactionsCount || {});

  const [reactToReelComment] = useReactToReelCommentMutation();
  const [fetchReplies, { isLoading: isLoadingReplies }] = useLazyGetReelCommentRepliesQuery();
  const [addReelComment, { isLoading: isSendingReply }] = useAddReelCommentMutation();

  const authorName = comment.author?.displayName ?? comment.authorId;
  const authorAvatar = comment.author?.avatar ?? '';
  const authorInitial = authorName.charAt(0).toUpperCase();

  const loadReplies = async (cursor?: string | null, append = false) => {
    try {
      const res = await fetchReplies({
        reelId,
        commentId: comment.commentId,
        cursor: cursor ?? null,
      }).unwrap();
      const page = res.data;
      setReplies((prev) => (append ? [...prev, ...page.items] : page.items));
      setReplyNextCursor(page.nextCursor);
      setHasMoreReplies(page.hasMore);
    } catch {
      // no-op
    }
  };

  const handleToggleReplies = async () => {
    if (!showReplies && replies.length === 0) {
      await loadReplies(null, false);
    }
    setShowReplies((prev) => !prev);
  };

  const handleSendReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || isSendingReply) return;
    try {
      const res = await addReelComment({
        reelId,
        content: trimmed,
        parentId: comment.commentId,
      }).unwrap();
      const newReply = res.data;
      setReplies((prev) => [...prev, newReply]);
      setLocalRepliesCount((prev) => prev + 1);
      setShowReplies(true);
      setShowReplyInput(false);
      setReplyText('');
    } catch {
      // no-op
    }
  };

  return (
    <div className={cn('flex items-start gap-2', isNested && 'ml-9')}>
      {/* Avatar */}
      <div
        className={cn(
          'rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0',
          isNested ? 'size-6' : 'size-7',
        )}
      >
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className={cn(
              'font-bold text-muted-foreground',
              isNested ? 'text-[9px]' : 'text-[10px]',
            )}
          >
            {authorInitial}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* Tên tác giả ngoài bubble */}
        <p
          className={cn(
            'mb-0.5 px-1 font-semibold text-foreground/90',
            isNested ? 'text-[11px]' : 'text-xs',
          )}
        >
          {authorName}
        </p>

        {/* Bubble — chỉ render khi có text */}
        {!!comment.content && (
          <div className="w-fit max-w-full rounded-xl bg-muted px-3 py-2">
            <p className="text-sm text-foreground/90 leading-5 break-words">{comment.content}</p>
          </div>
        )}

        {/* Media — thumbnail tappable + lightbox */}
        {comment.mediaUrls && comment.mediaUrls.length > 0 && (
          <>
            <button
              type="button"
              className="mt-1 w-fit overflow-hidden rounded-xl cursor-pointer block"
              onClick={() => setLightboxOpen(true)}
            >
              {/\.(mp4|webm|mov)(\?|$)/i.test(comment.mediaUrls[0]) ? (
                <video
                  src={comment.mediaUrls[0]}
                  className="block max-w-[200px] max-h-[150px] object-cover"
                />
              ) : (
                <img
                  src={comment.mediaUrls[0]}
                  alt=""
                  className="block max-w-[200px] max-h-[150px] object-cover"
                />
              )}
            </button>
            {lightboxOpen && (
              <MediaLightbox
                mediaUrls={comment.mediaUrls}
                startIndex={0}
                onClose={() => setLightboxOpen(false)}
              />
            )}
          </>
        )}

        {/* Metadata row: time, reactions, reply */}
        <div className="mt-0.5 flex items-center gap-3 px-1 text-[11px] text-muted-foreground">
          <span>{formatRelative(comment.createdAt)}</span>

          <div className="flex items-center gap-1 relative">
            {!localReaction && <ReactionSummary summary={localReactionsCount} size="sm" />}
            <ReactionButton
              size="sm"
              showLabel={false}
              className={!localReaction ? 'h-5 px-1 rounded-sm' : undefined}
              currentUserReaction={localReaction}
              summary={localReaction ? localReactionsCount : undefined}
              pickerAlign="right"
              onReact={(type) => {
                const prevReaction = localReaction;
                const serverType = type ?? prevReaction;
                if (!serverType) return;
                const newCounts = { ...localReactionsCount };
                if (prevReaction) {
                  newCounts[prevReaction] = Math.max(0, (newCounts[prevReaction] || 0) - 1);
                }
                if (type) {
                  newCounts[type] = (newCounts[type] || 0) + 1;
                }
                setLocalReaction(type);
                setLocalReactionsCount(newCounts);
                void reactToReelComment({ reelId, commentId: comment.commentId, type: serverType });
              }}
            />
          </div>

          {!isNested && (
            <button
              type="button"
              className="font-semibold text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowReplyInput((prev) => !prev)}
            >
              Trả lời
            </button>
          )}
        </div>

        {/* "Xem N trả lời" toggle */}
        {!isNested && localRepliesCount > 0 && (
          <button
            type="button"
            onClick={() => void handleToggleReplies()}
            className="mt-1 px-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
          >
            {isLoadingReplies && (
              <span className="size-3 rounded-full border-2 border-blue-400/40 border-t-blue-400 animate-spin" />
            )}
            {showReplies ? 'Ẩn trả lời' : `Xem ${localRepliesCount} trả lời`}
          </button>
        )}

        {/* Nested replies */}
        {!isNested && showReplies && replies.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {replies.map((reply) => (
              <ReelCommentItem key={reply.commentId} comment={reply} reelId={reelId} isNested />
            ))}
            {hasMoreReplies && (
              <button
                type="button"
                onClick={() => void loadReplies(replyNextCursor, true)}
                className="ml-9 px-1 text-xs font-semibold text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                Xem thêm trả lời
              </button>
            )}
          </div>
        )}

        {/* Inline reply input */}
        {!isNested && showReplyInput && (
          <div className="mt-2 flex items-center gap-2">
            <Avatar className="size-6 shrink-0">
              {currentUser?.avatar && (
                <AvatarImage src={currentUser.avatar} referrerPolicy="no-referrer" />
              )}
              <AvatarFallback className="text-[9px] bg-muted text-foreground">
                {(currentUser?.displayName ?? 'B').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendReply();
                }
              }}
              placeholder={`Trả lời ${authorName}...`}
              className="flex-1 h-8 rounded-xl bg-muted border-input text-foreground placeholder:text-muted-foreground text-sm"
              disabled={isSendingReply}
              autoFocus
            />
            <Button
              size="icon"
              onClick={() => void handleSendReply()}
              disabled={!replyText.trim() || isSendingReply}
              className="size-8 rounded-xl shrink-0 bg-blue-600 hover:bg-blue-700"
            >
              {isSendingReply ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
