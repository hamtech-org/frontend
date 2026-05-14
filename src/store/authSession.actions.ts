import { createAction } from '@reduxjs/toolkit';

/** Silent refresh (baseQuery / axios) — tránh import vòng authApi ↔ baseQuery ↔ authSlice */
export const sessionTokensRefreshed = createAction<{ accessToken: string; refreshToken: string }>(
  'auth/sessionTokensRefreshed',
);
