import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import contactReducer from './slices/contactSlice';
import newsfeedReducer from './slices/newsfeedSlice';
import notificationReducer from './slices/notificationSlice';
import uiReducer from './slices/uiSlice';
import callReducer from './slices/callSlice';
import { reelUploadReducer } from './slices/reelUploadSlice';
import { authApi } from './api/authApi';
import { userApi } from './api/userApi';
import { chatApi } from './api/chatApi';
import { contactApi } from './api/contactApi';
import { newsfeedApi } from './api/newsfeedApi';
import { adminApi } from './api/adminApi';
import { mediaApi } from './api/mediaApi';
import { notificationsApi } from './api/notificationsApi';
import { liveApi } from './api/liveApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    contact: contactReducer,
    newsfeed: newsfeedReducer,
    notification: notificationReducer,
    ui: uiReducer,
    call: callReducer,
    reelUpload: reelUploadReducer,
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
    [contactApi.reducerPath]: contactApi.reducer,
    [newsfeedApi.reducerPath]: newsfeedApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [mediaApi.reducerPath]: mediaApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [liveApi.reducerPath]: liveApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      userApi.middleware,
      chatApi.middleware,
      contactApi.middleware,
      newsfeedApi.middleware,
      adminApi.middleware,
      mediaApi.middleware,
      notificationsApi.middleware,
      liveApi.middleware,
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
