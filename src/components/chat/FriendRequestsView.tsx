import { UserPlus, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useGetPendingRequestsQuery, useAcceptFriendRequestMutation, useRejectFriendRequestMutation } from '@/store/api/userApi';
import { socketService } from '@/services/socket';

type FriendRequestsViewProps = {
  onRequestAction?: (action: 'accept' | 'reject', userId: string) => void;
};

interface FriendRequest {
  userId: string;
  displayName: string;
  avatar?: string | null;
  bio?: string | null;
  [key: string]: unknown;
}

export function FriendRequestsView({ onRequestAction }: FriendRequestsViewProps) {
  const { data: pendingRes, isLoading: pendingLoading, refetch } = useGetPendingRequestsQuery();
  const [acceptFriendRequest] = useAcceptFriendRequestMutation();
  const [rejectFriendRequest] = useRejectFriendRequestMutation();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const pendingRequests = (pendingRes?.data?.received ?? []) as FriendRequest[];

  // Listen for real-time friend request events
  useEffect(() => {
    const handleNewRequest = () => {
      console.log('New friend request received');
      refetch();
    };

    const handleRequestAccepted = () => {
      console.log('Friend request accepted');
      refetch();
    };

    const handleRequestRejected = () => {
      console.log('Friend request rejected');
      refetch();
    };

    socketService.on('friendRequest:new', handleNewRequest);
    socketService.on('friendRequest:accepted', handleRequestAccepted);
    socketService.on('friendRequest:rejected', handleRequestRejected);

    return () => {
      socketService.off('friendRequest:new', handleNewRequest);
      socketService.off('friendRequest:accepted', handleRequestAccepted);
      socketService.off('friendRequest:rejected', handleRequestRejected);
    };
  }, [refetch]);

  const handleAcceptRequest = async (userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(userId));
    try {
      await acceptFriendRequest({ senderId: userId }).unwrap();
      // Emit socket event to notify others
      socketService.emit('friendRequest:accept', userId);
      onRequestAction?.('accept', userId);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleRejectRequest = async (userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(userId));
    try {
      await rejectFriendRequest({ senderId: userId }).unwrap();
      // Emit socket event to notify others
      socketService.emit('friendRequest:reject', userId);
      onRequestAction?.('reject', userId);
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1a1a1a]">
      <div className="px-4 py-3 shrink-0 border-b border-black/5 dark:border-white/5">
        <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Lời mời kết bạn ({pendingRequests.length})
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 px-4 py-3 min-h-0">
        {!pendingLoading ? (
          pendingRequests.length > 0 ? (
            pendingRequests.map((request) => {
              const title = request.displayName || 'Unknown';
              const avatar = request.avatar;
              const isProcessing = processingIds.has(request.userId);

              return (
                <div
                  key={request.userId}
                  className="p-3 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative shrink-0">
                      {avatar ? (
                        <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-600">
                          {title.trim().slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-black dark:text-white truncate">{title}</p>
                      {request.bio && (
                        <p className="text-[10px] text-muted-foreground truncate">{request.bio}</p>
                      )}
                      {!request.bio && (
                        <p className="text-[10px] text-muted-foreground">Muốn kết bạn với bạn</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAcceptRequest(request.userId)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-semibold rounded-md transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      <span>Chấp nhận</span>
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRejectRequest(request.userId)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-semibold rounded-md transition-colors"
                    >
                      <X className="w-3 h-3" />
                      <span>Từ chối</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <UserPlus className="w-12 h-12 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Bạn không có lời mời kết bạn nào</p>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Đang tải...</p>
          </div>
        )}
      </div>
    </div>
  );
}
