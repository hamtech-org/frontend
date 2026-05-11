export type AdminAnalyticsInterval = 'hour' | 'day' | 'week' | 'month';

export interface ITimeSeriesPoint {
  t: string;
  count: number;
}

export interface IHourlyPoint {
  t: string;
  hour: number;
  count: number;
}

export interface IGroupChatMetricRow {
  conversationId: string;
  messageCount: number;
  name: string | null;
}

export interface INamedValue {
  name: string;
  value: number;
}

export interface IAdminAnalyticsDashboard {
  meta: {
    from: string;
    to: string;
    interval: AdminAnalyticsInterval;
    source: 'elasticsearch' | 'unavailable';
  };
  kpi: {
    totalMessages: number;
    totalPosts: number;
    groupConversationsWithMessages: number;
    peakHourUtc: string | null;
  };
  messagesByInterval: ITimeSeriesPoint[];
  messagesByHour: IHourlyPoint[];
  groupChatTop: IGroupChatMetricRow[];
  postsByInterval: ITimeSeriesPoint[];
  postsByType: INamedValue[];
}

export interface AdminAnalyticsDashboardParams {
  from?: string;
  to?: string;
  interval?: AdminAnalyticsInterval;
}
