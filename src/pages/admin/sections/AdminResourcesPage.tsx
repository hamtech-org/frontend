// TODO(team): replace mocks with RTK Query / API
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import resourcesData from '@/pages/admin/mocks/resources.json';
import { useMemo, useState } from 'react';

type MediaFilter = 'all' | 'image' | 'video' | 'audio' | 'file';

export default function AdminResourcesPage() {
  const { totalStorageGb, byMediaType } = resourcesData;
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');

  const rows = useMemo(
    () => (mediaFilter === 'all' ? byMediaType : byMediaType.filter((r) => r.type === mediaFilter)),
    [byMediaType, mediaFilter],
  );

  const largest = useMemo(
    () => byMediaType.reduce((a, b) => (b.gb > a.gb ? b : a), byMediaType[0]),
    [byMediaType],
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">
            Báo cáo tài nguyên
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dữ liệu mẫu (JSON) — nối backend sau.
          </p>
        </div>
        <Select value={mediaFilter} onValueChange={(v) => setMediaFilter(v as MediaFilter)}>
          <SelectTrigger className="w-full rounded-xl sm:w-[200px]" aria-label="Lọc loại media">
            <SelectValue placeholder="Loại media" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="image">Hình ảnh</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Âm thanh</SelectItem>
            <SelectItem value="file">Tệp khác</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tổng ước tính
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">
            {totalStorageGb}
            <span className="text-base font-medium text-muted-foreground"> GB</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Loại chiếm nhiều nhất
          </p>
          <p className="mt-2 text-lg font-bold leading-snug">{largest?.label ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-foreground/5 col-span-2 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Số loại đang xem
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{rows.length}</p>
        </div>
      </div>

      <Card className="glass-card w-full min-w-0 border-none shadow-lg">
        <CardHeader>
          <CardTitle>Phân bổ dung lượng media</CardTitle>
          <CardDescription>Thanh tiến độ theo % mock</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-4xl font-display font-extrabold tracking-tight tabular-nums">
            {totalStorageGb}
            <span className="text-lg font-medium text-muted-foreground ml-1">GB</span>
          </p>
          <div className="w-full min-w-0 space-y-4">
            {rows.map((row) => (
              <div key={row.type} className="w-full min-w-0">
                <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {row.gb} GB ({row.percent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full min-w-0 rounded-full bg-blue-600/80 transition-[width]"
                    style={{ width: `${Math.min(100, row.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
