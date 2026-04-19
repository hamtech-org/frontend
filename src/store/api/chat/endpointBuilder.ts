import type { BaseQueryFn, EndpointBuilder } from '@reduxjs/toolkit/query';
import type { FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

type ChatTagTypes =
  | 'Conversations'
  | 'Messages'
  | 'Polls'
  | 'Tasks'
  | 'GroupRequests'
  | 'GroupSettings';

export type ChatEndpointBuilder = EndpointBuilder<
  BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>,
  ChatTagTypes,
  'chatApi'
>;
