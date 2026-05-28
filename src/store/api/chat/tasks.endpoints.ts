import type { ChatEndpointBuilder } from '@/store/api/chat/endpointBuilder';
import type { ApiSuccessResponse } from '@/types/api.types';
import type {
  CreateTaskRequest,
  TriggerTaskDueReminderRequest,
  UpdateTaskStatusRequest,
} from '@/store/api/chat/types';

export function buildTasksEndpoints(builder: ChatEndpointBuilder) {
  return {
    getTasks: builder.query<ApiSuccessResponse<any[]>, string>({
      query: (groupId) => `/chat/groups/${groupId}/tasks`,
      providesTags: (_result, _error, groupId) => [{ type: 'Tasks', id: groupId }],
    }),
    createTask: builder.mutation<ApiSuccessResponse<any>, CreateTaskRequest>({
      query: ({ groupId, ...body }) => ({
        url: `/chat/groups/${groupId}/tasks`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Tasks', id: groupId }],
    }),
    updateTaskStatus: builder.mutation<ApiSuccessResponse<any>, UpdateTaskStatusRequest>({
      query: ({ groupId, taskId, ...body }) => ({
        url: `/chat/groups/${groupId}/tasks/${taskId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Tasks', id: groupId }],
    }),
    triggerTaskDueReminder: builder.mutation<
      ApiSuccessResponse<{ sent: boolean }>,
      TriggerTaskDueReminderRequest
    >({
      query: ({ groupId, taskId }) => ({
        url: `/chat/groups/${groupId}/tasks/${taskId}/remind-due`,
        method: 'POST',
      }),
    }),
  };
}
