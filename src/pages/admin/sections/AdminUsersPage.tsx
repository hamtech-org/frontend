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
import userData from '@/pages/admin/mocks/userManagement.json';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type ReportFilter = 'all' | 'open' | 'in_review';

export default function AdminUsersPage() {
  const { accountModerationQueue, userReports } = userData;
  const [search, setSearch] = useState('');
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all');

  const q = search.trim().toLowerCase();

  const filteredModeration = useMemo(
    () =>
      accountModerationQueue.filter(
        (row) =>
          row.displayName.toLowerCase().includes(q) ||
          row.userId.toLowerCase().includes(q) ||
          row.reason.toLowerCase().includes(q),
      ),
    [accountModerationQueue, q],
  );

  const filteredReports = useMemo(
    () =>
      userReports
        .filter((row) => (reportFilter === 'all' ? true : row.status === reportFilter))
        .filter(
          (row) =>
            row.targetDisplayName.toLowerCase().includes(q) ||
            row.category.toLowerCase().includes(q) ||
            row.targetUserId.toLowerCase().includes(q),
        ),
    [userReports, q, reportFilter],
  );

  const pendingModeration = accountModerationQueue.filter((r) => r.status === 'pending').length;
  const openReports = userReports.filter((r) => r.status === 'open').length;

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">Quản lý người dùng</h1>
        <p className="text-sm text-muted-foreground mt-1">Dữ liệu mẫu (JSON) — nối backend sau.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Chờ kiểm duyệt
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{pendingModeration}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Báo cáo mở
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{openReports}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5 col-span-2 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tổng báo cáo (mẫu)
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{userReports.length}</p>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, userId, lý do..."
            className="w-full rounded-xl pl-10"
            aria-label="Tìm kiếm"
          />
        </div>
        <Select value={reportFilter} onValueChange={(v) => setReportFilter(v as ReportFilter)}>
          <SelectTrigger className="w-full rounded-xl sm:w-[200px]" aria-label="Lọc báo cáo">
            <SelectValue placeholder="Trạng thái báo cáo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái báo cáo</SelectItem>
            <SelectItem value="open">open</SelectItem>
            <SelectItem value="in_review">in_review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="moderation" className="w-full min-w-0 gap-4">
        <TabsList
          variant="line"
          className="w-full flex-wrap justify-start h-auto min-h-9 py-1.5 gap-1"
        >
          <TabsTrigger value="moderation">Kiểm duyệt tài khoản</TabsTrigger>
          <TabsTrigger value="reports">Xử lý báo cáo</TabsTrigger>
        </TabsList>

        <TabsContent value="moderation" className="mt-4">
          <Card className="glass-card w-full min-w-0 border-none shadow-lg">
            <CardHeader>
              <CardTitle>Hàng đợi kiểm duyệt</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">Người dùng</th>
                    <th className="py-2 pr-4">Lý do</th>
                    <th className="py-2 pr-4">Gửi lúc</th>
                    <th className="py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModeration.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-3 pr-4">
                        <span className="font-medium">{row.displayName}</span>
                        <span className="block text-xs text-muted-foreground font-mono">
                          {row.userId}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{row.reason}</td>
                      <td className="py-3 pr-4 text-xs whitespace-nowrap">{row.submittedAt}</td>
                      <td className="py-3">
                        <Badge variant="secondary">{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card className="glass-card w-full min-w-0 border-none shadow-lg">
            <CardHeader>
              <CardTitle>Báo cáo người dùng</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">Đối tượng</th>
                    <th className="py-2 pr-4">Loại</th>
                    <th className="py-2 pr-4">Tạo lúc</th>
                    <th className="py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{row.targetDisplayName}</td>
                      <td className="py-3 pr-4">{row.category}</td>
                      <td className="py-3 pr-4 text-xs whitespace-nowrap">{row.createdAt}</td>
                      <td className="py-3">
                        <Badge variant={row.status === 'open' ? 'destructive' : 'outline'}>
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
