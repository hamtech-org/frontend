import { AnimatePresence, motion } from 'motion/react';
import { Search, UserPlus, X, Loader, Clock, UserCheck, CheckCircle, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useSelector } from 'react-redux';
import { searchService } from '@/services/search.service';
import {
  useSendFriendRequestMutation,
  useCancelFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
} from '@/store/api/userApi';
import type { RootState } from '@/store/store';
import { buildUserQrPayload } from '@/utils/userQrPayload';

interface SearchResult {
  userId: string;
  displayName: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  bio?: string | null;
  isFriend?: boolean;
  friendshipStatus?: 'friend' | 'pending_sent' | 'pending_received' | 'none';
}

type AddFriendModalProps = {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
};

export function AddFriendModal({ open, query, onQueryChange, onClose }: AddFriendModalProps) {
  const trimmed = query.trim();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMyQr, setShowMyQr] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [sendFriendRequest] = useSendFriendRequestMutation();
  const [cancelFriendRequest] = useCancelFriendRequestMutation();
  const [acceptFriendRequest] = useAcceptFriendRequestMutation();
  const [rejectFriendRequest] = useRejectFriendRequestMutation();
  const myQrValue = currentUser?.userId
    ? buildUserQrPayload({
        userId: currentUser.userId,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar,
      })
    : '';

  // Fetch results when query changes
  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchService.searchUsersByContact({ q: trimmed, pageSize: 10 });
        setResults(data?.items || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [trimmed]);

  const handleSendRequest = async (userId: string) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await sendFriendRequest({ friendId: userId }).unwrap();
      setResults((prev) =>
        prev.map((user) =>
          user.userId === userId ? { ...user, friendshipStatus: 'pending_sent' } : user,
        ),
      );
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleCancelRequest = async (userId: string) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await cancelFriendRequest({ friendId: userId }).unwrap();
      setResults((prev) =>
        prev.map((user) => (user.userId === userId ? { ...user, friendshipStatus: 'none' } : user)),
      );
    } catch (error) {
      console.error('Error canceling friend request:', error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleAcceptRequest = async (userId: string) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await acceptFriendRequest({ senderId: userId }).unwrap();
      setResults((prev) =>
        prev.map((user) =>
          user.userId === userId ? { ...user, friendshipStatus: 'friend', isFriend: true } : user,
        ),
      );
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleRejectRequest = async (userId: string) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await rejectFriendRequest({ senderId: userId }).unwrap();
      setResults((prev) =>
        prev.map((user) => (user.userId === userId ? { ...user, friendshipStatus: 'none' } : user)),
      );
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const renderActionButton = (user: SearchResult) => {
    const status = user.friendshipStatus || 'none';
    const isLoading = actionLoading[user.userId];

    switch (status) {
      case 'friend':
        return (
          <button
            disabled
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-semibold"
          >
            <UserCheck className="w-3 h-3" />
            Bạn bè
          </button>
        );
      case 'pending_sent':
        return (
          <button
            onClick={() => handleCancelRequest(user.userId)}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            Hủy
          </button>
        );
      case 'pending_received':
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAcceptRequest(user.userId)}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              Chấp nhận
            </button>
            <button
              onClick={() => handleRejectRequest(user.userId)}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-400 hover:bg-gray-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Từ chối
            </button>
          </div>
        );
      case 'none':
      default:
        return (
          <button
            onClick={() => handleSendRequest(user.userId)}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              <UserPlus className="w-3 h-3" />
            )}
            Kết bạn
          </button>
        );
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-friend-title"
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-[480px] w-full shadow-2xl border border-black/5 dark:border-white/10 flex flex-col overflow-hidden max-h-[88vh]"
          >
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3
                  id="add-friend-title"
                  className="font-bold text-[17px] text-black dark:text-white"
                >
                  Thêm bạn bè
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMyQr((value) => !value)}
                  className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  title="Hiện QR của tôi"
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar flex flex-col gap-4">
              {showMyQr && (
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] p-4 flex flex-col items-center">
                  <p className="text-sm font-bold text-black dark:text-white mb-3">QR của tôi</p>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    {myQrValue ? <QRCodeCanvas value={myQrValue} size={190} /> : null}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-center text-gray-500 dark:text-gray-400">
                    Đưa mã này cho người khác quét để xem thông tin và gửi lời mời kết bạn.
                  </p>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Email hoặc số điện thoại..."
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none border border-transparent focus:bg-white dark:focus:bg-black focus:border-blue-600/50 shadow-sm text-[14px] font-medium transition-all text-black dark:text-white"
                />
              </div>

              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                </div>
              )}

              {!loading && results.length > 0 && (
                <div className="space-y-3">
                  {results.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center gap-3 p-3 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                      <img
                        src={
                          user.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.userId}`
                        }
                        alt={user.displayName}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-black dark:text-white truncate">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                        {user.phone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.phone}
                          </p>
                        )}
                      </div>
                      {renderActionButton(user)}
                    </div>
                  ))}
                </div>
              )}

              {!loading && trimmed && results.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Không tìm thấy người dùng với "{trimmed}"
                  </p>
                </div>
              )}

              {!trimmed && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nhập email hoặc số điện thoại để tìm kiếm
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15"
                >
                  Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
