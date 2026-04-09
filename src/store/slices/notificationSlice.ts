import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
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
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.isRead).length;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead) state.unreadCount++;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notif = state.notifications.find((n) => n.notificationId === action.payload);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        state.unreadCount--;
      }
    },
  },
});

export const { setNotifications, addNotification, markAsRead } = notificationSlice.actions;
export default notificationSlice.reducer;
