import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import type { IComment } from '@/types/newsfeed.types';
import { useReactToCommentMutation, useLazyGetCommentRepliesQuery } from '@/store/api/newsfeedApi';
import { ReactionButton } from '@/components/common/ReactionButton';
import { ReactionSummary } from '@/components/common/ReactionButton/ReactionSummary';
import { CommentInput } from './CommentInput';
import { HashtagText } from './HashtagText';
import { MediaLightbox } from './MediaLightbox';
import { formatRelative } from '@/utils/formatDate';
import { cn } from '@/utils/cn';
import { MessageCircle } from 'lucide-react';

interface CommentItemProps {
  comment: IComment;
  postId: string;
  isNested?: boolean;
}

export const CommentItem = ({ comment, postId, isNested = false }: CommentItemProps) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<IComment[]>([]);
  const [replyNextCursor, setReplyNextCursor] = useState<string | null>(null);
  const [hasMoreReplies, setHasMoreReplies] = useState(false);
  const [localRepliesCount, setLocalRepliesCount] = useState(comment.repliesCount ?? 0);

  const [localReaction, setLocalReaction] = useState<
    import('@/types/reaction.types').ReactionType | null
  >(comment.currentUserReaction ?? null);
  const [localReactionsCount, setLocalReactionsCount] = useState(comment.reactionsCount || {});

  const [reactToComment] = useReactToCommentMutation();
  const [fetchReplies, { isLoading: isLoadingReplies }] = useLazyGetCommentRepliesQuery();

  const loadReplies = async (cursor?: string | null, append = false) => {
    try {
      const res = await fetchReplies({
        postId,
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

  const handleReplySubmitted = (newReply: IComment) => {
    setReplies((prev) => [...prev, newReply]);
    setLocalRepliesCount((prev) => prev + 1);
    setShowReplies(true);
    setShowReplyInput(false);
  };

  const authorName = comment.author?.displayName ?? comment.authorId;
  const authorAvatar = comment.author?.avatar ?? '';
  const authorInitial = authorName.charAt(0).toUpperCase();

  const myName = currentUser?.displayName?.trim() || 'Bạn';
  const myAvatar = currentUser?.avatar ?? '';
  const myInitial = myName.charAt(0).toUpperCase();

  return (
    <div className={cn('flex items-start gap-2')}>
      <div
        className={cn(
          'rounded-full overflow-hidden bg-muted/60 flex items-center justify-center shrink-0',
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
        {/* Author name — ngoài bubble */}
        <p
          className={cn(
            'mb-0.5 px-1 font-semibold text-foreground/80',
            isNested ? 'text-[11px]' : 'text-xs',
          )}
        >
          {authorName}
        </p>

        {/* Bubble — chỉ render khi có text */}
        {!!comment.content && (
          <div className="w-fit max-w-full rounded-xl bg-muted/50 px-3 py-2">
            <p className="text-sm text-foreground leading-5">
              <HashtagText text={comment.content} />
            </p>
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
                void reactToComment({ postId, commentId: comment.commentId, type: serverType });
              }}
            />
          </div>

          {!isNested && (
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={() => setShowReplyInput((prev) => !prev)}
            >
              <MessageCircle size={14} />
            </button>
          )}
        </div>

        {/* "Xem N trả lời" toggle */}
        {!isNested && localRepliesCount > 0 && (
          <button
            type="button"
            onClick={() => void handleToggleReplies()}
            className="mt-1 px-1 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1.5"
          >
            {isLoadingReplies && (
              <span className="size-3 rounded-full border-2 border-blue-300 border-t-blue-500 animate-spin" />
            )}
            {showReplies ? 'Ẩn trả lời' : `Xem ${localRepliesCount} trả lời`}
          </button>
        )}

        {/* Nested replies */}
        {!isNested && showReplies && replies.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {replies.map((reply) => (
              <CommentItem key={reply.commentId} comment={reply} postId={postId} isNested />
            ))}
            {hasMoreReplies && (
              <button
                type="button"
                onClick={() => void loadReplies(replyNextCursor, true)}
                className="px-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Xem thêm trả lời
              </button>
            )}
          </div>
        )}

        {/* Inline reply input */}
        {!isNested && showReplyInput && (
          <div className="mt-2">
            <CommentInput
              postId={postId}
              replyTo={{ commentId: comment.commentId, authorName }}
              onClearReply={() => setShowReplyInput(false)}
              onSubmitted={handleReplySubmitted}
              autoFocus
              authorName={myName}
              authorAvatar={myAvatar}
              authorInitial={myInitial}
            />
          </div>
        )}
      </div>
    </div>
  );
};
