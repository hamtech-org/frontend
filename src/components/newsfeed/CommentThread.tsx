import { useMemo, useState } from 'react';
import type { IComment } from '@/types/newsfeed.types';

function normalizeComments(comments: IComment[] | undefined) {
  return Array.isArray(comments) ? comments : [];
}

export default function CommentThread({
  comments,
  onAddComment,
}: {
  comments: IComment[] | undefined;
  onAddComment: (args: { content: string; parentId?: string }) => Promise<void>;
}) {
  const list = useMemo(() => normalizeComments(comments), [comments]);

  const roots = useMemo(() => list.filter((c) => c.parentId === null), [list]);
  const childrenByParent = useMemo(() => {
    const m = new Map<string, IComment[]>();
    for (const c of list) {
      if (!c.parentId) continue;
      const arr = m.get(c.parentId) ?? [];
      arr.push(c);
      m.set(c.parentId, arr);
    }
    return m;
  }, [list]);

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const submitReply = async (parentId: string) => {
    const text = replyText.trim();
    if (!text) return;
    await onAddComment({ content: text, parentId });
    setReplyTo(null);
    setReplyText('');
  };

  return (
    <div className="space-y-6">
      {roots.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có bình luận.</p>
      ) : null}

      {roots.map((root) => {
        const kids = childrenByParent.get(root.commentId) ?? [];
        return (
          <div key={root.commentId} className="space-y-3">
            <div className="rounded-2xl border border-border/40 bg-card p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold">{root.authorId}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(root.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{root.content}</p>
              <button
                type="button"
                className="mt-3 text-sm font-bold text-blue-600 hover:underline"
                onClick={() => setReplyTo(root.commentId)}
              >
                Trả lời
              </button>
            </div>

            {kids.length > 0 ? (
              <div className="ml-6 space-y-3">
                {kids.map((child) => (
                  <div
                    key={child.commentId}
                    className="rounded-2xl border border-border/40 bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold">{child.authorId}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(child.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap">{child.content}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {replyTo === root.commentId ? (
              <div className="ml-6 space-y-2">
                <textarea
                  className="w-full min-h-[90px] rounded-2xl border border-border/40 bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-blue-600/30"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Nhập nội dung trả lời..."
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
                    onClick={() => void submitReply(root.commentId)}
                  >
                    Gửi
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl bg-black/5 px-4 py-2 text-sm font-bold"
                    onClick={() => {
                      setReplyTo(null);
                      setReplyText('');
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
