import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetAiAdminDashboardQuery, useUpdateAiAdminConfigMutation } from '@/store/api/adminApi';
import type {
  AiAdminConfig,
  AiTextProvider,
  AiUsageInterval,
  AiUsageRange,
  UpdateAiAdminConfigBody,
} from '@/types/adminAi.types';
import { cn } from '@/utils/cn';
import { Activity, Bot, KeyRound, Loader2, Save, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { toast } from 'react-toastify';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DraftConfig = UpdateAiAdminConfigBody & {
  bedrockAccessKeyId: string;
  bedrockSecretAccessKey: string;
  openAiApiKey: string;
  qdrantApiKey: string;
};

const emptyDraft: DraftConfig = {
  provider: 'bedrock',
  maxTokens: 1024,
  temperature: 0.2,
  topP: 0.9,
  bedrockRegion: 'us-east-1',
  bedrockModelId: 'amazon.nova-pro-v1:0',
  bedrockSecondaryModelId: '',
  bedrockAccessKeyId: '',
  bedrockSecretAccessKey: '',
  openAiModelId: 'gpt-4o-mini',
  openAiBaseUrl: 'https://api.openai.com/v1',
  openAiApiKey: '',
  bedrockEmbeddingModelId: 'amazon.titan-embed-text-v2:0',
  embeddingDimension: 1024,
  qdrantUrl: '',
  qdrantApiKey: '',
  qdrantCollection: 'hamtech_ai_memories',
};

const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#64748b'];

const AI_USAGE_RANGES: Array<{
  value: AiUsageRange;
  label: string;
  interval: AiUsageInterval;
}> = [
  { value: 'day', label: 'Ngày', interval: 'hour' },
  { value: 'week', label: 'Tuần', interval: 'day' },
  { value: 'month', label: 'Tháng', interval: 'day' },
];

type CountChartRow = {
  name: string;
  requests: number;
  tokens?: number;
  errors?: number;
};

function toDraft(config?: AiAdminConfig): DraftConfig {
  if (!config) return emptyDraft;
  return {
    provider: config.provider,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    topP: config.topP,
    bedrockRegion: config.bedrockRegion,
    bedrockModelId: config.bedrockModelId,
    bedrockSecondaryModelId: config.bedrockSecondaryModelId ?? '',
    bedrockAccessKeyId: '',
    bedrockSecretAccessKey: '',
    openAiModelId: config.openAiModelId,
    openAiBaseUrl: config.openAiBaseUrl,
    openAiApiKey: '',
    bedrockEmbeddingModelId: config.bedrockEmbeddingModelId,
    embeddingDimension: config.embeddingDimension,
    qdrantUrl: config.qdrantUrl,
    qdrantApiKey: '',
    qdrantCollection: config.qdrantCollection,
  };
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

function ChartFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('h-[260px] w-full min-h-0 min-w-0', className)}>{children}</div>;
}

function formatTimelineLabel(iso: string, interval: AiUsageInterval): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (interval === 'hour') {
    return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  if (interval === 'week') {
    return `Tuần ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
  }
  if (interval === 'month') {
    return d.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
  }
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value ?? ''}
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl text-sm"
      />
    </div>
  );
}

export default function AdminAiPage() {
  const [usageRange, setUsageRange] = useState<AiUsageRange>('day');
  const usageInterval = useMemo(
    () => AI_USAGE_RANGES.find((item) => item.value === usageRange)?.interval ?? 'hour',
    [usageRange],
  );
  const { data, isLoading, isFetching, isError } = useGetAiAdminDashboardQuery({
    range: usageRange,
    interval: usageInterval,
  });
  const [updateConfig, updateState] = useUpdateAiAdminConfigMutation();
  const config = data?.data.config;
  const usage = data?.data.usage;
  const audits = data?.data.audits ?? [];
  const [draft, setDraft] = useState<DraftConfig>(emptyDraft);
  const usageRangeLabel =
    AI_USAGE_RANGES.find((item) => item.value === usageRange)?.label.toLowerCase() ?? 'ngày';

  useEffect(() => {
    if (config) setDraft(toDraft(config));
  }, [config]);

  const providerLabel = useMemo(() => {
    if (!config) return '-';
    return config.provider === 'openai' ? 'OpenAI compatible' : 'AWS Bedrock';
  }, [config]);

  const providerChartData = useMemo(
    () =>
      Object.entries(usage?.byProvider ?? {})
        .map(([name, requests]) => ({ name, requests }))
        .filter((row) => row.requests > 0),
    [usage?.byProvider],
  );

  const statusChartData = useMemo(
    () =>
      [
        { name: 'Thành công', requests: usage?.successRequests ?? 0 },
        { name: 'Lỗi', requests: usage?.failedRequests ?? 0 },
      ].filter((row) => row.requests > 0),
    [usage?.failedRequests, usage?.successRequests],
  );

  const timelineChartData = useMemo(() => {
    const interval = usage?.meta?.interval ?? usageInterval;
    if (usage?.timeline?.length) {
      return usage.timeline.map((row) => ({
        time: formatTimelineLabel(row.t, interval),
        requests: row.requests,
        tokens: row.tokens,
        latencyMs: row.averageLatencyMs,
      }));
    }
    return [...(usage?.recent ?? [])]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((row) => ({
        time: formatTimelineLabel(row.createdAt, interval),
        requests: 1,
        tokens: row.tokensUsed,
        latencyMs: row.latencyMs,
      }));
  }, [usage?.meta?.interval, usage?.recent, usage?.timeline, usageInterval]);

  const stageChartData = useMemo(() => {
    const map = new Map<string, CountChartRow>();
    for (const row of usage?.recent ?? []) {
      const name = row.stage || row.feature || 'unknown';
      const current = map.get(name) ?? { name, requests: 0, tokens: 0, errors: 0 };
      current.requests += 1;
      current.tokens = (current.tokens ?? 0) + row.tokensUsed;
      current.errors = (current.errors ?? 0) + (row.success ? 0 : 1);
      map.set(name, current);
    }
    return [...map.values()].sort((a, b) => b.requests - a.requests).slice(0, 8);
  }, [usage?.recent]);

  const modelChartData = useMemo(() => {
    const map = new Map<string, CountChartRow>();
    for (const row of usage?.recent ?? []) {
      const name = row.modelId || 'unknown';
      const current = map.get(name) ?? { name, requests: 0, tokens: 0, errors: 0 };
      current.requests += 1;
      current.tokens = (current.tokens ?? 0) + row.tokensUsed;
      current.errors = (current.errors ?? 0) + (row.success ? 0 : 1);
      map.set(name, current);
    }
    return [...map.values()].sort((a, b) => b.requests - a.requests).slice(0, 8);
  }, [usage?.recent]);

  const patch = (next: Partial<DraftConfig>) => setDraft((prev) => ({ ...prev, ...next }));

  const handleSave = async () => {
    const body: UpdateAiAdminConfigBody = {
      ...draft,
      maxTokens: Number(draft.maxTokens),
      temperature: Number(draft.temperature),
      topP: Number(draft.topP),
      embeddingDimension: Number(draft.embeddingDimension),
      ...(draft.bedrockAccessKeyId?.trim()
        ? { bedrockAccessKeyId: draft.bedrockAccessKeyId.trim() }
        : {}),
      ...(draft.bedrockSecretAccessKey?.trim()
        ? { bedrockSecretAccessKey: draft.bedrockSecretAccessKey.trim() }
        : {}),
      ...(draft.openAiApiKey?.trim() ? { openAiApiKey: draft.openAiApiKey.trim() } : {}),
      ...(draft.qdrantApiKey?.trim() ? { qdrantApiKey: draft.qdrantApiKey.trim() } : {}),
    };
    if (!draft.bedrockAccessKeyId?.trim()) delete body.bedrockAccessKeyId;
    if (!draft.bedrockSecretAccessKey?.trim()) delete body.bedrockSecretAccessKey;
    if (!draft.openAiApiKey?.trim()) delete body.openAiApiKey;
    if (!draft.qdrantApiKey?.trim()) delete body.qdrantApiKey;
    try {
      await updateConfig(body).unwrap();
      toast.success('Đã lưu cấu hình AI');
      patch({
        bedrockAccessKeyId: '',
        bedrockSecretAccessKey: '',
        openAiApiKey: '',
        qdrantApiKey: '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không lưu được cấu hình AI');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Đang tải cấu hình AI...
      </div>
    );
  }

  if (isError || !config || !usage) {
    return <p className="py-8 text-sm text-destructive">Không tải được dữ liệu quản trị AI.</p>;
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-600/10 p-3 text-indigo-600">
            <Bot className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-extrabold tracking-tight">
              Quản lý và Cấu Hình AI
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Theo dõi sử dụng AI và cấu hình provider/model đang active.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Khoảng</span>
          <Select
            value={usageRange}
            onValueChange={(value) => setUsageRange(value as AiUsageRange)}
          >
            <SelectTrigger className="h-9 w-[120px] rounded-xl" aria-label="Khoảng báo cáo AI">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_USAGE_RANGES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="rounded-xl px-3 py-1">
            {providerLabel}
          </Badge>
          {isFetching ? (
            <Badge variant="secondary" className="rounded-xl px-3 py-1">
              Đang đồng bộ
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Requests"
          value={usage.totalRequests.toLocaleString('vi-VN')}
          hint={`Theo ${usageRangeLabel}`}
        />
        <KpiCard
          label="Tokens"
          value={usage.totalTokens.toLocaleString('vi-VN')}
          hint={`Theo ${usageRangeLabel}`}
        />
        <KpiCard label="Lỗi" value={usage.failedRequests.toLocaleString('vi-VN')} />
        <KpiCard label="Latency TB" value={`${usage.averageLatencyMs}ms`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-card min-w-0 border-none shadow-lg">
          <CardHeader>
            <CardTitle>Request theo provider</CardTitle>
            <CardDescription>Phân bổ lượt gọi AI theo provider đang được log.</CardDescription>
          </CardHeader>
          <CardContent>
            {providerChartData.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">Chưa có dữ liệu provider.</p>
            ) : (
              <ChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={providerChartData}
                      dataKey="requests"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={86}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {providerChartData.map((row, i) => (
                        <Cell key={row.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card min-w-0 border-none shadow-lg">
          <CardHeader>
            <CardTitle>Tỷ lệ thành công</CardTitle>
            <CardDescription>So sánh request thành công và request lỗi.</CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">
                Chưa có request nào trong khoảng này.
              </p>
            ) : (
              <ChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="requests"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={86}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {statusChartData.map((row, i) => (
                        <Cell key={row.name} fill={i === 0 ? '#059669' : '#dc2626'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card min-w-0 border-none shadow-lg xl:col-span-2">
          <CardHeader>
            <CardTitle>Requests, tokens và latency</CardTitle>
            <CardDescription>
              Gom theo {usage.meta?.interval ?? usageInterval} trong khoảng {usageRangeLabel}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timelineChartData.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">Chưa có log trong khoảng này.</p>
            ) : (
              <ChartFrame className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timelineChartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis yAxisId="tokens" tick={{ fontSize: 11 }} width={44} />
                    <YAxis
                      yAxisId="latency"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      width={54}
                    />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Legend />
                    <Line
                      yAxisId="tokens"
                      type="monotone"
                      dataKey="requests"
                      name="Requests"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="tokens"
                      type="monotone"
                      dataKey="tokens"
                      name="Tokens"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="latency"
                      type="monotone"
                      dataKey="latencyMs"
                      name="Latency ms"
                      stroke="#d97706"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card min-w-0 border-none shadow-lg">
          <CardHeader>
            <CardTitle>Request theo stage</CardTitle>
            <CardDescription>Nhóm theo stage/feature trong usage log gần đây.</CardDescription>
          </CardHeader>
          <CardContent>
            {stageChartData.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">Chưa có dữ liệu stage.</p>
            ) : (
              <ChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={48} />
                    <YAxis tick={{ fontSize: 11 }} width={36} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Legend />
                    <Bar dataKey="requests" name="Requests" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="errors" name="Lỗi" fill="#dc2626" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card min-w-0 border-none shadow-lg">
          <CardHeader>
            <CardTitle>Request theo model</CardTitle>
            <CardDescription>Top model được gọi trong usage log gần đây.</CardDescription>
          </CardHeader>
          <CardContent>
            {modelChartData.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">Chưa có dữ liệu model.</p>
            ) : (
              <ChartFrame>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={modelChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/50"
                      horizontal={false}
                    />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="requests" name="Requests" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="glass-card border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="size-5 text-indigo-600" />
              <CardTitle>Cấu hình runtime</CardTitle>
            </div>
            <CardDescription>
              Chọn provider nào thì chỉ hiển thị cấu hình của provider đó. Qdrant dùng chung cho cả
              hai.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Provider</Label>
                <Select
                  value={draft.provider}
                  onValueChange={(value) => patch({ provider: value as AiTextProvider })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bedrock">Bedrock</SelectItem>
                    <SelectItem value="openai">OpenAI compatible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <TextField
                label="AI_MAX_TOKENS"
                type="number"
                value={draft.maxTokens}
                onChange={(v) => patch({ maxTokens: Number(v) })}
              />
              <TextField
                label="AI_TEMPERATURE"
                type="number"
                value={draft.temperature}
                onChange={(v) => patch({ temperature: Number(v) })}
              />
              <TextField
                label="AI_TOP_P"
                type="number"
                value={draft.topP}
                onChange={(v) => patch({ topP: Number(v) })}
              />
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {draft.provider === 'bedrock' ? 'AWS Bedrock' : 'OpenAI compatible'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chỉ cấu hình model text/chat của provider đang chọn.
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-lg">
                  {draft.provider}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {draft.provider === 'bedrock' ? (
                  <>
                    <TextField
                      label="BEDROCK_REGION"
                      value={draft.bedrockRegion}
                      onChange={(v) => patch({ bedrockRegion: v })}
                    />
                    <TextField
                      label="BEDROCK_MODEL_ID"
                      value={draft.bedrockModelId}
                      onChange={(v) => patch({ bedrockModelId: v })}
                    />
                    <TextField
                      label="BEDROCK_SECONDARY_MODEL_ID"
                      value={draft.bedrockSecondaryModelId}
                      onChange={(v) => patch({ bedrockSecondaryModelId: v })}
                    />
                    <TextField
                      label={`BEDROCK_ACCESS_KEY_ID ${config.bedrockAccessKeyConfigured ? '(đã cấu hình)' : ''}`}
                      type="password"
                      value={draft.bedrockAccessKeyId}
                      placeholder=""
                      onChange={(v) => patch({ bedrockAccessKeyId: v })}
                    />
                    <TextField
                      label={`BEDROCK_SECRET_ACCESS_KEY ${config.bedrockSecretKeyConfigured ? '(đã cấu hình)' : ''}`}
                      type="password"
                      value={draft.bedrockSecretAccessKey}
                      placeholder=""
                      onChange={(v) => patch({ bedrockSecretAccessKey: v })}
                    />
                  </>
                ) : (
                  <>
                    <TextField
                      label="OPENAI_MODEL_ID"
                      value={draft.openAiModelId}
                      onChange={(v) => patch({ openAiModelId: v })}
                    />
                    <TextField
                      label="OPENAI_BASE_URL"
                      value={draft.openAiBaseUrl}
                      onChange={(v) => patch({ openAiBaseUrl: v })}
                    />
                    <TextField
                      label={`OPENAI_API_KEY ${config.openAiApiKeyConfigured ? '(đã cấu hình)' : ''}`}
                      type="password"
                      value={draft.openAiApiKey}
                      placeholder=""
                      onChange={(v) => patch({ openAiApiKey: v })}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground">Memory và Qdrant</p>
                <p className="text-xs text-muted-foreground">
                  Dùng chung cho cả Bedrock và OpenAI. Embedding hiện dùng Bedrock.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="BEDROCK_EMBEDDING_MODEL_ID"
                  value={draft.bedrockEmbeddingModelId}
                  onChange={(v) => patch({ bedrockEmbeddingModelId: v })}
                />
                <TextField
                  label="AI_EMBEDDING_DIMENSION"
                  type="number"
                  value={draft.embeddingDimension}
                  onChange={(v) => patch({ embeddingDimension: Number(v) })}
                />
                <TextField
                  label="QDRANT_URL"
                  value={draft.qdrantUrl}
                  onChange={(v) => patch({ qdrantUrl: v })}
                />
                <TextField
                  label={`QDRANT_API_KEY ${config.qdrantApiKeyConfigured ? '(đã cấu hình)' : ''}`}
                  type="password"
                  value={draft.qdrantApiKey}
                  placeholder=""
                  onChange={(v) => patch({ qdrantApiKey: v })}
                />
                <TextField
                  label="QDRANT_COLLECTION"
                  value={draft.qdrantCollection}
                  onChange={(v) => patch({ qdrantCollection: v })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Áp dụng cấu hình AI</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Secret để trống sẽ giữ nguyên giá trị đã lưu trước đó.
                </p>
              </div>
              <Button
                onClick={() => void handleSave()}
                disabled={updateState.isLoading}
                className="h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[160px]"
              >
                {updateState.isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Lưu cấu hình
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-emerald-600" />
                <CardTitle>Usage gần đây</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {usage.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có log sử dụng trong khoảng này.
                </p>
              ) : (
                usage.recent.slice(0, 8).map((row) => (
                  <div key={row.usageId} className="rounded-xl border border-border/60 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{row.modelId}</span>
                      <Badge variant={row.success ? 'secondary' : 'destructive'}>
                        {row.success ? 'OK' : 'Lỗi'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.provider} · {row.tokensUsed} tokens · {row.latencyMs}ms
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="size-5 text-amber-600" />
                <CardTitle>Audit cấu hình</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {audits.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có lịch sử thay đổi.</p>
              ) : (
                audits.slice(0, 6).map((audit) => (
                  <div
                    key={audit.auditId}
                    className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm"
                  >
                    <p className="font-medium">
                      {new Date(audit.createdAt).toLocaleString('vi-VN')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Object.keys(audit.changes).join(', ')}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
