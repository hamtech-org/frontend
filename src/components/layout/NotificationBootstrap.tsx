import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { useGetNotificationsQuery } from '@/store/api/notificationsApi';
import { setNotifications, setUnreadCount } from '@/store/slices/notificationSlice';
import type { AppDispatch } from '@/store/store';

/** Tải inbox + badge chuông khi đã đăng nhập. */
export function NotificationBootstrap(): null {
  const dispatch = useDispatch<AppDispatch>();
  const { data } = useGetNotificationsQuery({ limit: 50 });

  useEffect(() => {
    if (!data) return;
    dispatch(setNotifications(data.items));
    dispatch(setUnreadCount(data.unreadCount));
  }, [data, dispatch]);

  return null;
}
