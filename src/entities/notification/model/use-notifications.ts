import { useEffect, useState } from 'react';
import EventSource from 'react-native-sse';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAccessToken } from '@shared/api';
import { API_URL } from '@shared/config/environment';

import {
  fetchNotificationPage,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from './notification.api';

export const NOTIFICATION_KEYS = {
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
};

// The inbox, loaded 10 at a time.
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: NOTIFICATION_KEYS.list,
    queryFn: ({ pageParam }) => fetchNotificationPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.has_more ? last.page + 1 : undefined),
  });
}

export function useUnreadCount() {
  return useQuery({ queryKey: NOTIFICATION_KEYS.unread, queryFn: fetchUnreadCount });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.list });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unread });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.list });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unread });
    },
  });
}

// Live notifications over the server's event stream. A new one refreshes the inbox and the unread count,
// so the bell and the list update without a reload. The stream stays open while the hook is mounted.
export function useNotificationStream(): { latest: NotificationItem | null } {
  const queryClient = useQueryClient();
  const [latest, setLatest] = useState<NotificationItem | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const source = new EventSource<'notification'>(`${API_URL}/v1/notifications/stream`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    });
    source.addEventListener('notification', (event) => {
      if (!event.data) return;
      setLatest(JSON.parse(event.data) as NotificationItem);
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.list });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unread });
    });
    return () => source.close();
  }, [queryClient]);

  return { latest };
}
