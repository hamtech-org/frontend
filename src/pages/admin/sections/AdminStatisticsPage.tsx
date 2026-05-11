// TODO(team): refine aggregations / labels with product
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetAdminAnalyticsDashboardQuery } from '@/store/api/adminApi';
import type { AdminAnalyticsInterval } from '@/types/adminAnalytics.types';
import { cn } from '@/utils/cn';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type RangeKey = '7' | '30' | '90';

const PIE_COLORS = ['#2563eb', '#059669', '#d97706', '#64748b'];

function ChartFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('h-[280px] w-full min-h-0 min-w-0', className)}>{children}</div>;
}

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-display font-bold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function shortTickLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { month: 'numeric', day: 'numeric', hour: '2-digit' });
  } catch {
    return iso;
  }
}

function peakHint(peakHourUtc: string | null): string {
  if (!peakHourUtc) return 'Chưa đủ dữ liệu';
  try {
    const d = new Date(peakHourUtc);
    return `Bucket cao nhất: ${d.toLocaleString('vi-VN')}`;
  } catch {
    return peakHourUtc;
  }
}

function dashboardFetchErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const msg = (error as { data?: { message?: string } }).data?.message;
    if (msg) return String(msg);
  }
  if (error instanceof Error) return error.message;
  return 'Lỗi mạng hoặc máy chủ';
}

export default function AdminStatisticsPage() {
  const [range, setRange] = useState<RangeKey>('7');
  const [interval, setInterval] = useState<AdminAnalyticsInterval>('day');

  const { from, to } = useMemo(() => {
    const toD = new Date();
    const fromD = new Date(toD);
    const days = range === '7' ? 7 : range === '30' ? 30 : 90;
    fromD.setTime(toD.getTime() - days * 86_400_000);
    return { from: fromD.toISOString(), to: toD.toISOString() };
  }, [range]);

  const { data, isFetching, isError, error } = useGetAdminAnalyticsDashboardQuery({
    from,
    to,
    interval,
  });

  const dash = data?.data;
  const rangeLabel = range === '7' ? '7 ngày' : range === '30' ? '30 ngày' : '90 ngày';

  const messageSeriesChart = useMemo(
    () =>
      (dash?.messagesByInterval ?? []).map((p) => ({
        label: shortTickLabel(p.t),
        count: p.count,
      })),
    [dash?.messagesByInterval],
  );

  const peakTableRows = useMemo(() => {
    const rows = [...(dash?.messagesByHour ?? [])];
    return rows.sort((a, b) => b.count - a.count);
  }, [dash?.messagesByHour]);

  const groupThreadsChart = useMemo(
    () =>
      (dash?.groupChatTop ?? []).map((g) => ({
        name: g.name ?? g.conversationId.slice(0, 8) + '…',
        threads: g.messageCount,
      })),
    [dash?.groupChatTop],
  );

  const unavailable = dash?.meta.source === 'unavailable';

  return (
    <div className="w-full min-w-0 space-y-6">
      {(unavailable || isError) && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          role="status"
        >
          <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium">
              {isError
                ? `Không tải được thống kê: ${dashboardFetchErrorMessage(error)}`
                : 'Elasticsearch không khả dụng hoặc chưa có tin được index — biểu đồ có thể trống.'}
            </p>
            <p className="mt-1 text-xs opacity-90">
              Gửi tin nhắn mới sau khi bật Kafka + consumer để index vào ES. Bài viết cần đã publish
              để có trong index posts.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">
            Thống kê & phân tích
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isFetching && (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Đang tải…
            </span>
          )}
          <span className="text-sm text-muted-foreground">Khoảng</span>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-[140px] rounded-xl" aria-label="Khoảng thời gian">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
              <SelectItem value="90">90 ngày</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">Bước</span>
          <Select value={interval} onValueChange={(v) => setInterval(v as AdminAnalyticsInterval)}>
            <SelectTrigger className="w-[140px] rounded-xl" aria-label="Calendar interval">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Giờ</SelectItem>
              <SelectItem value="day">Ngày</SelectItem>
              <SelectItem value="week">Tuần</SelectItem>
              <SelectItem value="month">Tháng</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Tổng tin nhắn"
          value={(dash?.kpi.totalMessages ?? 0).toLocaleString('vi-VN')}
          hint={rangeLabel}
        />
        <KpiCard
          label="Tổng bài viết (index)"
          value={(dash?.kpi.totalPosts ?? 0).toLocaleString('vi-VN')}
          hint="Theo khoảng đã chọn"
        />
        <KpiCard
          label="Nhóm có tin"
          value={dash?.kpi.groupConversationsWithMessages ?? 0}
          hint="Top theo bucket terms"
        />
        <KpiCard
          label="Peak (bucket giờ)"
          value={dash?.kpi.peakHourUtc ? shortTickLabel(dash.kpi.peakHourUtc) : '—'}
          hint={peakHint(dash?.kpi.peakHourUtc ?? null)}
        />
      </div>

      <Tabs defaultValue="messages" className="w-full min-w-0 gap-4">
        <TabsList
          variant="line"
          className="w-full flex-wrap justify-start h-auto min-h-9 py-1.5 gap-1"
        >
          <TabsTrigger value="messages">Tin nhắn</TabsTrigger>
          <TabsTrigger value="peak">Cao điểm</TabsTrigger>
          <TabsTrigger value="groups">Nhóm chat</TabsTrigger>
          <TabsTrigger value="posts">Bài viết</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-4 space-y-4">
          <div className="grid w-full min-w-0 gap-4 lg:grid-cols-2">
            <Card className="glass-card w-full min-w-0 border-none shadow-lg">
              <CardHeader>
                <CardTitle>Số tin theo thời gian</CardTitle>
                <CardDescription>Histogram — interval: {interval}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartFrame>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={messageSeriesChart}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} width={40} />
                      <Tooltip contentStyle={{ borderRadius: 12 }} />
                      <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} name="Tin" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </CardContent>
            </Card>
            <Card className="glass-card w-full min-w-0 border-none shadow-lg">
              <CardHeader>
                <CardTitle>Xu hướng</CardTitle>
                <CardDescription>Area — cùng dữ liệu</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartFrame>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={messageSeriesChart}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} width={40} />
                      <Tooltip contentStyle={{ borderRadius: 12 }} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#059669"
                        fill="#059669"
                        fillOpacity={0.25}
                        name="Tin"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="peak" className="mt-4 space-y-4">
          <Card className="glass-card w-full min-w-0 border-none shadow-lg">
            <CardHeader>
              <CardTitle>Số tin theo giờ (UTC bucket)</CardTitle>
              <CardDescription>date_histogram calendar_interval hour</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dash?.messagesByHour ?? []}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis
                      dataKey="t"
                      tickFormatter={(iso) => shortTickLabel(iso)}
                      tick={{ fontSize: 9 }}
                      interval="preserveStartEnd"
                      angle={-35}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12 }}
                      labelFormatter={(iso) => String(iso)}
                    />
                    <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} name="Tin" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            </CardContent>
          </Card>
          <Card className="glass-card w-full min-w-0 border-none shadow-lg">
            <CardHeader>
              <CardTitle>Top khung giờ (theo số tin)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">Giờ (UTC)</th>
                    <th className="py-2">Số tin</th>
                  </tr>
                </thead>
                <tbody>
                  {peakTableRows.map((row) => (
                    <tr key={row.t} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium tabular-nums">
                        {shortTickLabel(row.t)} ({row.hour}h UTC)
                      </td>
                      <td className="py-3 tabular-nums">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="mt-4 space-y-4">
          <div className="grid w-full min-w-0 gap-4 lg:grid-cols-2">
            <Card className="glass-card w-full min-w-0 border-none shadow-lg">
              <CardHeader>
                <CardTitle>Tin theo hội thoại nhóm</CardTitle>
                <CardDescription>terms conversationId (type = group)</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartFrame className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={groupThreadsChart}
                      layout="vertical"
                      margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/40"
                        horizontal={false}
                      />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: 12 }} />
                      <Bar dataKey="threads" fill="#2563eb" radius={[0, 6, 6, 0]} name="Tin" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </CardContent>
            </Card>
            <Card className="glass-card w-full min-w-0 border-none shadow-lg">
              <CardHeader>
                <CardTitle>Bảng chi tiết</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 pr-4">conversationId</th>
                      <th className="py-2">Số tin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dash?.groupChatTop ?? []).map((row) => (
                      <tr key={row.conversationId} className="border-b border-border/60">
                        <td className="py-3 pr-4 font-mono text-xs break-all">
                          {row.conversationId}
                        </td>
                        <td className="py-3 tabular-nums">{row.messageCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="posts" className="mt-4 space-y-4">
          <div className="grid w-full min-w-0 gap-4 lg:grid-cols-2">
            <Card className="glass-card w-full min-w-0 border-none shadow-lg">
              <CardHeader>
                <CardTitle>Bài viết theo thời gian</CardTitle>
                <CardDescription>Index posts — interval: {interval}</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartFrame>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(dash?.postsByInterval ?? []).map((p) => ({
                        label: shortTickLabel(p.t),
                        count: p.count,
                      }))}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} width={36} />
                      <Tooltip contentStyle={{ borderRadius: 12 }} />
                      <Bar dataKey="count" fill="#d97706" radius={[6, 6, 0, 0]} name="Bài" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </CardContent>
            </Card>
            <Card className="glass-card w-full min-w-0 border-none shadow-lg">
              <CardHeader>
                <CardTitle>Phân bổ theo type</CardTitle>
                <CardDescription>terms field type</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartFrame>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dash?.postsByType ?? []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={88}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {(dash?.postsByType ?? []).map((entry, i) => (
                          <Cell
                            key={`${entry.name}-${i}`}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
