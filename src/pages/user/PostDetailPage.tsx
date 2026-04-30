import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { IComment, IPost } from '@/types/newsfeed.types';
import {
  useGetCommentsQuery,
  useGetPostByIdQuery,
  useAddCommentMutation,
} from '@/store/api/newsfeedApi';
import PostContentRenderer from '@/components/newsfeed/PostContentRenderer';
import CommentThread from '@/components/newsfeed/CommentThread';

const hasImageNode = (content: string): boolean => {
  try {
    const parsed = JSON.parse(content) as unknown;
    const walk = (node: unknown): boolean => {
      if (node == null) return false;
      if (Array.isArray(node)) return node.some(walk);
      if (typeof node !== 'object') return false;
      const obj = node as Record<string, unknown>;
      if (obj.type === 'image') return true;
      return 'content' in obj ? walk(obj.content) : false;
    };
    return walk(parsed);
  } catch {
    return false;
  }
};

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const postId = params.postId;

  const { data: postRes, isLoading: loadingPost } = useGetPostByIdQuery(postId ?? '', {
    skip: !postId,
  });
  const { data: commentsRes, isLoading: loadingComments } = useGetCommentsQuery(postId ?? '', {
    skip: !postId,
  });

  const post: IPost | undefined = postRes?.data;
  const comments: IComment[] | undefined = commentsRes?.data;
  const showMediaFallback = post ? post.mediaUrls.length > 0 && !hasImageNode(post.content) : false;

  const [addComment, { isLoading: addingComment }] = useAddCommentMutation();

  const busy = loadingPost || loadingComments || addingComment;

  const onAddComment = async ({ content, parentId }: { content: string; parentId?: string }) => {
    if (!postId) return;
    await addComment({ postId, content, parentId }).unwrap();
  };

  const header = useMemo(() => {
    if (!post) return null;
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-full bg-black/5 px-3 py-2 text-sm font-bold hover:bg-black/10"
            onClick={() => navigate(-1)}
          >
            Quay lại
          </button>
          <span className="text-sm text-muted-foreground">Bài viết</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(post.createdAt).toLocaleString()}
        </span>
      </div>
    );
  }, [navigate, post]);

  if (!postId) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8">
      {header}

      {loadingPost && !post ? (
        <p className="text-sm text-muted-foreground">Đang tải bài viết...</p>
      ) : null}
      {post ? (
        <div className="rounded-3xl border border-border/40 bg-card p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold">
                Tác giả: {post.author?.displayName ?? post.authorId}
              </p>
              <p className="text-xs text-muted-foreground">
                {post.visibility} • {post.publicationStatus}
              </p>
            </div>
            <div className="flex gap-2">
              {Object.entries(post.reactionsCount ?? {}).map(([k, v]) => (
                <span key={k} className="text-xs rounded-full bg-muted/30 px-2 py-1">
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>

          <PostContentRenderer content={post.content} mediaUrls={post.mediaUrls} />
          {showMediaFallback ? (
            <div className="grid gap-3">
              {post.mediaUrls.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt="Post media"
                  className="w-full rounded-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-3xl border border-border/40 bg-card p-6 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold">Bình luận</h3>
          <span className="text-xs text-muted-foreground">
            {post?.commentsCount ?? 0} bình luận
          </span>
        </div>

        {busy && !comments ? (
          <p className="text-sm text-muted-foreground">Đang tải bình luận...</p>
        ) : null}

        <CommentThread comments={comments} onAddComment={onAddComment} />
      </div>
    </div>
  );
}
