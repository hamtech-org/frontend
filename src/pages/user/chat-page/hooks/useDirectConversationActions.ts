import { useCallback, useMemo } from 'react';
import { chatApi } from '@/store/api/chatApi';
import { useCreateConversationMutation } from '@/store/api/chatApi';
import { socketService } from '@/services/socket';
import type { IConversation } from '@/types/chat.types';
import type { AppDispatch } from '@/store/store';

interface UseDirectConversationActionsParams {
  conversations: IConversation[];
  activeConversation?: IConversation;
  dispatch: AppDispatch;
  navigate: (path: string) => void;
  initiateCall: (userId: string, type: 'audio' | 'video') => void;
  initiateGroupCall: (type: 'audio' | 'video') => void;
  selectedGroupMembers: string[];
  groupName: string;
  setShowCreateGroupModal: (v: boolean) => void;
  setSelectedGroupMembers: (v: string[] | ((prev: string[]) => string[])) => void;
  setGroupName: (v: string) => void;
  setShowContactsManagement: (v: boolean | ((prev: boolean) => boolean)) => void;
}

/**
 * Hook gom các action liên quan direct conversation:
 * tạo group, mở chat với friend, gọi audio/video.
 */
export function useDirectConversationActions({
  conversations,
  activeConversation,
  dispatch,
  navigate,
  initiateCall,
  initiateGroupCall,
  selectedGroupMembers,
  groupName,
  setShowCreateGroupModal,
  setSelectedGroupMembers,
  setGroupName,
  setShowContactsManagement,
}: UseDirectConversationActionsParams) {
  const [createConversation] = useCreateConversationMutation();

  // Tạo nhóm mới
  const handleConfirmCreateGroup = useCallback(async () => {
    if (selectedGroupMembers.length < 2) return;
    try {
      const result = await createConversation({
        type: 'group',
        name: groupName || `Nhóm (${selectedGroupMembers.length + 1} thành viên)`,
        memberIds: selectedGroupMembers,
      }).unwrap();
      const conversationId = result.data.conversationId;
      socketService.emit('conversation:join', conversationId);
      void navigate(`/chat/${conversationId}`);
      dispatch(chatApi.endpoints.getMessages.initiate({ conversationId }));
    } catch (err) {
      console.error('[DEBUG] Tạo nhóm lỗi:', err);
    }
    setShowCreateGroupModal(false);
    setSelectedGroupMembers([]);
    setGroupName('');
  }, [
    selectedGroupMembers,
    groupName,
    createConversation,
    navigate,
    dispatch,
    setShowCreateGroupModal,
    setSelectedGroupMembers,
    setGroupName,
  ]);

  // Mở chat nhóm từ danh sách nhóm
  const handleGroupClick = useCallback(
    async (conversationIdOrGroupId: string, _groupName: string) => {
      const existingConversation = conversations.find(
        (c) =>
          c.type === 'group' &&
          (c.conversationId === conversationIdOrGroupId ||
            String((c as { groupId?: string }).groupId ?? '') === conversationIdOrGroupId),
      );
      const targetId = existingConversation?.conversationId ?? conversationIdOrGroupId;

      setShowContactsManagement(false);
      socketService.emit('conversation:join', targetId);
      void navigate(`/chat/${targetId}`);
    },
    [conversations, navigate, setShowContactsManagement],
  );

  // Mở/tạo chat với bạn bè từ contacts list
  const handleFriendClick = useCallback(
    async (friendId: string, _friendName: string) => {
      try {
        let existingConversation = conversations.find(
          (c) => c.type === 'direct' && (c.otherUserId === friendId || c.name === _friendName),
        );

        if (!existingConversation) {
          const result = await createConversation({
            type: 'direct',
            memberIds: [friendId],
          }).unwrap();
          existingConversation = result.data;
        }

        setShowContactsManagement(false);
        void navigate(`/chat/${existingConversation.conversationId}`);
      } catch (error) {
        console.error('Failed to open conversation with friend:', error);
      }
    },
    [conversations, createConversation, navigate, setShowContactsManagement],
  );

  // Tạo conversation sau khi accept friend request
  const handleFriendRequestAccepted = useCallback(
    async (friendId: string, _friendName: string) => {
      try {
        let existingConversation = conversations.find(
          (c) => c.type === 'direct' && c.otherUserId === friendId,
        );

        if (!existingConversation) {
          const result = await createConversation({
            type: 'direct',
            memberIds: [friendId],
          }).unwrap();
          existingConversation = result.data;
          void navigate(`/chat/${existingConversation.conversationId}`);
        }
      } catch (error) {
        console.error('Failed to create conversation after accepting friend request:', error);
      }
    },
    [conversations, createConversation, navigate],
  );

  // Toggle chọn member khi tạo nhóm
  const handleToggleGroupMember = useCallback(
    (conversationId: string, checked: boolean) => {
      setSelectedGroupMembers((prev) =>
        checked ? [...prev, conversationId] : prev.filter((id) => id !== conversationId),
      );
    },
    [setSelectedGroupMembers],
  );

  // Gọi audio
  const handleAudioCall = useCallback(() => {
    if (activeConversation?.type !== 'direct' || !activeConversation.otherUserId) return;
    initiateCall(activeConversation.otherUserId, 'audio');
  }, [activeConversation, initiateCall]);

  // Gọi video
  const handleVideoCall = useCallback(() => {
    if (activeConversation?.type !== 'direct' || !activeConversation.otherUserId) return;
    initiateCall(activeConversation.otherUserId, 'video');
  }, [activeConversation, initiateCall]);

  const handleGroupAudioCall = useCallback(() => {
    if (activeConversation?.type !== 'group') return;
    initiateGroupCall('audio');
  }, [activeConversation, initiateGroupCall]);

  const handleGroupVideoCall = useCallback(() => {
    if (activeConversation?.type !== 'group') return;
    initiateGroupCall('video');
  }, [activeConversation, initiateGroupCall]);

  return useMemo(
    () => ({
      handleConfirmCreateGroup,
      handleGroupClick,
      handleFriendClick,
      handleFriendRequestAccepted,
      handleToggleGroupMember,
      handleAudioCall,
      handleVideoCall,
      handleGroupAudioCall,
      handleGroupVideoCall,
    }),
    [
      handleConfirmCreateGroup,
      handleGroupClick,
      handleFriendClick,
      handleFriendRequestAccepted,
      handleToggleGroupMember,
      handleAudioCall,
      handleVideoCall,
      handleGroupAudioCall,
      handleGroupVideoCall,
    ],
  );
}
