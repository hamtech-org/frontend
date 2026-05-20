import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetAdminResourceSummaryQuery } from '@/store/api/adminApi';
import type {
  IResourceBreakdownCell,
  ResourceMediaType,
  ResourceSource,
} from '@/types/adminResources.types';
import { RESOURCE_SOURCE_LABELS, RESOURCE_TYPE_LABELS } from '@/types/adminResources.types';
import { cn } from '@/utils/cn';
import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
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

type SourceFilter = 'all' | ResourceSource;
type TypeFilter = 'all' | ResourceMediaType;

const PIE_COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#64748b'];
const STACK_COLORS: Record<ResourceMediaType, string> = {
  image: '#2563eb',
  video: '#059669',
  audio: '#d97706',
  file: '#64748b',
};

const ALL_SOURCES: ResourceSource[] = [
  'chat_direct',
  'chat_group',
  'post',
  'reel',
  'avatar',
  'other',
];

const ALL_TYPES: ResourceMediaType[] = ['image', 'video', 'audio', 'file'];

function bytesToGb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024 * 1024)) * 100) / 100;
}

function formatGb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${bytesToGb(bytes).toFixed(2)} GB`;
}

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

function filterMatrix(
  matrix: IResourceBreakdownCell[],
  sourceFilter: SourceFilter,
  typeFilter: TypeFilter,
): IResourceBreakdownCell[] {
  return matrix.filter(
    (c) =>
      (sourceFilter === 'all' || c.source === sourceFilter) &&
      (typeFilter === 'all' || c.type === typeFilter),
  );
}

function aggregateByKey(
  cells: IResourceBreakdownCell[],
  key: 'source' | 'type',
): { name: string; bytes: number; count: number }[] {
  const map = new Map<string, { bytes: number; count: number }>();
  for (const c of cells) {
    const k = c[key];
    const row = map.get(k) ?? { bytes: 0, count: 0 };
    row.bytes += c.bytes;
    row.count += c.count;
    map.set(k, row);
  }
  const labels = key === 'source' ? RESOURCE_SOURCE_LABELS : RESOURCE_TYPE_LABELS;
  return [...map.entries()]
    .map(([k, v]) => ({
      name: labels[k as keyof typeof labels] ?? k,
      bytes: v.bytes,
      count: v.count,
    }))
    .filter((r) => r.bytes > 0 || r.count > 0)
    .sort((a, b) => b.bytes - a.bytes);
}

export default function AdminResourcesPage() {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [wantRefresh, setWantRefresh] = useState(false);

  const { data, isLoading, isFetching, isError } = useGetAdminResourceSummaryQuery(
    wantRefresh ? { refresh: true } : undefined,
    { refetchOnMountOrArgChange: true },
  );

  useEffect(() => {
    if (wantRefresh && !isFetching) setWantRefresh(false);
  }, [wantRefresh, isFetching]);

  const summary = data?.data;

  const filtered = useMemo(
    () => filterMatrix(summary?.matrix ?? [], sourceFilter, typeFilter),
    [summary?.matrix, sourceFilter, typeFilter],
  );

  const totalBytes = useMemo(() => filtered.reduce((s, c) => s + c.bytes, 0), [filtered]);
  const totalFiles = useMemo(() => filtered.reduce((s, c) => s + c.count, 0), [filtered]);

  const largestSource = useMemo(() => aggregateByKey(filtered, 'source')[0], [filtered]);
  const largestType = useMemo(() => aggregateByKey(filtered, 'type')[0], [filtered]);

  const stackedChartData = useMemo(() => {
    const sources = sourceFilter === 'all' ? ALL_SOURCES : [sourceFilter];
    return sources
      .map((source) => {
        const row: Record<string, string | number> = {
          sourceKey: source,
          source: RESOURCE_SOURCE_LABELS[source],
        };
        for (const type of ALL_TYPES) {
          const cell = filtered.find((c) => c.source === source && c.type === type);
          row[type] = cell ? bytesToGb(cell.bytes) : 0;
        }
        return row;
      })
      .filter((row) => ALL_TYPES.some((t) => Number(row[t]) > 0));
  }, [filtered, sourceFilter]);

  const pieBySource = useMemo(() => aggregateByKey(filtered, 'source'), [filtered]);
  const pieByType = useMemo(() => aggregateByKey(filtered, 'type'), [filtered]);

  const handleRefresh = () => setWantRefresh(true);

  const computedLabel = summary?.computedAt
    ? new Date(summary.computedAt).toLocaleString('vi-VN')
    : '—';

  const loading = isLoading || (isFetching && !summary);

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">
            Báo cáo tài nguyên
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quét toàn bộ Media + map nguồn (chat, bài viết, reels, avatar). Cache 5 phút.
          </p>
          <p className="text-xs text-muted-foreground mt-1">Cập nhật lúc: {computedLabel}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
            <SelectTrigger className="w-full rounded-xl sm:w-[200px]" aria-label="Lọc nguồn">
              <SelectValue placeholder="Nguồn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nguồn</SelectItem>
              {ALL_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {RESOURCE_SOURCE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="w-full rounded-xl sm:w-[200px]" aria-label="Lọc loại">
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {ALL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {RESOURCE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => void handleRefresh()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="size-4 mr-2" />
            )}
            Tính lại
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="size-5 animate-spin" />
          Đang quét dữ liệu…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Không tải được báo cáo tài nguyên.</p>
      ) : !summary || summary.totalFiles === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Chưa có file media trong hệ thống. Upload qua chat hoặc bài viết để thấy số liệu.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Tổng dung lượng" value={formatGb(totalBytes)} />
            <KpiCard label="Số file" value={totalFiles} />
            <KpiCard
              label="Nguồn lớn nhất"
              value={largestSource?.name ?? '—'}
              hint={largestSource ? formatGb(largestSource.bytes) : undefined}
            />
            <KpiCard
              label="Loại lớn nhất"
              value={largestType?.name ?? '—'}
              hint={largestType ? formatGb(largestType.bytes) : undefined}
            />
          </div>

          <Card className="glass-card border-none shadow-lg">
            <CardHeader>
              <CardTitle>Phân bổ theo nguồn (stacked)</CardTitle>
              <CardDescription>GB theo nguồn, xếp chồng theo loại media</CardDescription>
            </CardHeader>
            <CardContent>
              {stackedChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Không có dữ liệu cho bộ lọc hiện tại.
                </p>
              ) : (
                <ChartFrame>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stackedChartData}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit=" GB" />
                      <Tooltip formatter={(v: number) => [`${v} GB`, '']} />
                      <Legend />
                      {ALL_TYPES.map((type) => (
                        <Bar
                          key={type}
                          dataKey={type}
                          name={RESOURCE_TYPE_LABELS[type]}
                          stackId="storage"
                          fill={STACK_COLORS[type]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartFrame>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass-card border-none shadow-lg">
              <CardHeader>
                <CardTitle>% theo nguồn</CardTitle>
              </CardHeader>
              <CardContent>
                {pieBySource.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <ChartFrame className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieBySource}
                          dataKey="bytes"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {pieBySource.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatGb(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-none shadow-lg">
              <CardHeader>
                <CardTitle>% theo loại</CardTitle>
              </CardHeader>
              <CardContent>
                {pieByType.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <ChartFrame className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieByType}
                          dataKey="bytes"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {pieByType.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatGb(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-none shadow-lg">
            <CardHeader>
              <CardTitle>Top người upload</CardTitle>
              <CardDescription>
                10 tài khoản chiếm nhiều dung lượng nhất (toàn hệ thống)
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">Người dùng</th>
                    <th className="py-2 pr-4">Dung lượng</th>
                    <th className="py-2">Số file</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topUploaders.map((row) => (
                    <tr key={row.userId} className="border-b border-border/40">
                      <td className="py-2 pr-4 font-medium">{row.displayName}</td>
                      <td className="py-2 pr-4 tabular-nums">{formatGb(row.bytes)}</td>
                      <td className="py-2 tabular-nums">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {(sourceFilter !== 'all' || typeFilter !== 'all') && filtered.length > 0 ? (
            <Card className="glass-card border-none shadow-lg">
              <CardHeader>
                <CardTitle>Chi tiết bộ lọc</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 pr-4">Nguồn</th>
                      <th className="py-2 pr-4">Loại</th>
                      <th className="py-2 pr-4">Dung lượng</th>
                      <th className="py-2">Số file</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((cell) => (
                      <tr key={`${cell.source}-${cell.type}`} className="border-b border-border/40">
                        <td className="py-2 pr-4">{RESOURCE_SOURCE_LABELS[cell.source]}</td>
                        <td className="py-2 pr-4">{RESOURCE_TYPE_LABELS[cell.type]}</td>
                        <td className="py-2 pr-4 tabular-nums">{formatGb(cell.bytes)}</td>
                        <td className="py-2 tabular-nums">{cell.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
