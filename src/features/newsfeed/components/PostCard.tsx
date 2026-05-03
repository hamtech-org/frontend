import { motion } from 'motion/react';
import {
  Bookmark,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  SendHorizontal,
  Share2,
  Smile,
  Trash2,
  Flag,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { IPost } from '@/types/newsfeed.types';
import type { RootState } from '@/store/store';
import { toPostCardViewModel } from '@/features/newsfeed/utils/postViewModel';
import {
  useAddCommentMutation,
  useDeletePostMutation,
  useLazyGetCommentsQuery,
  useReactToPostMutation,
  useReactToCommentMutation,
} from '@/store/api/newsfeedApi';
import type { IComment } from '@/types/newsfeed.types';
import { formatRelative } from '@/utils/formatDate';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HashtagText } from './HashtagText';
import { MediaGallery } from './MediaGallery';
import { ReactionButton } from '@/components/common/ReactionButton';
import { ReactionSummary } from '@/components/common/ReactionButton/ReactionSummary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  post: IPost;
  onEditPost?: (post: IPost) => void;
}

export const PostCard = ({ post, onEditPost }: Props) => {
  const vm = toPostCardViewModel(post);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isOwner = currentUser?.userId === vm.authorId;

  // ── Comment section state ──
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<IComment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);

  // ── Reaction state (optimistic) ──
  const [localReaction, setLocalReaction] = useState<
    import('@/types/reaction.types').ReactionType | null
  >(post.currentUserReaction ?? null);
  const [localReactionsCount, setLocalReactionsCount] = useState<Partial<Record<string, number>>>(
    post.reactionsCount || {},
  );
  const [displayCommentsCount, setDisplayCommentsCount] = useState(post.commentsCount ?? 0);

  // ── Menu state ──
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [getCommentsPage] = useLazyGetCommentsQuery();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();
  const [reactToPost] = useReactToPostMutation();
  const [reactToComment] = useReactToCommentMutation();
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();

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

  const handleDelete = async () => {
    try {
      await deletePost(post.postId).unwrap();
      window.dispatchEvent(new CustomEvent('post:deleted', { detail: post.postId }));
    } catch {
      // no-op
    }
    setShowDeleteDialog(false);
  };

  return (
    <motion.article
      key={post.postId}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="feed-card-virtualized glass-card max-w-3xl mx-auto rounded-2xl overflow-hidden border-none shadow-lg shadow-black/5 dark:shadow-white/5"
    >
      <div className="px-3 py-2 md:px-4 flex items-center justify-between">
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

        {/* ── 3-dot menu ── */}
        <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1.5 rounded-xl" align="end">
            {isOwner ? (
              <>
                <button
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEditPost?.(post);
                  }}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                  Chỉnh sửa
                </button>
                <button
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa bài viết
                </button>
              </>
            ) : (
              <>
                <button
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Flag className="h-4 w-4 text-muted-foreground" />
                  Báo cáo
                </button>
                <button
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  Ẩn bài viết
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="px-3 md:px-4 pb-2">
        <div className="text-sm leading-6 whitespace-pre-wrap">
          <HashtagText text={vm.excerpt} />
          {vm.hasExcerptOverflow ? '…' : ''}
        </div>
      </div>

      <div className="px-3 md:px-4 pb-2">
        <MediaGallery mediaUrls={post.mediaUrls} />
      </div>

      <div className="px-3 md:px-4 pb-0">
        <ReactionSummary summary={localReactionsCount} size="sm" className="mb-1" />
      </div>

      <div className="px-3 py-1.5 md:px-4 flex items-center justify-between border-t border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ReactionButton
              size="md"
              currentUserReaction={localReaction}
              count={Object.values(localReactionsCount).reduce((a, b) => a + (b || 0), 0)}
              onReact={(type) => {
                const prevReaction = localReaction;
                const newCounts = { ...localReactionsCount };
                if (prevReaction) {
                  newCounts[prevReaction] = Math.max(0, (newCounts[prevReaction] || 0) - 1);
                }
                if (type) {
                  newCounts[type] = (newCounts[type] || 0) + 1;
                }
                setLocalReaction(type);
                setLocalReactionsCount(newCounts);

                const serverType = type ?? prevReaction;
                if (!serverType) return;
                window.dispatchEvent(
                  new CustomEvent('post:reacted', { detail: { postId: post.postId, type } }),
                );
                void reactToPost({ postId: post.postId, type: serverType });
              }}
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:bg-muted/70 group"
            onClick={toggleComments}
          >
            <MessageCircle className="w-4 h-4 text-muted-foreground transition-all" />
            <span className="text-sm font-bold">{displayCommentsCount}</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:bg-muted/70 group"
          >
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
        <div className="px-3 md:px-4 pt-2.5 pb-3 space-y-3 border-t border-border/50">
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
            <p className="text-xs text-muted-foreground text-center py-2">Chưa có bình luận nào.</p>
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
                      <p className="text-sm text-foreground">
                        <HashtagText text={comment.content} />
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-3 px-1 text-[11px] text-muted-foreground relative">
                      <span>{formatRelative(comment.createdAt)}</span>
                      <div className="flex items-center gap-2 relative">
                        <ReactionButton
                          size="sm"
                          showLabel={false}
                          className="h-5 px-1 rounded-sm"
                          currentUserReaction={comment.currentUserReaction}
                          count={Object.values(comment.reactionsCount || {}).reduce(
                            (a, b) => a + (b || 0),
                            0,
                          )}
                          onReact={(type) => {
                            const serverType = type ?? comment.currentUserReaction;
                            if (!serverType) return;
                            void reactToComment({
                              postId: post.postId,
                              commentId: comment.commentId,
                              type: serverType,
                            });
                          }}
                        />
                      </div>
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

      {/* ── Delete confirmation dialog ── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bài viết?</AlertDialogTitle>
            <AlertDialogDescription>
              Bài viết này sẽ bị xóa vĩnh viễn. Bạn không thể hoàn tác hành động này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.article>
  );
};
