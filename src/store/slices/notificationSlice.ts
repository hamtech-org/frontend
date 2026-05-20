import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { INotification } from '@/types/notification.types';
import { countBellUnread, countsTowardBell } from '@/utils/notificationBellCount';

interface NotificationState {
  notifications: INotification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<INotification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = countBellUnread(action.payload);
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    addNotification: (state, action: PayloadAction<INotification>) => {
      const exists = state.notifications.some(
        (n) => n.notificationId === action.payload.notificationId,
      );
      if (exists) return;
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead && countsTowardBell(action.payload.type)) {
        state.unreadCount += 1;
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notif = state.notifications.find((n) => n.notificationId === action.payload);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        if (countsTowardBell(notif.type)) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    },
  },
});

export const { setNotifications, setUnreadCount, addNotification, markAsRead, markAllAsRead } =
  notificationSlice.actions;
export default notificationSlice.reducer;
