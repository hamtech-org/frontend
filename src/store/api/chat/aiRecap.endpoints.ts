import type { ChatEndpointBuilder } from '@/store/api/chat/endpointBuilder';
import type { ApiSuccessResponse } from '@/types/api.types';

export function buildAiRecapEndpoints(builder: ChatEndpointBuilder) {
  return {
    getLatestAIRecap: builder.query<ApiSuccessResponse<any>, string>({
      query: (groupId) => `/chat/groups/${groupId}/ai-recap/latest`,
    }),
    generateAIRecap: builder.mutation<ApiSuccessResponse<any>, string>({
      query: (groupId) => ({
        url: `/chat/groups/${groupId}/ai-recap`,
        method: 'POST',
      }),
    }),
  };
}
