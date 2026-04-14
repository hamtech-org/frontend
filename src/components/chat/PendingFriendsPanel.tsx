import { UserPlus, Check, X, Users } from 'lucide-react';
import { useState } from 'react';
import { useGetPendingRequestsQuery, useAcceptFriendRequestMutation, useRejectFriendRequestMutation, useSendFriendRequestMutation, useCancelFriendRequestMutation, useGetSuggestedFriendsQuery } from '@/store/api/userApi';

type PendingFriendsTabId = 'received' | 'sent' | 'suggestions';

interface FriendRequest {
  userId: string;
  displayName: string;
  avatar?: string | null;
  bio?: string | null;
  [key: string]: unknown;
}

type PendingFriendsPanelProps = {
  onFriendRequestAccepted?: (userId: string, displayName: string) => void;
};

export function PendingFriendsPanel({ onFriendRequestAccepted }: PendingFriendsPanelProps) {
  const [currentTab, setCurrentTab] = useState<PendingFriendsTabId>('received');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // API calls
  const { data: pendingRes, isLoading: pendingLoading } = useGetPendingRequestsQuery();
  const { data: suggestedRes, isLoading: suggestedLoading } = useGetSuggestedFriendsQuery({ limit: 10 });
  const [acceptFriendRequest] = useAcceptFriendRequestMutation();
  const [rejectFriendRequest] = useRejectFriendRequestMutation();
  const [sendFriendRequest] = useSendFriendRequestMutation();
  const [cancelFriendRequest] = useCancelFriendRequestMutation();

  const receivedRequests = (pendingRes?.data?.received ?? []) as unknown as FriendRequest[];
  const sentRequests = (pendingRes?.data?.sent ?? []) as unknown as FriendRequest[];
  const suggestedFriends = (suggestedRes?.data ?? []) as unknown as FriendRequest[];

  const tabs = [
    { id: 'received' as PendingFriendsTabId, label: 'Nhận được', count: receivedRequests.length },
    { id: 'sent' as PendingFriendsTabId, label: 'Đã gửi', count: sentRequests.length },
    { id: 'suggestions' as PendingFriendsTabId, label: 'Gợi ý', count: suggestedFriends.length },
  ];

  const handleAcceptRequest = async (userId: string, displayName?: string) => {
    setProcessingIds((prev) => new Set(prev).add(userId));
    try {
      await acceptFriendRequest({ senderId: userId }).unwrap();
      onFriendRequestAccepted?.(userId, displayName || 'User');
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

  const handleSendRequest = async (userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(userId));
    try {
      await sendFriendRequest({ friendId: userId }).unwrap();
    } catch (error) {
      console.error('Failed to send friend request:', error);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleCancelRequest = async (userId: string) => {
    setProcessingIds((prev) => new Set(prev).add(userId));
    try {
      await cancelFriendRequest({ friendId: userId }).unwrap();
    } catch (error) {
      console.error('Failed to cancel friend request:', error);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const renderRequestCard = (request: FriendRequest, showButtons: 'accept-reject' | 'cancel' | 'send') => {
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
          </div>
        </div>
        <div className="flex gap-2">
          {showButtons === 'accept-reject' && (
            <>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAcceptRequest(request.userId, request.displayName)}
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
            </>
          )}
          {showButtons === 'cancel' && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleCancelRequest(request.userId)}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-semibold rounded-md transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Hủy lời mời</span>
            </button>
          )}
          {showButtons === 'send' && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSendRequest(request.userId)}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-semibold rounded-md transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              <span>Gửi lời mời</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    if (currentTab === 'received') {
      return (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 px-4 py-3 min-h-0">
          {!pendingLoading ? (
            receivedRequests.length > 0 ? (
              receivedRequests.map((request) => renderRequestCard(request, 'accept-reject'))
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
      );
    }

    if (currentTab === 'sent') {
      return (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 px-4 py-3 min-h-0">
          {!pendingLoading ? (
            sentRequests.length > 0 ? (
              sentRequests.map((request) => renderRequestCard(request, 'cancel'))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <UserPlus className="w-12 h-12 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Bạn chưa gửi lời mời kết bạn nào</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Đang tải...</p>
            </div>
          )}
        </div>
      );
    }

    if (currentTab === 'suggestions') {
      return (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 px-4 py-3 min-h-0">
          {!suggestedLoading ? (
            suggestedFriends.length > 0 ? (
              suggestedFriends.map((friend) => renderRequestCard(friend, 'send'))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Không có gợi ý nào</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Đang tải...</p>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1a1a1a]">
      <div className="px-4 py-3 shrink-0 border-b border-black/5 dark:border-white/5">
        <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2 mb-3">
          <UserPlus className="w-5 h-5" />
          Lời mời kết bạn
        </h2>
        <div className="flex gap-2 border-b border-black/5 dark:border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentTab(tab.id)}
              className={`px-3 py-2 text-sm font-semibold transition-colors border-b-2 ${
                currentTab === tab.id
                  ? 'text-blue-600 border-blue-600'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {renderTabContent()}
    </div>
  );
}
