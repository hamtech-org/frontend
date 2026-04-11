import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, User, Users, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all';
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'groups' | 'posts'>(type as any || 'all');

  // Mock data - replace with API calls
  const mockUsers = Array.from({ length: 12 }, (_, i) => ({
    id: `user-${i}`,
    name: `Người dùng ${i + 1}`,
    username: `@user${i + 1}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`,
    bio: 'Mô tả cá nhân của tôi',
    followers: Math.floor(Math.random() * 10000),
  }));

  const mockGroups = Array.from({ length: 12 }, (_, i) => ({
    id: `group-${i}`,
    name: `Cộng đồng ${i + 1}`,
    avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=group${i}`,
    members: Math.floor(Math.random() * 5000) + 100,
    description: 'Mô tả cộng đồng',
    isJoined: Math.random() > 0.5,
  }));

  const mockPosts = Array.from({ length: 12 }, (_, i) => ({
    id: `post-${i}`,
    title: `Bài viết thú vị ${i + 1}`,
    content: `Đây là nội dung bài viết về chủ đề "${query}". Bài viết này có ${Math.floor(Math.random() * 1000)} lượt yêu thích.`,
    author: `Tác giả ${i + 1}`,
    timestamp: `${Math.floor(Math.random() * 24)} giờ trước`,
    likes: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 100),
  }));

  const filteredUsers = activeTab === 'all' || activeTab === 'users' ? mockUsers : [];
  const filteredGroups = activeTab === 'all' || activeTab === 'groups' ? mockGroups : [];
  const filteredPosts = activeTab === 'all' || activeTab === 'posts' ? mockPosts : [];

  const tabs = [
    { id: 'all' as const, label: 'Tất cả', total: mockUsers.length + mockGroups.length + mockPosts.length },
    { id: 'users' as const, label: 'Người dùng', icon: User, total: mockUsers.length },
    { id: 'groups' as const, label: 'Cộng đồng', icon: Users, total: mockGroups.length },
    { id: 'posts' as const, label: 'Bài viết', icon: FileText, total: mockPosts.length },
  ];

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Quay lại</span>
          </button>

          <div className="flex items-center gap-4 mb-6">
            <Search className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">Kết quả tìm kiếm</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Tìm kiếm cho "<span className="font-semibold text-gray-900 dark:text-white">{query}</span>"
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2',
                activeTab === tab.id
                  ? 'bg-blue-600/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
              <span className={cn('ml-1 text-xs rounded-full px-2 py-0.5', activeTab === tab.id ? 'bg-blue-600/30' : 'bg-gray-200 dark:bg-gray-700')}>
                {tab.total}
              </span>
            </button>
          ))}
        </div>

        {/* Results Grid */}
        <div className="space-y-6">
          {/* Users Results */}
          {filteredUsers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Người dùng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    whileHover={{ y: -4 }}
                    className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-center">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-16 h-16 rounded-full mb-3 object-cover"
                      />
                      <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{user.username}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">{user.bio}</p>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {user.followers.toLocaleString()} theo dõi
                        </span>
                        <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors">
                          Theo dõi
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Groups Results */}
          {filteredGroups.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cộng đồng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredGroups.map((group) => (
                  <motion.div
                    key={group.id}
                    whileHover={{ y: -4 }}
                    className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-center">
                      <img
                        src={group.avatar}
                        alt={group.name}
                        className="w-16 h-16 rounded-lg mb-3 object-cover"
                      />
                      <h3 className="font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {group.members.toLocaleString()} thành viên
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">{group.description}</p>
                      <button
                        className={cn(
                          'px-3 py-1 text-xs rounded-lg transition-colors w-full',
                          group.isJoined
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        )}
                      >
                        {group.isJoined ? 'Đã tham gia' : 'Tham gia'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Posts Results */}
          {filteredPosts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bài viết</h2>
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    whileHover={{ x: 4 }}
                    className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{post.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{post.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {post.author} • {post.timestamp}
                      </span>
                      <div className="flex gap-4">
                        <span>❤️ {post.likes}</span>
                        <span>💬 {post.comments}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* No Results */}
          {filteredUsers.length === 0 && filteredGroups.length === 0 && filteredPosts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Search className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Không tìm thấy kết quả</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Không có kết quả nào cho "<span className="font-semibold">{query}</span>"
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
