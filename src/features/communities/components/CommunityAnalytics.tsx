import { useState } from 'react';
import { useGetCommunityAnalyticsQuery } from '@/store/api/communityApi';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Users,
  MessageSquare,
  FileText,
  Activity,
  Award,
  Calendar,
  ThumbsUp,
  MessageCircle,
} from 'lucide-react';
import { EmptyState } from './EmptyState';
import { getCleanPostContent } from '@/utils/utils';

export default function CommunityAnalytics({ groupId }: { groupId: string }) {
  const [days, setDays] = useState<number>(30);
  const { data: response, isLoading, isError } = useGetCommunityAnalyticsQuery({ groupId, days });

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-6">
        <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Đang tải số liệu thống kê...</p>
      </div>
    );
  }

  if (isError || !response?.data) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Activity}
          title="Không thể tải dữ liệu"
          description="Đã xảy ra lỗi khi lấy số liệu thống kê cộng đồng. Vui lòng thử lại sau."
        />
      </div>
    );
  }

  const { summary, trend, topPosts } = response.data;

  // Format date string YYYY-MM-DD to DD/MM
  const chartData = trend.map((point) => {
    const parts = point.date.split('-');
    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : point.date;
    return {
      ...point,
      formattedDate,
    };
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Thống kê hoạt động</h2>
          <p className="text-sm text-muted-foreground">
            Phân tích chuyên sâu về sự phát triển và mức độ tương tác của cộng đồng
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-muted/30 p-1 border border-border/40 w-fit">
          {[
            { label: '7 ngày', value: 7 },
            { label: '30 ngày', value: 30 },
            { label: '90 ngày', value: 90 },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setDays(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                days === tab.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Members */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Thành viên mới</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Users className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {summary.totalMembers}
            </span>
            <span className="text-xs text-muted-foreground">tổng số</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Trong kỳ:{' '}
            <span className="font-semibold text-emerald-500">
              +{trend.reduce((sum, p) => sum + p.newMembers, 0)}
            </span>{' '}
            mới |{' '}
            <span className="font-semibold text-rose-500">
              -{trend.reduce((sum, p) => sum + p.leftMembers, 0)}
            </span>{' '}
            rời
          </p>
        </div>

        {/* Card 2: Interactivity (Posts + Comments) */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Nội dung mới</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <FileText className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {trend.reduce((sum, p) => sum + p.posts, 0)}
            </span>
            <span className="text-xs text-muted-foreground">bài viết kỳ này</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Kèm theo <span className="font-semibold text-indigo-500">{summary.totalComments}</span>{' '}
            bình luận mới
          </p>
        </div>

        {/* Card 3: Messages */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Tin nhắn trao đổi</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <MessageSquare className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {summary.totalMessages}
            </span>
            <span className="text-xs text-muted-foreground">tin nhắn gửi đi</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Trên phòng chat liên kết trong {days} ngày qua
          </p>
        </div>

        {/* Card 4: Interactions Score */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Điểm tương tác ròng</span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Activity className="size-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {summary.activeInteractionsCount}
            </span>
            <span className="text-xs text-muted-foreground">lượt tương tác</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tổng post + cmt + tin nhắn phát sinh trong kỳ
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Member Growth */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Tăng trưởng thành viên</h3>
            <p className="text-xs text-muted-foreground">
              Xu hướng gia tăng và rời nhóm của thành viên
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLeft" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="formattedDate"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#ffffff',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                <Area
                  name="Gia nhập mới"
                  type="monotone"
                  dataKey="newMembers"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNew)"
                />
                <Area
                  name="Rời/Bị chặn"
                  type="monotone"
                  dataKey="leftMembers"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLeft)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Interactive Trends */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Hoạt động & Tương tác</h3>
            <p className="text-xs text-muted-foreground">
              Tần suất hoạt động trên bảng tin và phòng chat nhóm
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="formattedDate"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#ffffff',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                <Line
                  name="Bài viết"
                  type="monotone"
                  dataKey="posts"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  name="Bình luận"
                  type="monotone"
                  dataKey="comments"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  name="Tin nhắn"
                  type="monotone"
                  dataKey="messages"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 Content Section */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Award className="size-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Top 5 bài viết tương tác nhiều nhất
            </h3>
            <p className="text-xs text-muted-foreground">
              Bài viết sôi nổi nhất xếp hạng theo điểm Reaction + Comments × 2
            </p>
          </div>
        </div>

        {topPosts.length === 0 ? (
          <EmptyState
            icon={Award}
            title="Chưa có dữ liệu"
            description="Cộng đồng chưa có bài viết nào được đăng tải để xếp hạng."
          />
        ) : (
          <div className="flex flex-col divide-y divide-border/40">
            {topPosts.map((post, idx) => {
              const reactionsCount = Object.values(post.reactionsCount ?? {}).reduce(
                (a, b) => a + b,
                0,
              );
              const engagementScore = reactionsCount + (post.commentsCount ?? 0) * 2;
              return (
                <div
                  key={post.postId}
                  className="flex items-start justify-between py-4 first:pt-0 last:pb-0 gap-4 transition-all hover:bg-muted/10 px-2 rounded-xl"
                >
                  <div className="flex gap-4">
                    {/* Rank Badge */}
                    <div
                      className={`flex size-9 items-center justify-center rounded-xl font-bold text-sm shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                          : idx === 1
                            ? 'bg-zinc-400/20 text-zinc-400 border border-zinc-400/30'
                            : idx === 2
                              ? 'bg-amber-700/20 text-amber-700 border border-amber-700/30'
                              : 'bg-muted text-muted-foreground border border-border/50'
                      }`}
                    >
                      #{idx + 1}
                    </div>

                    {/* Content Details */}
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-foreground text-sm line-clamp-1 hover:text-primary cursor-pointer transition-colors">
                        {getCleanPostContent(post.content) || 'Bài viết chứa hình ảnh/video'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {post.author?.displayName || 'Thành viên ẩn danh'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Engagement Metrics */}
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="size-3.5" />
                          {reactionsCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="size-3.5" />
                          {post.commentsCount ?? 0}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Điểm: <span className="font-bold text-primary">{engagementScore}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
