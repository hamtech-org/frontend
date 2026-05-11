// TODO(team): replace mocks with RTK Query / API
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import aiData from '@/pages/admin/mocks/aiFilter.json';
import { cn } from '@/utils/cn';

export default function AdminAiFilterPage() {
  const { sensitiveKeywords, lastUpdatedBy, lastUpdatedAt, note } = aiData;
  const draft = sensitiveKeywords.join('\n');

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">Cấu hình bộ lọc AI</h1>
        <p className="text-sm text-muted-foreground mt-1">Dữ liệu mẫu (JSON) — nối backend sau.</p>
      </div>

      <div className="grid w-full min-w-0 gap-4 lg:grid-cols-3">
        <Card className="glass-card w-full min-w-0 border-none shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle>Từ khóa nhạy cảm (cảnh báo)</CardTitle>
            <CardDescription>
              Cập nhật lần cuối: {lastUpdatedAt} — {lastUpdatedBy}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{note}</p>
            <div className="flex flex-wrap gap-2">
              {sensitiveKeywords.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="rounded-lg px-2.5 py-1 text-xs font-normal"
                >
                  {kw}
                </Badge>
              ))}
            </div>
            <textarea
              readOnly
              rows={6}
              defaultValue={draft}
              className={cn(
                'w-full min-h-[140px] resize-y rounded-2xl border border-input bg-transparent px-3.5 py-2.5 text-sm font-mono outline-none',
                'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'dark:bg-input/30',
              )}
            />
          </CardContent>
          <CardFooter className="border-t bg-muted/40">
            <Button type="button" disabled className="rounded-xl">
              Lưu cấu hình (mock)
            </Button>
          </CardFooter>
        </Card>

        <Card className="glass-card w-full min-w-0 border-none shadow-lg">
          <CardHeader>
            <CardTitle>Gợi ý chính sách</CardTitle>
            <CardDescription>Mock — team nối rule thật</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Cảnh báo khi tin nhắn hoặc bài viết chứa từ khóa trong danh sách.</p>
            <p>Log hành động admin khi thêm/xóa từ khóa.</p>
            <p>Giới hạn độ dài từ khóa và tần suất cập nhật để tránh abuse.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
