import type { ApiSuccessResponse } from '@/types/api.types';

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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
  const token = localStorage.getItem('accessToken');
  const qs = threadId ? `?threadId=${encodeURIComponent(threadId)}` : '';
  const res = await fetch(`${baseUrl}/ai/assistant/thread${qs}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = (await res.json()) as ApiSuccessResponse<{
    threadId: string;
    messages: AiAssistantThreadMessage[];
  }> & { success?: boolean; error?: { message?: string } };
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  }
  return json.data;
}
