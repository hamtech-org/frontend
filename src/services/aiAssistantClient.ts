import type { ApiSuccessResponse } from '@/types/api.types';
import { apiClient } from '@/services/api';

export type AiAssistantThreadMessage = {
  messageId: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  actions?: Array<{
    type: string;
    payload?: Record<string, unknown>;
  }>;
};

export async function fetchAiAssistantThread(threadId?: string): Promise<{
  threadId: string;
  messages: AiAssistantThreadMessage[];
}> {
  const res = await apiClient.get<
    ApiSuccessResponse<{
      threadId: string;
      messages: AiAssistantThreadMessage[];
    }>
  >('/ai/assistant/thread', {
    params: threadId ? { threadId } : undefined,
  });
  const json = res.data;
  return json.data;
}
