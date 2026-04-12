import { Users, MessageCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useGetFriendsQuery } from '@/store/api/contactApi';

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
  const { data: friendsRes, isLoading: friendsLoading, error: friendsError } = useGetFriendsQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');

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
            <p className="text-[11px]">(API returned: {JSON.stringify(friendsRes?.data?.length ?? 'none')})</p>
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
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
