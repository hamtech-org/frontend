import { apiClient } from './api';
import type {
  ISearchResult,
  ISearchUserResult,
  ISearchGroupResult,
  ISearchPostResult,
  ISearchMessageResult,
  ISearchAllResult,
  ISearchAllChatResult,
} from '@/types/search.types';

interface SearchParams {
  q: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const searchService = {
  /**
   * Search users by name or email
   * GET /search/users?q=...
   */
  searchUsers: async (params: SearchParams) => {
    const response = await apiClient.get<any, any>(
      '/search/users',
      { params: { q: params.q, page: params.page, pageSize: params.pageSize } }
    );
    return response.data?.data || response.data;
  },

  /**
   * Search groups by name or description
   * GET /search/groups?q=...
   */
  searchGroups: async (params: SearchParams) => {
    const response = await apiClient.get<any, any>(
      '/search/groups',
      { params: { q: params.q, page: params.page, pageSize: params.pageSize } }
    );
    return response.data?.data || response.data;
  },

  /**
   * Search posts by content
   * GET /search/posts?q=...
   */
  searchPosts: async (params: SearchParams) => {
    const response = await apiClient.get<any, any>(
      '/search/posts',
      { params: { q: params.q, page: params.page, pageSize: params.pageSize } }
    );
    return response.data?.data || response.data;
  },

  /**
   * Search messages by content
   * GET /search/messages?q=...
   */
  searchMessages: async (params: SearchParams) => {
    const response = await apiClient.get<any, any>(
      '/search/messages',
      { params: { q: params.q, page: params.page, pageSize: params.pageSize } }
    );
    return response.data?.data || response.data;
  },

  /**
   * Search everything (users + groups + posts)
   * Returns limited results from each entity (5 per type)
   * GET /search/all?q=...
   */
  searchAll: async (params: SearchParams) => {
    const response = await apiClient.get<any, any>(
      '/search/all',
      { params: { q: params.q } }
    );
    return response.data?.data || response.data;
  },

  /**
   * Search for chat (users + groups + messages)
   * Returns limited results from each entity (5 per type)
   * GET /search/all-chat?q=...
   */
  searchAllChat: async (params: SearchParams) => {
    const response = await apiClient.get<any, any>(
      '/search/all-chat',
      { params: { q: params.q } }
    );
    return response.data?.data || response.data;
  },
};
