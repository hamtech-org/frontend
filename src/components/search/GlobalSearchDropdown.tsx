import React from 'react';
import { FileText, Loader, User, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/cn';
import type { ISearchAllResult } from '@/types/search.types';

interface GlobalSearchDropdownProps {
  isOpen: boolean;
  query: string;
  isLoading: boolean;
  isDarkMode: boolean;
  results: ISearchAllResult | null;
  onNavigateToSearch: (type: 'all' | 'users' | 'groups' | 'posts') => void;
  onOpenUserProfile: (userId: string) => void;
  onOpenGroup: (groupId: string) => void;
  onOpenPost: (postId: string) => void;
}

const GlobalSearchDropdown: React.FC<GlobalSearchDropdownProps> = ({
  isOpen,
  query,
  isLoading,
  isDarkMode,
  results,
  onNavigateToSearch,
  onOpenUserProfile,
  onOpenGroup,
  onOpenPost,
}) => (
  <AnimatePresence>
    {isOpen && query && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'absolute top-full left-0 right-0 mt-2 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto',
          isDarkMode ? 'bg-midnight-bg border border-midnight-border' : 'bg-white border border-gray-200',
        )}
      >
        <div className="p-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
          )}

          {!isLoading && results && (
            <>
              {results.users.items.length > 0 && (
                <div>
                  <button onClick={() => onNavigateToSearch('users')} className="w-full text-left">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                      <User className="w-3 h-3" />
                      Người dùng ({results.users.items.length})
                    </h3>
                  </button>
                  <div className="space-y-2">
                    {results.users.items.slice(0, 3).map((user) => (
                      <button
                        key={user.userId}
                        onClick={() => onOpenUserProfile(user.userId)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all text-left"
                      >
                        <img
                          src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.userId}`}
                          alt={user.displayName}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.displayName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.groups.items.length > 0 && (
                <div>
                  <button onClick={() => onNavigateToSearch('groups')} className="w-full text-left">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                      <Users className="w-3 h-3" />
                      Cộng đồng ({results.groups.items.length})
                    </h3>
                  </button>
                  <div className="space-y-2">
                    {results.groups.items.slice(0, 3).map((group) => (
                      <button
                        key={group.groupId}
                        onClick={() => onOpenGroup(group.groupId)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-emerald-600 to-teal-600 shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          {group.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{group.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{group.memberCount.toLocaleString()} thành viên</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.posts.items.length > 0 && (
                <div>
                  <button onClick={() => onNavigateToSearch('posts')} className="w-full text-left">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                      <FileText className="w-3 h-3" />
                      Bài viết ({results.posts.items.length})
                    </h3>
                  </button>
                  <div className="space-y-2">
                    {results.posts.items.slice(0, 3).map((post) => (
                      <button
                        key={post.postId}
                        onClick={() => onOpenPost(post.postId)}
                        className="w-full p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all text-left"
                      >
                        <p className="text-sm font-medium line-clamp-1">{post.content.substring(0, 50)}...</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!results.users.items.length && !results.groups.items.length && !results.posts.items.length && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Không tìm thấy kết quả cho "{query}"</p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-4 pb-4">
          <button
            onClick={() => onNavigateToSearch('all')}
            className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Xem tất cả kết quả
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default GlobalSearchDropdown;
