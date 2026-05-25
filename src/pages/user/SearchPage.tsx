import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  User,
  Users,
  FileText,
  ArrowLeft,
  Loader,
  UserPlus,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { searchService } from '@/services/search.service';
import { useAuth } from '@/hooks/useAuth';
import {
  useSendFriendRequestMutation,
  useCancelFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
  useRemoveFriendMutation,
} from '@/store/api/userApi';
import type {
  ISearchUserResult,
  ISearchGroupResult,
  ISearchPostResult,
} from '@/types/search.types';
import defaultAvatarGroup from '@/assets/images/avatar-group-default.jpg';

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all';
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'groups' | 'posts'>(
    (type as 'all' | 'users' | 'groups' | 'posts') || 'all',
  );

  // Redux mutations
  const [sendFriendRequest] = useSendFriendRequestMutation();
  const [cancelFriendRequest] = useCancelFriendRequestMutation();
  const [acceptFriendRequest] = useAcceptFriendRequestMutation();
  const [rejectFriendRequest] = useRejectFriendRequestMutation();
  const [removeFriend] = useRemoveFriendMutation();

  // API state
  const [users, setUsers] = useState<ISearchUserResult[]>([]);
  const [groups, setGroups] = useState<ISearchGroupResult[]>([]);
  const [posts, setPosts] = useState<ISearchPostResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState<Record<string, boolean>>({});
  const [expandedPendingReceived, setExpandedPendingReceived] = useState<Record<string, boolean>>(
    {},
  );

  // Fetch data when query or tab changes
  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setGroups([]);
      setPosts([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        if (activeTab === 'all') {
          const result = await searchService.searchAll({ q: query });
          console.log('searchAll result:', result);

          console.log('Current user ID:', currentUser?.userId);

          // Filter out current user
          const filteredUsers =
            result?.users?.items?.filter(
              (user: ISearchUserResult) => user.userId !== currentUser?.userId,
            ) || [];
          setUsers(filteredUsers);
          setGroups(result?.groups?.items || []);
          setPosts(result?.posts?.items || []);
        } else if (activeTab === 'users') {
          const result = await searchService.searchUsers({ q: query });
          console.log('searchUsers result:', result);
          // Filter out current user
          const filteredUsers =
            result?.items?.filter(
              (user: ISearchUserResult) => user.userId !== currentUser?.userId,
            ) || [];
          setUsers(filteredUsers);
          setGroups([]);
          setPosts([]);
        } else if (activeTab === 'groups') {
          const result = await searchService.searchGroups({ q: query });
          console.log('searchGroups result:', result);
          setUsers([]);
          setGroups(result?.items || []);
          setPosts([]);
        } else if (activeTab === 'posts') {
          const result = await searchService.searchPosts({ q: query });
          console.log('searchPosts result:', result);
          setUsers([]);
          setGroups([]);
          setPosts(result?.items || []);
        }
      } catch (err) {
        console.error('Search error:', err);
        setError('Lỗi khi tìm kiếm. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, activeTab, currentUser?.userId]);

  const filteredUsers = activeTab === 'all' || activeTab === 'users' ? users : [];
  const filteredGroups = activeTab === 'all' || activeTab === 'groups' ? groups : [];
  const filteredPosts = activeTab === 'all' || activeTab === 'posts' ? posts : [];

  // Handle friend actions
  const handleSendFriendRequest = async (e: React.MouseEvent, friendId: string) => {
    e.stopPropagation();
    setFriendActionLoading((prev) => ({ ...prev, [friendId]: true }));
    try {
      await sendFriendRequest({ friendId }).unwrap();

      // Update user friendship status
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.userId === friendId ? { ...u, friendshipStatus: 'pending_sent', isFriend: false } : u,
        ),
      );
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      const message = err?.data?.error?.message || 'Lỗi khi gửi lời kết bạn';
      alert(message);
    } finally {
      setFriendActionLoading((prev) => ({ ...prev, [friendId]: false }));
    }
  };

  const handleCancelFriendRequest = async (e: React.MouseEvent, friendId: string) => {
    e.stopPropagation();
    setFriendActionLoading((prev) => ({ ...prev, [friendId]: true }));
    try {
      await cancelFriendRequest({ friendId }).unwrap();

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.userId === friendId ? { ...u, friendshipStatus: 'none', isFriend: false } : u,
        ),
      );
    } catch (err: any) {
      console.error('Error canceling friend request:', err);
      const message = err?.data?.error?.message || 'Lỗi khi hủy lời kết bạn';
      alert(message);
    } finally {
      setFriendActionLoading((prev) => ({ ...prev, [friendId]: false }));
    }
  };

  const handleAcceptFriendRequest = async (e: React.MouseEvent, senderId: string) => {
    e.stopPropagation();
    setFriendActionLoading((prev) => ({ ...prev, [senderId]: true }));
    try {
      await acceptFriendRequest({ senderId }).unwrap();

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.userId === senderId ? { ...u, friendshipStatus: 'friend', isFriend: true } : u,
        ),
      );
      setExpandedPendingReceived((prev) => ({ ...prev, [senderId]: false }));
    } catch (err: any) {
      console.error('Error accepting friend request:', err);
      const message = err?.data?.error?.message || 'Lỗi khi chấp nhận lời kết bạn';
      alert(message);
    } finally {
      setFriendActionLoading((prev) => ({ ...prev, [senderId]: false }));
    }
  };

  const handleRejectFriendRequest = async (e: React.MouseEvent, senderId: string) => {
    e.stopPropagation();
    setFriendActionLoading((prev) => ({ ...prev, [senderId]: true }));
    try {
      await rejectFriendRequest({ senderId }).unwrap();

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.userId === senderId ? { ...u, friendshipStatus: 'none', isFriend: false } : u,
        ),
      );
      setExpandedPendingReceived((prev) => ({ ...prev, [senderId]: false }));
    } catch (err: any) {
      console.error('Error rejecting friend request:', err);
      const message = err?.data?.error?.message || 'Lỗi khi từ chối lời kết bạn';
      alert(message);
    } finally {
      setFriendActionLoading((prev) => ({ ...prev, [senderId]: false }));
    }
  };

  const handleRemoveFriend = async (e: React.MouseEvent, friendId: string) => {
    e.stopPropagation();

    // Confirm before removing friend
    if (!window.confirm('Bạn có chắc chắn muốn hủy kết bạn với người này không?')) {
      return;
    }

    setFriendActionLoading((prev) => ({ ...prev, [friendId]: true }));
    try {
      await removeFriend({ friendId }).unwrap();

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.userId === friendId ? { ...u, friendshipStatus: 'none', isFriend: false } : u,
        ),
      );
    } catch (err: any) {
      console.error('Error removing friend:', err);
      const message = err?.data?.error?.message || 'Lỗi khi hủy kết bạn';
      alert(message);
    } finally {
      setFriendActionLoading((prev) => ({ ...prev, [friendId]: false }));
    }
  };

  // Helper to render friend status button
  const renderFriendButton = (user: ISearchUserResult) => {
    const status = user.friendshipStatus || 'none';
    const isLoading = friendActionLoading[user.userId];
    console.log(user);
    switch (status) {
      case 'friend':
        return (
          <button
            onClick={(e) => handleRemoveFriend(e, user.userId)}
            disabled={isLoading}
            className="w-full px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {isLoading ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <UserCheck className="w-3 h-3" />
                Bạn bè
              </>
            )}
          </button>
        );
      case 'pending_sent':
        return (
          <button
            onClick={(e) => handleCancelFriendRequest(e, user.userId)}
            disabled={isLoading}
            className="w-full px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white text-xs rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {isLoading ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <UserX className="w-3 h-3" />
                Hủy lời mời
              </>
            )}
          </button>
        );
      case 'pending_received':
        return (
          <div className="w-full space-y-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedPendingReceived((prev) => ({
                  ...prev,
                  [user.userId]: !prev[user.userId],
                }));
              }}
              className="w-full px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-all flex items-center justify-center gap-1"
            >
              <UserPlus className="w-3 h-3" />
              Lời mời kết bạn
            </button>
            {expandedPendingReceived[user.userId] && (
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAcceptFriendRequest(e, user.userId);
                  }}
                  disabled={isLoading}
                  className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader className="w-3 h-3 animate-spin" /> : 'Chấp nhận'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRejectFriendRequest(e, user.userId);
                  }}
                  disabled={isLoading}
                  className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader className="w-3 h-3 animate-spin" /> : 'Từ chối'}
                </button>
              </div>
            )}
          </div>
        );
      case 'none':
      default:
        return (
          <button
            onClick={(e) => handleSendFriendRequest(e, user.userId)}
            disabled={isLoading}
            className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {isLoading ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-3 h-3" />
                Gửi lời kết bạn
              </>
            )}
          </button>
        );
    }
  };

  const tabs = [
    { id: 'all' as const, label: 'Tất cả', total: users.length + groups.length + posts.length },
    { id: 'users' as const, label: 'Người dùng', icon: User, total: users.length },
    { id: 'groups' as const, label: 'Cộng đồng', icon: Users, total: groups.length },
    { id: 'posts' as const, label: 'Bài viết', icon: FileText, total: posts.length },
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
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                Kết quả tìm kiếm
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Tìm kiếm cho "
                <span className="font-semibold text-gray-900 dark:text-white">{query}</span>"
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
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
              )}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
              <span
                className={cn(
                  'ml-1 text-xs rounded-full px-2 py-0.5',
                  activeTab === tab.id ? 'bg-blue-600/30' : 'bg-gray-200 dark:bg-gray-700',
                )}
              >
                {tab.total}
              </span>
            </button>
          ))}
        </div>

        {/* Results Grid */}
        <div className="space-y-6">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            >
              <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
            </motion.div>
          )}

          {/* Users Results */}
          {!loading && filteredUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Người dùng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUsers.map((user) => (
                  <motion.div
                    key={user.userId}
                    whileHover={{ y: -4 }}
                    className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => navigate(`/profile/${user.userId}`)}
                  >
                    <div className="flex flex-col items-center text-center">
                      <img
                        src={
                          user.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.userId}`
                        }
                        alt={user.displayName}
                        className="w-16 h-16 rounded-full mb-3 object-cover"
                      />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {user.displayName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{user.email}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                        {user.bio?.substring(0, 100) || 'Chưa có tiểu sử'}
                      </p>

                      {/* Friend status button based on friendshipStatus */}
                      {renderFriendButton(user)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Groups Results */}
          {!loading && filteredGroups.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cộng đồng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredGroups.map((group) => (
                  <motion.div
                    key={group.groupId}
                    whileHover={{ y: -4 }}
                    className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => navigate(`/communities/${group.groupId}`)}
                  >
                    <div className="flex flex-col items-center text-center">
                      <img
                        src={group.avatar ?? defaultAvatarGroup}
                        alt={group.name}
                        className="w-16 h-16 rounded-full mb-3 object-cover border border-gray-100 dark:border-gray-700 shadow-sm"
                      />
                      <h3 className="font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {group.memberCount.toLocaleString()} thành viên
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                        {group.description?.substring(0, 100) || 'Chưa có mô tả'}
                      </p>
                      <button className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors">
                        Tham gia
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Posts Results */}
          {!loading && filteredPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bài viết</h2>
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <motion.div
                    key={post.postId}
                    whileHover={{ x: 4 }}
                    className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => navigate('/')}
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Bài viết</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {post.content?.substring(0, 100) || 'Chưa có nội dung'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* No Results */}
          {!loading &&
            filteredUsers.length === 0 &&
            filteredGroups.length === 0 &&
            filteredPosts.length === 0 &&
            !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Search className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Không tìm thấy kết quả
                </h3>
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
