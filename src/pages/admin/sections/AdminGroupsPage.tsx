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
import groupData from '@/pages/admin/mocks/groupManagement.json';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type GroupStatusFilter = 'all' | 'active' | 'locked' | 'archived';

export default function AdminGroupsPage() {
  const { groupInteractions, groups, groupMembers } = groupData;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GroupStatusFilter>('all');

  const q = search.trim().toLowerCase();

  const filteredInteractions = useMemo(
    () => groupInteractions.filter((row) => row.name.toLowerCase().includes(q)),
    [groupInteractions, q],
  );
  const filteredGroups = useMemo(
    () =>
      groups
        .filter((g) => (statusFilter === 'all' ? true : g.status === statusFilter))
        .filter((g) => g.name.toLowerCase().includes(q)),
    [groups, q, statusFilter],
  );
  const filteredMembers = useMemo(
    () =>
      groupMembers.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          m.userId.toLowerCase().includes(q) ||
          m.groupId.toLowerCase().includes(q),
      ),
    [groupMembers, q],
  );

  const activeCount = groups.filter((g) => g.status === 'active').length;
  const totalMembers = groups.reduce((s, g) => s + g.memberCount, 0);

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">Quản lý nhóm</h1>
        <p className="text-sm text-muted-foreground mt-1">Dữ liệu mẫu (JSON) — nối backend sau.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tổng nhóm
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{groups.length}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Đang hoạt động
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5 col-span-2 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Thành viên (tổng mẫu)
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{totalMembers}</p>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên nhóm, thành viên..."
            className="w-full rounded-xl pl-10"
            aria-label="Tìm kiếm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as GroupStatusFilter)}>
          <SelectTrigger
            className="w-full rounded-xl sm:w-[200px]"
            aria-label="Lọc trạng thái nhóm"
          >
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="active">active</SelectItem>
            <SelectItem value="locked">locked</SelectItem>
            <SelectItem value="archived">archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="interaction" className="w-full min-w-0 gap-4">
        <TabsList
          variant="line"
          className="w-full flex-wrap justify-start h-auto min-h-9 py-1.5 gap-1"
        >
          <TabsTrigger value="interaction">Thống kê tương tác</TabsTrigger>
          <TabsTrigger value="status">Trạng thái nhóm</TabsTrigger>
          <TabsTrigger value="members">Thành viên (mẫu)</TabsTrigger>
        </TabsList>

        <TabsContent value="interaction" className="mt-4">
          <Card className="glass-card w-full min-w-0 border-none shadow-lg">
            <CardHeader>
              <CardTitle>Mức độ tương tác (7 ngày)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">Nhóm</th>
                    <th className="py-2 pr-4">Tin nhắn</th>
                    <th className="py-2 pr-4">TV hoạt động</th>
                    <th className="py-2">Reaction</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInteractions.map((row) => (
                    <tr key={row.groupId} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{row.name}</td>
                      <td className="py-3 pr-4 tabular-nums">{row.messages7d}</td>
                      <td className="py-3 pr-4 tabular-nums">{row.activeMembers7d}</td>
                      <td className="py-3 tabular-nums">{row.reactions7d}</td>
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
              <CardTitle>Cập nhật trạng thái nhóm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredGroups.map((g) => (
                <div
                  key={g.groupId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.memberCount} thành viên · cập nhật {g.updatedAt}
                    </p>
                  </div>
                  <Badge
                    variant={
                      g.status === 'active'
                        ? 'default'
                        : g.status === 'locked'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {g.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card className="glass-card w-full min-w-0 border-none shadow-lg">
            <CardHeader>
              <CardTitle>Danh sách thành viên (nhóm mẫu)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">Tên</th>
                    <th className="py-2 pr-4">Vai trò</th>
                    <th className="py-2 pr-4">Nhóm</th>
                    <th className="py-2">Tham gia</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={`${m.groupId}-${m.userId}`} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{m.displayName}</td>
                      <td className="py-3 pr-4">{m.role}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{m.groupId}</td>
                      <td className="py-3">{m.joinedAt}</td>
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
