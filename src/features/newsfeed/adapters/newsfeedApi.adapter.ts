import type { ApiSuccessResponse } from '@/types/api.types';
import type { IFeedPage } from '@/types/newsfeed.types';

export const toFeedPage = (response: ApiSuccessResponse<IFeedPage>): IFeedPage => ({
  items: Array.isArray(response?.data?.items) ? response.data.items : [],
  nextCursor: response?.data?.nextCursor ?? null,
  hasMore: Boolean(response?.data?.hasMore),
});
