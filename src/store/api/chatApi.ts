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
  useGenerateAIRecapMutation,
  useGetPollsQuery,
  useGetTasksQuery,
  useTriggerTaskDueReminderMutation,
  useGetGroupRequestsQuery,
  useGetLatestAIRecapQuery,
  useGetGroupSettingsQuery,
  useUpdateGroupSettingsMutation,
} = chatApi;
