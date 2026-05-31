import { PendingFriendsPanel } from '@/components/chat/PendingFriendsPanel';

type FriendRequestsViewProps = {
  onRequestAction?: (action: 'accept' | 'reject', userId: string) => void;
};

export function FriendRequestsView({ onRequestAction }: FriendRequestsViewProps) {
  return (
    <PendingFriendsPanel
      onFriendRequestAccepted={(userId) => {
        onRequestAction?.('accept', userId);
      }}
    />
  );
}
