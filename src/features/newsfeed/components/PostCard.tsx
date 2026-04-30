import { motion } from 'motion/react';
import {
  Bookmark,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  SendHorizontal,
  Share2,
  Smile,
} from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { IPost } from '@/types/newsfeed.types';
import type { RootState } from '@/store/store';
import { toPostCardViewModel } from '@/features/newsfeed/utils/postViewModel';
import {
  useAddCommentMutation,
  useLazyGetCommentsQuery,
  useReactToPostMutation,
} from '@/store/api/newsfeedApi';
import type { IComment } from '@/types/newsfeed.types';
import { formatRelative } from '@/utils/formatDate';

interface Props {
  post: IPost;
}

export const PostCard = ({ post }: Props) => {
  const vm = toPostCardViewModel(post);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<IComment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [displayCommentsCount, setDisplayCommentsCount] = useState(post.commentsCount ?? 0);
  const [getCommentsPage] = useLazyGetCommentsQuery();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();
  const [reactToPost] = useReactToPostMutation();
  const commentAuthorName = currentUser?.displayName?.trim() || 'Bạn';
  const commentAuthorAvatar = currentUser?.avatar || '';
  const commentAuthorInitial = commentAuthorName.charAt(0).toUpperCase() || 'U';

  const loadCommentPage = async (cursor?: string | null, append: boolean = false) => {
    if (append) {
      setIsLoadingMoreComments(true);
    } else {
      setIsLoadingComments(true);
    }
    try {
      const res = await getCommentsPage({
        postId: post.postId,
        limit: 5,
        cursor: cursor ?? null,
      }).unwrap();
      const page = res.data;
      if (append) {
        setComments((prev) => [...prev, ...page.items]);
      } else {
        setComments(page.items);
      }
      setNextCursor(page.nextCursor);
      setHasMoreComments(page.hasMore);
    } finally {
      setIsLoadingComments(false);
      setIsLoadingMoreComments(false);
    }
  };

  const toggleComments = () => {
    setIsCommentOpen((prev) => {
      const next = !prev;
      if (next) {
        void loadCommentPage(null, false);
      } else {
        setComments([]);
        setNextCursor(null);
        setHasMoreComments(false);
      }
      return next;
    });
  };

  const submitComment = async () => {
    const content = commentText.trim();
    if (!content) return;
    try {
      const created = await addComment({ postId: post.postId, content }).unwrap();
      if (created.data) {
        setComments((prev) => [...prev, created.data]);
        setDisplayCommentsCount((prev) => prev + 1);
      }
      setCommentText('');
    } catch {
      // no-op
    }
  };

  return (
    <motion.article
      key={post.postId}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="feed-card-virtualized glass-card max-w-3xl mx-auto rounded-2xl overflow-hidden border-none shadow-lg shadow-black/5 dark:shadow-white/5"
    >
      <div className="p-3 md:p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
            {vm.avatar ? (
              <img
                src={vm.avatar}
                alt={vm.displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">{vm.initial}</span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">{vm.displayName}</h3>
            <p className="text-xs text-muted-foreground">{formatRelative(post.createdAt)}</p>
          </div>
        </div>
        <button
          type="button"
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div className="px-3 md:px-4 pb-2.5">
        <p className="text-sm leading-6 whitespace-pre-wrap">
          {vm.excerpt}
          {vm.hasExcerptOverflow ? '…' : ''}
        </p>
      </div>
      {vm.imageUrl ? (
        <div className="relative overflow-hidden max-h-[320px]">
          <img
            src={vm.imageUrl}
            alt="Post content"
            className="w-full h-full max-h-[320px] object-cover hover:scale-105 transition-transform duration-1000"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}
      <div className="p-3 md:p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 group"
            onClick={() => {
              void reactToPost({ postId: post.postId, type: 'like' });
              setIsLiked((prev) => !prev);
            }}
          >
            <div className="p-1.5 rounded-full transition-all group-hover:bg-muted/70">
              <Heart
                className={`w-4 h-4 transition-all ${
                  isLiked ? 'text-red-500 fill-red-500' : 'text-muted-foreground'
                }`}
              />
            </div>
            <span className="text-sm font-bold">{vm.likes}</span>
          </button>
          <button type="button" className="flex items-center gap-2 group" onClick={toggleComments}>
            <div className="p-1.5 rounded-full transition-all group-hover:bg-muted/70">
              <MessageCircle className="w-4 h-4 text-muted-foreground transition-all" />
            </div>
            <span className="text-sm font-bold">{displayCommentsCount}</span>
          </button>
          <button type="button" className="p-1.5 rounded-full transition-all hover:bg-muted/70">
            <Share2 className="w-4 h-4 text-muted-foreground transition-all" />
          </button>
        </div>
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-blue-600/10 group transition-all"
        >
          <Bookmark className="w-4 h-4 group-hover:text-blue-600 transition-all" />
        </button>
      </div>
      {isCommentOpen ? (
        <div className="px-3 md:px-4 pb-3.5 space-y-3 border-t border-border/50">
          {isLoadingComments && comments.length === 0 ? (
            <div className="space-y-2 animate-pulse">
              <div className="rounded-xl bg-muted/50 px-3 py-2">
                <div className="h-2.5 w-20 rounded bg-muted/70" />
                <div className="mt-2 h-3 w-4/5 rounded bg-muted/60" />
              </div>
              <div className="rounded-xl bg-muted/50 px-3 py-2">
                <div className="h-2.5 w-16 rounded bg-muted/70" />
                <div className="mt-2 h-3 w-2/3 rounded bg-muted/60" />
              </div>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có bình luận nào.</p>
          ) : (
            <div className="space-y-2">
              {comments.map((comment) => (
                <div key={comment.commentId} className="flex items-start gap-2">
                  <div className="size-7 rounded-full overflow-hidden bg-muted/60 flex items-center justify-center shrink-0">
                    {comment.author?.avatar ? (
                      <img
                        src={comment.author.avatar}
                        alt={comment.author.displayName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {(comment.author?.displayName ?? comment.authorId)
                          .charAt(0)
                          .toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="rounded-xl bg-muted/50 px-3 py-2">
                      <p className="text-xs font-semibold text-foreground/80">
                        {comment.author?.displayName ?? comment.authorId}
                      </p>
                      <p className="text-sm text-foreground">{comment.content}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-3 px-1 text-[11px] text-muted-foreground">
                      <span>{formatRelative(comment.createdAt)}</span>
                      <button type="button" className="font-semibold hover:text-foreground">
                        Thích
                      </button>
                      <button type="button" className="font-semibold hover:text-foreground">
                        Trả lời
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {hasMoreComments ? (
                <button
                  type="button"
                  onClick={() => void loadCommentPage(nextCursor, true)}
                  disabled={isLoadingMoreComments}
                  className="px-1 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  {isLoadingMoreComments ? 'Đang tải...' : 'Xem thêm bình luận'}
                </button>
              ) : null}
            </div>
          )}
          <div className="flex items-start gap-2">
            <div className="size-8 rounded-full overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
              {commentAuthorAvatar ? (
                <img
                  src={commentAuthorAvatar}
                  alt={commentAuthorName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">
                  {commentAuthorInitial}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-background p-2 space-y-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void submitComment();
                  }
                }}
                placeholder="Viết bình luận..."
                className="w-full border-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between border-t border-border/50 pt-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-amber-500 hover:bg-muted/70"
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-green-600 hover:bg-muted/70"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  disabled={isAddingComment || commentText.trim().length === 0}
                  onClick={submitComment}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                >
                  <SendHorizontal className="h-3.5 w-3.5" />
                  Gửi
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </motion.article>
  );
};
