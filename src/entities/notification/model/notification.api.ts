import { api } from '@shared/api';

export type NotificationType = 'REPORT_READY' | 'REPORT_NEEDS_RETAKE' | 'REPORT_FAILED' | string;

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  report_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPage {
  page: number;
  limit: number;
  has_more: boolean;
  items: NotificationItem[];
}

export async function fetchNotificationPage(page: number): Promise<NotificationPage> {
  const { data } = await api.get<NotificationPage>('/v1/notifications', { params: { page, limit: 10 } });
  return data;
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<{ unread: number }>('/v1/notifications/unread-count');
  return data.unread;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/v1/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/v1/notifications/read-all');
}
