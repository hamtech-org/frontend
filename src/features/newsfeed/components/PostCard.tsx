import { motion } from 'motion/react';
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { IPost } from '@/types/newsfeed.types';
import { toPostCardViewModel } from '@/features/newsfeed/utils/postViewModel';
import {
  useAddCommentMutation,
  useGetCommentsQuery,
  useReactToPostMutation,
} from '@/store/api/newsfeedApi';
import type { IComment } from '@/types/newsfeed.types';

interface Props {
  post: IPost;
}

export const PostCard = ({ post }: Props) => {
  const vm = toPostCardViewModel(post);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<IComment[]>([]);
  const { data: commentsRes, isFetching: isCommentsFetching } = useGetCommentsQuery(post.postId, {
    skip: !isCommentOpen,
  });
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();
  const [reactToPost] = useReactToPostMutation();

  useEffect(() => {
    if (!commentsRes?.data) return;
    setComments(commentsRes.data);
  }, [commentsRes?.data]);

  const submitComment = async () => {
    const content = commentText.trim();
    if (!content) return;
    try {
      const created = await addComment({ postId: post.postId, content }).unwrap();
      if (created.data) {
        setComments((prev) => [created.data, ...prev]);
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
      className="feed-card-virtualized glass-card max-w-3xl mx-auto rounded-3xl overflow-hidden border-none shadow-lg shadow-black/5 dark:shadow-white/5"
    >
      <div className="p-4 md:p-5 flex items-center justify-between">
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
            <p className="text-xs text-muted-foreground">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div className="px-4 md:px-5 pb-3">
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
      <div className="p-4 md:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 group"
            onClick={() => {
              void reactToPost({ postId: post.postId, type: 'like' });
            }}
          >
            <div className="p-1.5 rounded-full group-hover:bg-red-500/10 transition-all">
              <Heart className="w-4 h-4 group-hover:text-red-500 group-hover:fill-red-500 transition-all" />
            </div>
            <span className="text-sm font-bold">{vm.likes}</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 group"
            onClick={() => setIsCommentOpen((prev) => !prev)}
          >
            <div className="p-1.5 rounded-full group-hover:bg-blue-600/10 transition-all">
              <MessageCircle className="w-4 h-4 group-hover:text-blue-600 transition-all" />
            </div>
            <span className="text-sm font-bold">
              {comments.length > 0 ? comments.length : post.commentsCount}
            </span>
          </button>
          <button
            type="button"
            className="p-1.5 rounded-full hover:bg-green-500/10 group transition-all"
          >
            <Share2 className="w-4 h-4 group-hover:text-green-500 transition-all" />
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
        <div className="px-4 md:px-5 pb-4 space-y-3">
          {isCommentsFetching ? (
            <p className="text-xs text-muted-foreground">Đang tải bình luận...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có bình luận nào.</p>
          ) : (
            <div className="max-h-44 overflow-auto space-y-2 pr-1">
              {comments.map((comment) => (
                <div key={comment.commentId} className="rounded-xl bg-muted/50 px-3 py-2">
                  <p className="text-xs font-semibold text-foreground/80">{comment.authorId}</p>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Viết bình luận..."
              className="flex-1 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
            />
            <button
              type="button"
              disabled={isAddingComment || commentText.trim().length === 0}
              onClick={submitComment}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              Gửi
            </button>
          </div>
        </div>
      ) : null}
    </motion.article>
  );
};
