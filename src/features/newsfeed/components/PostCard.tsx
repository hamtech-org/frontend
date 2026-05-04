import { motion } from 'motion/react';
import {
  Bookmark,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  Flag,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { IPost, IComment } from '@/types/newsfeed.types';
import type { RootState } from '@/store/store';
import { toPostCardViewModel } from '@/features/newsfeed/utils/postViewModel';
import {
  useDeletePostMutation,
  useLazyGetCommentsQuery,
  useReactToPostMutation,
  useToggleSavePostMutation,
} from '@/store/api/newsfeedApi';
import { formatRelative } from '@/utils/formatDate';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HashtagText } from './HashtagText';
import { MediaGallery } from './MediaGallery';
import { ReactionButton } from '@/components/common/ReactionButton';
import { ReactionSummary } from '@/components/common/ReactionButton/ReactionSummary';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import { SharedPostPreview } from './SharedPostPreview';
import { SharePostModal } from './SharePostModal';
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
import { Skeleton } from '@/components/ui/skeleton';

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

  // ── Menu / share / save state ──
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(post.isSaved ?? false);

  const [getCommentsPage] = useLazyGetCommentsQuery();
  const [reactToPost] = useReactToPostMutation();
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const [toggleSavePost] = useToggleSavePostMutation();

  const myName = currentUser?.displayName?.trim() || 'Bạn';
  const myAvatar = currentUser?.avatar || '';
  const myInitial = myName.charAt(0).toUpperCase() || 'U';

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
        {post.sharedFrom && <SharedPostPreview sharedFrom={post.sharedFrom} />}
      </div>

      {!post.sharedFrom && (
        <div className="px-3 md:px-4 pb-2">
          <MediaGallery mediaUrls={post.mediaUrls} />
        </div>
      )}

      <div className="px-3 md:px-4 pb-0 flex items-center justify-between">
        <ReactionSummary summary={localReactionsCount} size="sm" className="mb-1" />
        <div className="flex items-center gap-2 mb-1">
          {post.sharesCount > 0 && (
            <span className="text-xs text-muted-foreground">{post.sharesCount} chia sẻ</span>
          )}
          {displayCommentsCount > 0 && (
            <button
              type="button"
              onClick={toggleComments}
              className="text-xs text-muted-foreground hover:underline"
            >
              {displayCommentsCount} bình luận
            </button>
          )}
        </div>
      </div>

      <div className="px-3 py-1.5 md:px-4 flex items-center justify-between border-t border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ReactionButton
              size="md"
              currentUserReaction={localReaction}
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
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:bg-muted/70 group"
            onClick={() => setShareModalOpen(true)}
          >
            <Share2 className="w-4 h-4 text-muted-foreground transition-all" />
          </button>
        </div>
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-blue-600/10 group transition-all"
          onClick={() => {
            const next = !isSaved;
            setIsSaved(next);
            void toggleSavePost(post.postId)
              .unwrap()
              .catch(() => setIsSaved(!next));
          }}
        >
          <Bookmark
            className={`w-4 h-4 transition-all ${
              isSaved ? 'fill-blue-600 text-blue-600' : 'group-hover:text-blue-600'
            }`}
          />
        </button>
      </div>
      {isCommentOpen ? (
        <div className="px-3 md:px-4 pt-2.5 pb-3 border-t border-border/50 flex flex-col gap-3">
          {/* Comment list */}
          <div className="flex flex-col gap-2">
            {isLoadingComments && comments.length === 0 ? (
              <>
                {[0, 1].map((i) => (
                  <div key={i} className="flex items-start gap-2 animate-pulse">
                    <div className="size-7 rounded-full bg-muted/60 shrink-0" />
                    <div className="flex-1 rounded-xl bg-muted/50 px-3 py-2">
                      <div className="h-2.5 w-20 rounded bg-muted/70" />
                      <div className="mt-2 h-3 w-4/5 rounded bg-muted/60" />
                    </div>
                  </div>
                ))}
              </>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Chưa có bình luận nào.
              </p>
            ) : (
              <>
                {comments.map((comment) => (
                  <CommentItem key={comment.commentId} comment={comment} postId={post.postId} />
                ))}
                {isLoadingMoreComments && (
                  <div className="flex flex-col gap-2 py-1">
                    {[0, 1].map((i) => (
                      <div key={i} className="flex items-start gap-2 animate-pulse">
                        <Skeleton className="size-7 rounded-full shrink-0" />
                        <div className="flex flex-col gap-1.5 flex-1">
                          <Skeleton className="h-2.5 w-16 rounded" />
                          <Skeleton className="h-8 w-3/4 rounded-xl" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {hasMoreComments && !isLoadingMoreComments && (
                  <button
                    type="button"
                    onClick={() => void loadCommentPage(nextCursor, true)}
                    className="px-1 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Xem thêm bình luận
                  </button>
                )}
              </>
            )}
          </div>

          {/* New comment input */}
          <CommentInput
            postId={post.postId}
            authorName={myName}
            authorAvatar={myAvatar}
            authorInitial={myInitial}
            onSubmitted={(newComment) => {
              setComments((prev) => [...prev, newComment]);
              setDisplayCommentsCount((prev) => prev + 1);
            }}
          />
        </div>
      ) : null}

      {/* ── Share modal ── */}
      <SharePostModal open={shareModalOpen} post={post} onClose={() => setShareModalOpen(false)} />

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
