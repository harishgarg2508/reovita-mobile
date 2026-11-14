import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@shared/ui/theme';

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

// Inbox: newest first. The header stays fixed; only the list scrolls. The next page (10 items)
// loads when the user reaches the end of the list.
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

  function loadMore() {
    if (list.hasNextPage && !list.isFetchingNextPage) {
      void list.fetchNextPage();
    }
  }

  const p = usePalette();
  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      {/* Fixed header: does not scroll with the list. */}
      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: p.text }]}>Notifications</Text>
        <Pressable
          accessibilityRole="button"
          disabled={!hasUnread || markAll.isPending}
          onPress={() => markAll.mutate()}
          style={styles.allReadBtn}>
          {markAll.isPending ? (
            <View style={styles.inlineRow}>
              <ActivityIndicator size="small" color={p.accent} />
              <Text style={[styles.markAll, { color: p.accent }]}>Marking...</Text>
            </View>
          ) : (
            <Text style={[styles.markAll, { color: p.accent }, !hasUnread && styles.disabled]}>All read</Text>
          )}
        </Pressable>
      </View>

      {list.isPending ? (
        <View style={styles.gutter}>
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      ) : null}

      {list.isError ? <Text style={[styles.error, styles.gutter]}>We could not load your notifications.</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          list.isPending || list.isError ? undefined : <Text style={[styles.empty, { color: p.muted }]}>No notifications yet.</Text>
        }
        ListFooterComponent={
          list.isFetchingNextPage ? <ActivityIndicator color="#1F6F3F" style={styles.footer} /> : undefined
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => open(item)}
            style={[styles.card, { backgroundColor: p.card, borderColor: p.border }, item.read_at === null && { backgroundColor: p.accentSoft, borderColor: p.accent }]}>
            <View style={styles.cardTop}>
              {item.read_at === null ? <View style={[styles.dot, { backgroundColor: p.accent }]} /> : null}
              <Text style={[styles.title, { color: p.text }]}>{item.title}</Text>
            </View>
            {item.body ? <Text style={[styles.body, { color: p.muted }]}>{item.body}</Text> : null}
            <Text style={[styles.when, { color: p.muted }]}>{formatWhen(item.created_at)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  gutter: { paddingHorizontal: 24, gap: 12 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  allReadBtn: { minWidth: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#171717' },
  markAll: { fontSize: 13, fontWeight: '600', color: '#1F6F3F' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  disabled: { color: '#B8B3C7' },
  list: { paddingHorizontal: 24, paddingTop: 4 },
  separator: { height: 12 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#ECEAEF', gap: 6 },
  cardUnread: { backgroundColor: '#F8F5FF', borderColor: '#DCD3F5' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1F6F3F' },
  title: { fontSize: 15, fontWeight: '700', color: '#171717', flexShrink: 1 },
  body: { fontSize: 14, color: '#3C3A46' },
  when: { fontSize: 12, color: '#8A8694' },
  empty: { fontSize: 14, color: '#8A8694', textAlign: 'center', marginTop: 32 },
  error: { fontSize: 13, color: '#C22F43' },
  footer: { paddingVertical: 16 },
});
