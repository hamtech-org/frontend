import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/store/api/baseQuery';
import { buildConversationsEndpoints } from '@/store/api/chat/conversations.endpoints';
import { buildMessagesEndpoints } from '@/store/api/chat/messages.endpoints';
import { buildGroupsEndpoints } from '@/store/api/chat/groups.endpoints';
import { buildRequestsEndpoints } from '@/store/api/chat/requests.endpoints';
import { buildPollsEndpoints } from '@/store/api/chat/polls.endpoints';
import { buildTasksEndpoints } from '@/store/api/chat/tasks.endpoints';
import { buildJoinEndpoints } from '@/store/api/chat/join.endpoints';

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Conversations',
    'Messages',
    'Polls',
    'Tasks',
    'GroupRequests',
    'GroupSettings',
    'GroupJoinPreview',
  ],
  endpoints: (builder) => ({
    ...buildConversationsEndpoints(builder),
    ...buildMessagesEndpoints(builder),
    ...buildGroupsEndpoints(builder),
    ...buildRequestsEndpoints(builder),
    ...buildPollsEndpoints(builder),
    ...buildTasksEndpoints(builder),
    ...buildJoinEndpoints(builder),
  }),
});
