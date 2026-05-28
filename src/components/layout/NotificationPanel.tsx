import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bell } from 'lucide-react';

import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/store/api/notificationsApi';
import { markAllAsRead, markAsRead, setNotifications } from '@/store/slices/notificationSlice';
import type { RootState } from '@/store/store';
import type { AppDispatch } from '@/store/store';
import type { INotification } from '@/types/notification.types';
import { navigateFromNotification } from '@/utils/notificationNavigation';
import { getNotificationPresentation } from '@/utils/notificationPresentation';
import { formatRelative } from '@/utils/formatDate';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils/cn';

type FilterTab = 'all' | 'unread';

interface NotificationPanelProps {
  isDarkMode: boolean;
  onClose: () => void;
  className?: string;
}

function NotificationListItem({
  item,
  isDarkMode,
  onOpen,
}: {
  item: INotification;
  isDarkMode: boolean;
  onOpen: (item: INotification) => void;
}) {
  const presentation = getNotificationPresentation(item);

  return (
    <li>
      <button
        type="button"
        className={cn(
          'w-full flex gap-3 items-start text-left px-4 py-3 transition-colors hover:bg-muted/60',
          !item.isRead && (isDarkMode ? 'bg-primary/10' : 'bg-muted/40'),
        )}
        onClick={() => onOpen(item)}
      >
        <Avatar size="sm" className="size-10 shrink-0 mt-0.5">
          {presentation.avatar ? (
            <AvatarImage
              src={presentation.avatar}
              alt={presentation.who}
              referrerPolicy="no-referrer"
            />
          ) : null}
          <AvatarFallback className="text-xs font-semibold">{presentation.fallback}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <p
                  className={cn(
                    'text-sm leading-snug truncate',
                    item.isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground',
                  )}
                >
                  {presentation.title}
                </p>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium leading-none text-primary">
                  {presentation.label}
                </span>
              </div>
            </div>
            {!item.isRead ? (
              <span
                className="size-2 rounded-full bg-red-500 shrink-0 mt-1.5"
                aria-label="Chưa đọc"
              />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{presentation.body}</p>
          <p className="text-[11px] text-muted-foreground/80 mt-1">
            {formatRelative(item.createdAt)}
          </p>
        </div>
      </button>
    </li>
  );
}

function NotificationList({
  items,
  isDarkMode,
  onOpen,
  emptyLabel,
}: {
  items: INotification[];
  isDarkMode: boolean;
  onOpen: (item: INotification) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Bell className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <NotificationListItem
          key={item.notificationId}
          item={item}
          isDarkMode={isDarkMode}
          onOpen={onOpen}
        />
      ))}
    </ul>
  );
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isDarkMode,
  onClose,
  className,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<FilterTab>('all');
  const { data, isLoading, isFetching, refetch } = useGetNotificationsQuery({ limit: 50 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const items = useSelector((s: RootState) => s.notification.notifications);

  React.useEffect(() => {
    if (data?.items) dispatch(setNotifications(data.items));
  }, [data?.items, dispatch]);

  const unreadItems = useMemo(() => items.filter((n) => !n.isRead), [items]);
  const hasUnread = unreadItems.length > 0;

  const handleOpen = (item: INotification) => {
    if (!item.isRead) {
      dispatch(markAsRead(item.notificationId));
      void markRead(item.notificationId);
    }
    onClose();
    navigateFromNotification(navigate, item);
  };

  const handleMarkAll = async () => {
    if (!hasUnread) return;
    dispatch(markAllAsRead());
    try {
      await markAllRead().unwrap();
      void refetch();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-base font-semibold text-foreground">Thông báo</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs shrink-0 max-w-[50%] truncate"
          disabled={!hasUnread || markingAll}
          onClick={() => void handleMarkAll()}
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as FilterTab)}
        className="flex flex-col flex-1 min-h-0 gap-0"
      >
        <div className="px-4 py-2 border-b border-border shrink-0">
          <TabsList className="w-full grid grid-cols-2 h-8">
            <TabsTrigger value="all" className="text-xs">
              Tất cả
              {items.length > 0 ? (
                <span className="ml-1 text-muted-foreground">({items.length})</span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Chưa đọc
              {unreadItems.length > 0 ? (
                <span className="ml-1 text-red-500 font-semibold">({unreadItems.length})</span>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-[min(70vh,22rem)]">
            {isLoading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Đang tải…</p>
            ) : (
              <NotificationList
                items={items}
                isDarkMode={isDarkMode}
                onOpen={handleOpen}
                emptyLabel="Chưa có thông báo"
              />
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="unread" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-[min(70vh,22rem)]">
            {isLoading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Đang tải…</p>
            ) : (
              <NotificationList
                items={unreadItems}
                isDarkMode={isDarkMode}
                onOpen={handleOpen}
                emptyLabel="Không còn thông báo chưa đọc"
              />
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {isFetching && items.length > 0 ? (
        <p className="text-[10px] text-center text-muted-foreground py-1 border-t border-border">
          Đang cập nhật…
        </p>
      ) : null}
    </div>
  );
};
