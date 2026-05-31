import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlobalSearchDropdown from '@/components/search/GlobalSearchDropdown';
import { useGlobalSearch } from '@/hooks/app/useGlobalSearch';

interface GlobalSearchBoxProps {
  isDarkMode: boolean;
  currentUserId?: string;
  autoFocusInput?: boolean;
  disableOutsideBackdrop?: boolean;
}

const GlobalSearchBox: React.FC<GlobalSearchBoxProps> = ({
  isDarkMode,
  currentUserId,
  autoFocusInput = false,
  disableOutsideBackdrop = false,
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { isLoading, results } = useGlobalSearch({
    query,
    currentUserId,
  });

  const closeSearch = (): void => {
    setIsOpen(false);
  };

  const clearAndCloseSearch = (): void => {
    setQuery('');
    setIsOpen(false);
  };

  const navigateToSearchResult = (type: 'all' | 'users' | 'groups' | 'posts'): void => {
    navigate(`/search?q=${encodeURIComponent(query)}&type=${type}`);
    clearAndCloseSearch();
  };

  useEffect(() => {
    if (!autoFocusInput) {
      return;
    }

    inputRef.current?.focus();
    setIsOpen(true);
  }, [autoFocusInput]);

  return (
    <div className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Tìm kiếm người dùng, nội dung, cộng đồng..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && query.trim()) {
            navigateToSearchResult('all');
          }
        }}
        className="w-full pl-12 pr-4 py-2.5 rounded-full bg-black/5 dark:bg-white/5 border-none focus:ring-2 ring-blue-600/20 transition-all outline-none"
      />

      <GlobalSearchDropdown
        isOpen={isOpen}
        query={query}
        isLoading={isLoading}
        isDarkMode={isDarkMode}
        results={results}
        onNavigateToSearch={navigateToSearchResult}
        onOpenUserProfile={(userId) => {
          navigate(`/profile/${userId}`);
          clearAndCloseSearch();
        }}
        onOpenGroup={(groupId) => {
          navigate(`/communities/${encodeURIComponent(groupId)}`);
          clearAndCloseSearch();
        }}
        onOpenPost={(_postId) => {
          navigate('/');
          clearAndCloseSearch();
        }}
      />

      {isOpen && !disableOutsideBackdrop && (
        <div className="fixed inset-0 z-40" onClick={closeSearch} />
      )}
    </div>
  );
};

export default GlobalSearchBox;
