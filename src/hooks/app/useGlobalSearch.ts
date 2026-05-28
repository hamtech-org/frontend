import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { searchService } from '@/services/search.service';
import type { ISearchAllResult } from '@/types/search.types';

interface UseGlobalSearchParams {
  query: string;
  currentUserId?: string;
}

interface UseGlobalSearchResult {
  isLoading: boolean;
  results: ISearchAllResult | null;
}

export const useGlobalSearch = ({ query, currentUserId }: UseGlobalSearchParams): UseGlobalSearchResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ISearchAllResult | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const normalizedQuery = debouncedQuery.trim();

    if (!normalizedQuery) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    if (!currentUserId) {
      setResults(null);
      return;
    }

    let isCancelled = false;

    const runSearch = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const rawResults = (await searchService.searchAll({ q: normalizedQuery })) as ISearchAllResult;
        const filteredUsers = rawResults.users.items.filter((user) => user.userId !== currentUserId);
        const filteredResults: ISearchAllResult = {
          ...rawResults,
          users: {
            ...rawResults.users,
            items: filteredUsers,
          },
        };

        if (!isCancelled) {
          setResults(filteredResults);
        }
      } catch (_error) {
        if (!isCancelled) {
          setResults(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void runSearch();

    return () => {
      isCancelled = true;
    };
  }, [currentUserId, debouncedQuery]);

  return { isLoading, results };
};
