import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminFormDialog from '@/components/admin/AdminFormDialog';
import AdminRowActions from '@/components/admin/AdminRowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AdminPostDisplayStatus,
  AdminPostListItem,
  PostVisibility,
} from '@/types/adminCrud.types';
import {
  useCreateAdminPostMutation,
  useDeleteAdminPostMutation,
  useListAdminPostsQuery,
  useUpdateAdminPostMutation,
} from '@/store/api/adminApi';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { extractTextFromTiptapJson } from '@/utils/tiptapText';

type PostStatusFilter = 'all' | AdminPostDisplayStatus;

export default function AdminPostsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatusFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editPost, setEditPost] = useState<AdminPostListItem | null>(null);
  const [deletePost, setDeletePost] = useState<AdminPostListItem | null>(null);

  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [status, setStatus] = useState<AdminPostDisplayStatus>('visible');
  const [editContent, setEditContent] = useState('');
  const [editVisibility, setEditVisibility] = useState<PostVisibility>('public');
  const [editStatus, setEditStatus] = useState<AdminPostDisplayStatus>('visible');

  const listQuery = {
    query: search.trim() || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 50,
  };

  const { data, isLoading, isError, refetch } = useListAdminPostsQuery(listQuery);
  const [createPost, { isLoading: creating }] = useCreateAdminPostMutation();
  const [updatePost, { isLoading: updating }] = useUpdateAdminPostMutation();
  const [removePost, { isLoading: deleting }] = useDeleteAdminPostMutation();

  const posts = data?.data.items ?? [];
  const visibleCount = useMemo(() => posts.filter((p) => p.status === 'visible').length, [posts]);
  const flaggedCount = useMemo(() => posts.filter((p) => p.status === 'flagged').length, [posts]);

  const openEdit = (post: AdminPostListItem) => {
    setEditPost(post);
    setEditContent(extractTextFromTiptapJson(post.content));
    setEditVisibility(post.visibility);
    setEditStatus(post.status);
  };

  const handleCreate = async () => {
    try {
      const contentJson = content.trim()
        ? JSON.stringify({
            type: 'doc',
            content: content.split('\n').map((line) => ({
              type: 'paragraph',
              content: line ? [{ type: 'text', text: line }] : [],
            })),
          })
        : JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });

      await createPost({ content: contentJson, visibility, status }).unwrap();
      toast.success('Đã tạo bài viết');
      setCreateOpen(false);
      setContent('');
      setVisibility('public');
      setStatus('visible');
    } catch {
      toast.error('Không thể tạo bài viết');
    }
  };

  const handleUpdate = async () => {
    if (!editPost) return;
    try {
      const contentJson = editContent.trim()
        ? JSON.stringify({
            type: 'doc',
            content: editContent.split('\n').map((line) => ({
              type: 'paragraph',
              content: line ? [{ type: 'text', text: line }] : [],
            })),
          })
        : JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });

      await updatePost({
        postId: editPost.postId,
        body: { content: contentJson, visibility: editVisibility, status: editStatus },
      }).unwrap();
      toast.success('Đã cập nhật bài viết');
      setEditPost(null);
    } catch {
      toast.error('Không thể cập nhật');
    }
  };

  const handleDelete = async () => {
    if (!deletePost) return;
    try {
      await removePost(deletePost.postId).unwrap();
      toast.success('Đã xóa bài viết');
      setDeletePost(null);
    } catch {
      toast.error('Không thể xóa');
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">Quản lý bài viết</h1>
          <p className="text-sm text-muted-foreground mt-1">CRUD bài đăng newsfeed</p>
        </div>
        <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Tạo bài viết
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hiển thị
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{visibleCount}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Gắn cờ
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{flaggedCount}</p>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nội dung, postId, authorId…"
            className="w-full rounded-xl pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PostStatusFilter)}>
          <SelectTrigger className="w-full rounded-xl sm:w-[200px]">
            <SelectValue placeholder="Kiểm duyệt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="visible">visible</SelectItem>
            <SelectItem value="hidden">hidden</SelectItem>
            <SelectItem value="flagged">flagged</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="rounded-xl" onClick={() => refetch()}>
          Tải lại
        </Button>
      </div>

      <Card className="glass-card border-none shadow-lg">
        <CardHeader>
          <CardTitle>Danh sách bài viết</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Không tải được dữ liệu.</p>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-4">Tiêu đề</th>
                  <th className="py-2 pr-4">Tác giả</th>
                  <th className="py-2 pr-4">Tương tác</th>
                  <th className="py-2 pr-4">Trạng thái</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((row) => (
                  <tr key={row.postId} className="border-b border-border/40">
                    <td
                      className="py-3 pr-4 max-w-[240px] truncate font-medium"
                      title={extractTextFromTiptapJson(row.content)}
                    >
                      {extractTextFromTiptapJson(row.content)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.authorDisplayName ?? row.authorId}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.likes} thích · {row.comments} cmt
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline">{row.status}</Badge>
                    </td>
                    <td className="py-3">
                      <AdminRowActions
                        onEdit={() => openEdit(row)}
                        onDelete={() => setDeletePost(row)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <AdminFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tạo bài viết"
        submitLabel="Đăng"
        loading={creating}
        onSubmit={handleCreate}
      >
        <div className="space-y-2">
          <Label>Nội dung</Label>
          <textarea
            className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label>Hiển thị</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as PostVisibility)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">public</SelectItem>
              <SelectItem value="friends">friends</SelectItem>
              <SelectItem value="private">private</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Kiểm duyệt</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as AdminPostDisplayStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visible">visible</SelectItem>
              <SelectItem value="hidden">hidden</SelectItem>
              <SelectItem value="flagged">flagged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminFormDialog>

      <AdminFormDialog
        open={!!editPost}
        onOpenChange={(o) => !o && setEditPost(null)}
        title="Sửa bài viết"
        loading={updating}
        onSubmit={handleUpdate}
      >
        <div className="space-y-2">
          <Label>Nội dung</Label>
          <textarea
            className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label>Hiển thị</Label>
          <Select
            value={editVisibility}
            onValueChange={(v) => setEditVisibility(v as PostVisibility)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">public</SelectItem>
              <SelectItem value="friends">friends</SelectItem>
              <SelectItem value="private">private</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Kiểm duyệt</Label>
          <Select
            value={editStatus}
            onValueChange={(v) => setEditStatus(v as AdminPostDisplayStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visible">visible</SelectItem>
              <SelectItem value="hidden">hidden</SelectItem>
              <SelectItem value="flagged">flagged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminFormDialog>

      <AdminConfirmDialog
        open={!!deletePost}
        onOpenChange={(o) => !o && setDeletePost(null)}
        title="Xóa bài viết?"
        description="Hành động không hoàn tác."
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
