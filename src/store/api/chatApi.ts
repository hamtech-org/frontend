export * from './chat/types';
export { chatApi } from './chat/core';
export { patchConversationsFromNewMessage, patchMessageInGetMessagesCache } from './chat/cache';

import { chatApi } from './chat/core';

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useGetConversationMembersQuery,
  useCreateConversationMutation,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useRecallMessageMutation,
  useMarkAsReadMutation,
  useUpdateConversationPreferencesMutation,
  usePinMessageMutation,
  useUnpinMessageMutation,
  useReactMessageMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useLeaveGroupMutation,
  useAddMembersMutation,
  useRemoveMemberMutation,
  useChangeMemberRoleMutation,
  useJoinRequestMutation,
  useApproveRequestMutation,
  useRejectRequestMutation,
  useCreatePollMutation,
  useVotePollMutation,
  useUnvotePollMutation,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useGetPollsQuery,
  useGetTasksQuery,
  useTriggerTaskDueReminderMutation,
  useGetGroupRequestsQuery,
  useGetGroupSettingsQuery,
  useUpdateGroupSettingsMutation,
} = chatApi;
