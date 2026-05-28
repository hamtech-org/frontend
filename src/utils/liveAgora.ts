import { apiClient } from '@/services/api';
import type { ApiSuccessResponse } from '@/types/api.types';

export interface LiveRtcTokenPayload {
  token: string;
  uid: number;
  channel: string;
}

export async function fetchLiveRtcToken(
  channelName: string,
  role: 'publisher' | 'subscriber',
): Promise<LiveRtcTokenPayload> {
  const res = await apiClient.get<ApiSuccessResponse<LiveRtcTokenPayload>>('/agora/rtc-token', {
    params: { channelName, role },
  });
  return res.data.data;
}
