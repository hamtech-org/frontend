// TODO(team): replace mocks with RTK Query / API
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import postsData from '@/pages/admin/mocks/posts.json';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type PostStatusFilter = 'all' | 'public' | 'hidden' | 'flagged';

export default function AdminPostsPage() {
  const { postInteractions, posts } = postsData;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatusFilter>('all');

  const q = search.trim().toLowerCase();

  const filteredInteractions = useMemo(
    () =>
      postInteractions.filter(
        (row) => row.title.toLowerCase().includes(q) || row.postId.toLowerCase().includes(q),
      ),
    [postInteractions, q],
  );

  const filteredPosts = useMemo(
    () =>
      posts
        .filter((p) => (statusFilter === 'all' ? true : p.status === statusFilter))
        .filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.author.toLowerCase().includes(q) ||
            p.postId.toLowerCase().includes(q),
        ),
    [posts, q, statusFilter],
  );

  const publicCount = posts.filter((p) => p.status === 'public').length;
  const flaggedCount = posts.filter((p) => p.status === 'flagged').length;

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">Quản lý bài viết</h1>
        <p className="text-sm text-muted-foreground mt-1">Dữ liệu mẫu (JSON) — nối backend sau.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tổng bài (mẫu)
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{posts.length}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Công khai
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{publicCount}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5 col-span-2 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Bị gắn cờ
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
            placeholder="Tìm theo tiêu đề, tác giả..."
            className="w-full rounded-xl pl-10"
            aria-label="Tìm kiếm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PostStatusFilter)}>
          <SelectTrigger className="w-full rounded-xl sm:w-[200px]" aria-label="Lọc trạng thái bài">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="public">public</SelectItem>
            <SelectItem value="hidden">hidden</SelectItem>
            <SelectItem value="flagged">flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="interactions" className="w-full min-w-0 gap-4">
        <TabsList
          variant="line"
          className="w-full flex-wrap justify-start h-auto min-h-9 py-1.5 gap-1"
        >
          <TabsTrigger value="interactions">Tương tác</TabsTrigger>
          <TabsTrigger value="status">Trạng thái bài viết</TabsTrigger>
        </TabsList>

        <TabsContent value="interactions" className="mt-4">
          <Card className="glass-card w-full min-w-0 border-none shadow-lg">
            <CardHeader>
              <CardTitle>Thống kê tương tác theo bài</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">Tiêu đề</th>
                    <th className="py-2 pr-4">Like</th>
                    <th className="py-2 pr-4">Bình luận</th>
                    <th className="py-2 pr-4">Chia sẻ</th>
                    <th className="py-2">Lượt xem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInteractions.map((row) => (
                    <tr key={row.postId} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{row.title}</td>
                      <td className="py-3 pr-4 tabular-nums">{row.likes}</td>
                      <td className="py-3 pr-4 tabular-nums">{row.comments}</td>
                      <td className="py-3 pr-4 tabular-nums">{row.shares}</td>
                      <td className="py-3 tabular-nums">{row.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <Card className="glass-card w-full min-w-0 border-none shadow-lg">
            <CardHeader>
              <CardTitle>Cập nhật trạng thái</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredPosts.map((p) => (
                <div
                  key={p.postId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.author} · {p.updatedAt}
                    </p>
                  </div>
                  <Badge
                    variant={
                      p.status === 'public'
                        ? 'default'
                        : p.status === 'hidden'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
