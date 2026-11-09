import { useRouter } from 'expo-router';
import { goBackOr } from '@shared/ui';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationStream,
  useNotifications,
  type NotificationItem,
} from '@entities/notification';
import { Skeleton } from '@shared/ui/skeleton';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Inbox: newest first. Tapping a report notification marks it read and opens the report.
export function NotificationCenter() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  useNotificationStream();

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const hasUnread = items.some((item) => item.read_at === null);

  function open(item: NotificationItem) {
    // Already read: it was opened before, so a tap does not open the report again.
    if (item.read_at !== null) return;
    markRead.mutate(item.id);
    if (item.report_id) {
      // A finished analysis opens its interpretation; other report notifications open the review.
      const route = item.type === 'REPORT_DONE' ? '/(app)/reports/interpretation/[id]' : '/(app)/reports/[id]';
      router.push({ pathname: route, params: { id: item.report_id } });
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top, 20) + 8, paddingBottom: Math.max(insets.bottom, 20) + 16 },
      ]}>
      <View style={styles.headerBar}>
        <Pressable accessibilityRole="button" onPress={() => goBackOr(router, '/(app)/(tabs)/dashboard')} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable
          accessibilityRole="button"
          disabled={!hasUnread || markAll.isPending}
          onPress={() => markAll.mutate()}
          style={styles.backBtn}>
          <Text style={[styles.markAll, !hasUnread && styles.disabled]}>All read</Text>
        </Pressable>
      </View>

      {list.isPending ? (
        <>
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </>
      ) : null}

      {list.isError ? <Text style={styles.error}>We could not load your notifications.</Text> : null}

      {!list.isPending && items.length === 0 ? <Text style={styles.empty}>No notifications yet.</Text> : null}

      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={() => open(item)}
          style={[styles.card, item.read_at === null && styles.cardUnread]}>
          <View style={styles.cardTop}>
            {item.read_at === null ? <View style={styles.dot} /> : null}
            <Text style={styles.title}>{item.title}</Text>
          </View>
          {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
          <Text style={styles.when}>{formatWhen(item.created_at)}</Text>
        </Pressable>
      ))}

      {list.hasNextPage ? (
        <Pressable
          accessibilityRole="button"
          disabled={list.isFetchingNextPage}
          onPress={() => void list.fetchNextPage()}
          style={styles.more}>
          <Text style={styles.moreText}>{list.isFetchingNextPage ? 'Loading...' : 'Load more'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 12, backgroundColor: '#FFFFFF', flexGrow: 1 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  backBtn: { minWidth: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: '#171717', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#171717' },
  markAll: { fontSize: 13, fontWeight: '600', color: '#7545ED' },
  disabled: { color: '#B8B3C7' },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#ECEAEF', gap: 6 },
  cardUnread: { backgroundColor: '#F8F5FF', borderColor: '#D9CCFA' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7545ED' },
  title: { fontSize: 15, fontWeight: '700', color: '#171717' },
  body: { fontSize: 14, lineHeight: 20, color: '#3B3F47' },
  when: { fontSize: 12, color: '#8E929A' },
  empty: { fontSize: 14, color: '#8E929A', textAlign: 'center', marginTop: 32 },
  error: { fontSize: 14, color: '#C22F43', textAlign: 'center', marginTop: 32 },
  more: { alignItems: 'center', paddingVertical: 12 },
  moreText: { fontSize: 14, fontWeight: '600', color: '#7545ED' },
});
