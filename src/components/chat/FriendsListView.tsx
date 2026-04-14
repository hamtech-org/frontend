import { Users, MessageCircle, MoreVertical, Trash2, User, Mail, Phone, X } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useGetFriendsQuery, useDeleteFriendMutation } from '@/store/api/contactApi';
import { socketService } from '@/services/socket';

type FriendsListViewProps = {
  onFriendClick?: (friendId: string, friendName: string) => void;
};

interface Friend {
  userId: string;
  displayName: string;
  avatar?: string | null;
  status?: string;
  email?: string;
  phone?: string | null;
  [key: string]: unknown;
}

function groupFriendsByLetter(friends: Friend[]): Record<string, Friend[]> {
  const groups: Record<string, Friend[]> = {};

  friends.forEach((friend) => {
    const name = friend.displayName || 'Unknown';
    const firstLetter = name.trim().charAt(0).toUpperCase();
    const key = /^[A-Z]$/.test(firstLetter) ? firstLetter : '#';

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(friend);
  });

  return Object.keys(groups)
    .sort()
    .reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, Friend[]>);
}

export function FriendsListView({ onFriendClick }: FriendsListViewProps) {
  const { data: friendsRes, isLoading: friendsLoading, error: friendsError, refetch } = useGetFriendsQuery();
  const [deleteFriend, { isLoading: isDeleting }] = useDeleteFriendMutation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedFriendForProfile, setSelectedFriendForProfile] = useState<Friend | null>(null);

  // Listen for real-time friend list changes
  useEffect(() => {
    const handleFriendAdded = () => {
      console.log('Friend added');
      refetch();
    };

    const handleFriendRemoved = () => {
      console.log('Friend removed');
      refetch();
    };

    const handleFriendStatusChanged = () => {
      console.log('Friend status changed');
      refetch();
    };

    socketService.on('friend:added', handleFriendAdded);
    socketService.on('friend:removed', handleFriendRemoved);
    socketService.on('friend:statusChanged', handleFriendStatusChanged);

    return () => {
      socketService.off('friend:added', handleFriendAdded);
      socketService.off('friend:removed', handleFriendRemoved);
      socketService.off('friend:statusChanged', handleFriendStatusChanged);
    };
  }, [refetch]);

  // Extract and process friends data
  const processedFriends = useMemo(() => {
    console.log('FriendsListView - friendsRes:', friendsRes);
    console.log('FriendsListView - friendsRes?.data:', friendsRes?.data);
    
    if (!friendsRes?.data) {
      console.log('No friends data found');
      return [];
    }
    
    // Handle both array and object responses
    let friends: Friend[] = [];
    
    if (Array.isArray(friendsRes.data)) {
      console.log('Data is array, length:', friendsRes.data.length);
      friends = friendsRes.data as Friend[];
    } else if (friendsRes.data && typeof friendsRes.data === 'object') {
      // If data is wrapped in an object with a 'friends' property
      const dataObj = friendsRes.data as any;
      if (Array.isArray(dataObj.friends)) {
        console.log('Data has friends property, length:', dataObj.friends.length);
        friends = dataObj.friends as Friend[];
      } else {
        console.log('Data is object but no friends property, treating as array');
        friends = [friendsRes.data] as Friend[];
      }
    }

    console.log('Processed friends:', friends);

    // Filter by search query
    if (searchQuery) {
      friends = friends.filter((friend) =>
        (friend.displayName || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus === 'online') {
      friends = friends.filter((friend) => friend.status === 'online');
    } else if (filterStatus === 'offline') {
      friends = friends.filter((friend) => friend.status !== 'online');
    }

    // Sort by name
    friends = [...friends].sort((a, b) => {
      const nameA = (a.displayName || '').toLowerCase();
      const nameB = (b.displayName || '').toLowerCase();
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    console.log('Final processed friends:', friends);
    return friends;
  }, [friendsRes?.data, searchQuery, sortOrder, filterStatus]);

  const handleDeleteFriend = async (friendId: string, friendName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${friendName} khỏi danh sách bạn bè?`)) {
      try {
        await deleteFriend(friendId).unwrap();
        // Emit socket event to notify others
        socketService.emit('friend:remove', friendId);
        console.log('Delete friend successfully:', friendId, friendName);
        setOpenMenuId(null);
      } catch (error) {
        console.error('Error deleting friend:', error);
        alert('Lỗi khi xóa bạn bè. Vui lòng thử lại.');
      }
    }
  };

  const handleViewProfile = (friend: Friend) => {
    setSelectedFriendForProfile(friend);
    setOpenMenuId(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1a1a1a] px-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-black/5 dark:border-white/5">
        <Users className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-black dark:text-white">Danh sách bạn bè</h2>
        <span className="ml-auto text-sm font-semibold text-muted-foreground">
          Bạn bè ({processedFriends.length})
        </span>
      </div>

      {/* Search & Sort */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Tìm bạn"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2a2a2a] text-black dark:text-white placeholder-muted-foreground focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2a2a2a] text-black dark:text-white text-sm focus:outline-none"
        >
          <option value="asc">Tên (A-Z)</option>
          <option value="desc">Tên (Z-A)</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'online' | 'offline')}
          className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#2a2a2a] text-black dark:text-white text-sm focus:outline-none"
        >
          <option value="all">Tất cả</option>
          <option value="online">Đang hoạt động</option>
          <option value="offline">Ngoại tuyến</option>
        </select>
      </div>

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {friendsLoading && (
          <p className="text-center text-sm text-muted-foreground py-8">Đang tải danh sách bạn bè...</p>
        )}
        {friendsError && (
          <div className="text-center text-sm text-red-500 py-8 space-y-2">
            <p>Lỗi khi tải danh sách bạn bè</p>
            <p className="text-[10px] text-red-400">{JSON.stringify(friendsError)}</p>
          </div>
        )}
        {!friendsLoading && !friendsError && processedFriends.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8 space-y-2">
            <p>Chưa có bạn bè. Hãy thêm bạn mới!</p>
          </div>
        )}
        {!friendsLoading && !friendsError && processedFriends.length > 0 &&
          Object.entries(groupFriendsByLetter(processedFriends)).map(([letter, groupFriends]) => (
            <div key={letter} className="mb-4">
              <h3 className="text-sm font-bold text-black dark:text-white mb-3 px-2">{letter}</h3>
              <div className="space-y-2">
                {(groupFriends as Friend[]).map((friend, idx) => {
                  const avatar = friend.avatar;
                  const displayName = friend.displayName || 'Unknown';
                  const isOnline = friend.status === 'online';
                  const key = `${letter}-${friend.userId}-${String(idx)}`;
                  return (
                    <div
                      key={key}
                      onClick={() => onFriendClick?.(friend.userId, displayName)}
                      className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={displayName}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 text-sm font-bold text-blue-600">
                            {displayName.trim().slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-black dark:text-white truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isOnline ? '🟢 Đang hoạt động' : '🔘 Ngoại tuyến'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-blue-600/20 dark:hover:bg-blue-500/20 rounded-lg transition-all text-blue-600 dark:text-blue-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFriendClick?.(friend.userId, displayName);
                          }}
                          title="Nhắn tin"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </button>
                        <div className="relative">
                          <button
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-all text-black dark:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === friend.userId ? null : friend.userId);
                            }}
                            title="Thêm tùy chọn"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openMenuId === friend.userId && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-lg border border-black/10 dark:border-white/10 z-50 overflow-hidden">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewProfile(friend);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
                              >
                                <User className="w-4 h-4" />
                                Xem hồ sơ
                              </button>
                              <div className="border-t border-black/5 dark:border-white/5" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFriend(friend.userId, displayName);
                                }}
                                disabled={isDeleting}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-600/10 dark:hover:bg-red-500/10 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
                                {isDeleting ? 'Đang xóa...' : 'Xóa kết bạn'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {/* Friend Profile Modal */}
      {selectedFriendForProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 shadow-2xl backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[400px] w-full shadow-2xl border border-black/5 dark:border-white/10 relative max-h-[90vh] flex flex-col overflow-hidden">
            <button
              type="button"
              onClick={() => setSelectedFriendForProfile(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 backdrop-blur-md transition-colors z-20 shadow-sm"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
              <div className="relative h-32 shrink-0 group bg-gradient-to-r from-blue-500 to-blue-600" />

              <div className="px-6 relative pb-6">
                <div className="flex flex-col items-center -mt-12 relative z-10">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-[4px] border-white dark:border-[#1a1a1a] overflow-hidden bg-white shadow-md">
                      {selectedFriendForProfile.avatar ? (
                        <img
                          src={selectedFriendForProfile.avatar}
                          alt={selectedFriendForProfile.displayName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-2xl font-bold text-blue-600">
                          {selectedFriendForProfile.displayName.trim().slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-2xl text-black dark:text-white mt-2 text-center">
                    {selectedFriendForProfile.displayName}
                  </h3>
                  <div className="text-[13px] font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5 justify-center">
                    {selectedFriendForProfile.status === 'online' ? (
                      <>
                        Đang hoạt động{' '}
                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      </>
                    ) : (
                      <>
                        Ngoại tuyến{' '}
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  {selectedFriendForProfile.email && (
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-start gap-4">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                        <Mail className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 block">
                          Email
                        </span>
                        <p className="text-[14px] font-semibold text-black dark:text-white/90">{selectedFriendForProfile.email}</p>
                      </div>
                    </div>
                  )}
                  {selectedFriendForProfile.phone && (
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-start gap-4">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                        <Phone className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 block">
                          Điện thoại
                        </span>
                        <p className="text-[14px] font-semibold text-black dark:text-white/90">{selectedFriendForProfile.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3 pb-2 shrink-0">
                  <button
                    type="button"
                    className="flex-1 py-2.5 rounded-xl font-bold text-[14px] bg-[#0068ff] text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5"
                    onClick={() => {
                      onFriendClick?.(selectedFriendForProfile.userId, selectedFriendForProfile.displayName);
                      setSelectedFriendForProfile(null);
                    }}
                  >
                    Nhắn tin
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
