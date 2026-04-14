import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, UserPlus, X } from 'lucide-react';
import { useGetFriendsQuery } from '@/store/api/contactApi';

type AddMembersModalProps = {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  existingMemberIds: string[];
  onToggleSelect: (userId: string, checked: boolean) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
};

type Friend = {
  userId: string;
  displayName?: string;
  avatar?: string | null;
  email?: string;
  phone?: string;
};

export function AddMembersModal({
  open,
  onClose,
  selectedIds,
  existingMemberIds,
  onToggleSelect,
  onConfirm,
  isSubmitting = false,
}: AddMembersModalProps) {
  const [query, setQuery] = useState('');
  const { data: friendsRes, isLoading } = useGetFriendsQuery();
  // Backend có thể trả `data` là array hoặc object { friends: [] }.
  const friends = useMemo((): Friend[] => {
    const data: unknown = friendsRes?.data;
    if (!data) return [];
    if (Array.isArray(data)) return data as Friend[];
    if (typeof data === 'object') {
      const asObj = data as { friends?: unknown };
      if (Array.isArray(asObj.friends)) return asObj.friends as Friend[];
      // fallback: nếu là 1 user object
      return [data as Friend];
    }
    return [];
  }, [friendsRes?.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return friends.filter((friend) => {
      if (existingMemberIds.includes(friend.userId)) return false;
      if (!q) return true;
      return [friend.displayName, friend.email, friend.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [friends, existingMemberIds, query]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[460px] w-full shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden max-h-[88vh]"
          >
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-[17px] text-black dark:text-white">Thêm thành viên</h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm kiếm người dùng"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-blue-500/30 outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar space-y-2">
              {isLoading ? (
                <p className="text-center text-sm text-muted-foreground py-6">Đang tải danh sách...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  {friends.length === 0 ? 'Chưa có bạn bè để thêm' : 'Không có người dùng phù hợp'}
                </p>
              ) : (
                filtered.map((friend) => {
                  const selected = selectedIds.includes(friend.userId);
                  return (
                    <label
                      key={friend.userId}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => onToggleSelect(friend.userId, e.target.checked)}
                        className="w-5 h-5 rounded-full accent-blue-600"
                      />
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                        {friend.avatar ? (
                          <img src={friend.avatar} alt={friend.displayName ?? ''} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-blue-600 font-bold text-xs">
                            {(friend.displayName?.slice(0, 1) ?? 'U').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{friend.displayName ?? friend.userId}</p>
                        <p className="text-xs text-muted-foreground truncate">{friend.email ?? friend.phone ?? ''}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Đã chọn {selectedIds.length} người</span>
              <button
                type="button"
                disabled={selectedIds.length === 0 || isSubmitting}
                onClick={onConfirm}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  {isSubmitting ? 'Đang thêm...' : 'Thêm vào nhóm'}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
