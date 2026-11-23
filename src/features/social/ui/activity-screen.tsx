import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { tapConfirm, tapSelection, useScrollToTopOnFocus } from '@shared/lib';
import { PullIndicator, RefreshingBar, usePullToRefresh } from '@shared/ui/pull-to-refresh';
import { usePalette } from '@shared/ui/theme';
import { useMyHandle, useSocialNotifications, useSocialUnread, type SocialNotification, SocialAvatar } from '@entities/social';

import { SOCIAL_HOME, socialProfileHref, socialRoute } from '../model/routes';
import { useMarkAllSocialRead, useMarkSocialRead } from '../model/use-social-actions';

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// The day group a notification belongs to: Today, Yesterday, This week or Earlier.
function dayGroup(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'Today';
  if (days < 2) return 'Yesterday';
  if (days < 7) return 'This week';
  return 'Earlier';
}

type Row = { kind: 'label'; key: string; label: string } | { kind: 'item'; key: string; item: SocialNotification };

function groupRows(items: SocialNotification[]): Row[] {
  const rows: Row[] = [];
  let last = '';
  for (const item of items) {
    const group = dayGroup(item.created_at);
    if (group !== last) {
      rows.push({ kind: 'label', key: `label-${group}`, label: group });
      last = group;
    }
    rows.push({ kind: 'item', key: item.id, item });
  }
  return rows;
}

function getNotificationMeta(type: string) {
  switch (type) {
    case 'kudos':
      return { icon: 'heart' as const, color: '#F43F5E' };
    case 'comment':
      return { icon: 'chatbubble' as const, color: '#3B82F6' };
    case 'reply':
      return { icon: 'arrow-undo' as const, color: '#3B82F6' };
    case 'nudge':
      return { icon: 'hand-left' as const, color: '#F59E0B' };
    case 'pod_invite':
      return { icon: 'shield-checkmark' as const, color: '#10B981' };
    case 'challenge_invite':
      return { icon: 'map' as const, color: '#0EA5E9' };
    case 'request_accepted':
      return { icon: 'checkmark-circle' as const, color: '#8B5CF6' };
    default:
      return { icon: 'person-add' as const, color: '#8B5CF6' };
  }
}

// The social's own notifications, apart from the report notifications: someone accepted your friend request, or gave kudos to your post. Newest first, a
// page at a time. Opening one marks it read and goes to the person (an accepted request) or to your own page (kudos on your post).
export function ActivityScreen() {
  const p = usePalette();
  const scrollRef = useRef<FlatList>(null);
  useScrollToTopOnFocus(scrollRef);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const list = useSocialNotifications(me.joined);
  const pullRefresh = usePullToRefresh(() => list.refetch());
  const markRead = useMarkSocialRead();
  const markAll = useMarkAllSocialRead();
  const requests = useSocialUnread(me.joined).data?.requests ?? 0;

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const hasUnread = items.some((item) => !item.read);
  const rows = groupRows(items);

  function open(item: SocialNotification) {
    tapSelection();
    if (!item.read) markRead.mutate(item.id);
    if (item.type === 'pod_invite') {
      router.push(socialRoute('/social/pods'));
      return;
    }
    if (item.type === 'challenge_invite') {
      router.push(socialRoute('/social/journeys'));
      return;
    }
    router.push(socialProfileHref((item.type === 'kudos' || item.type === 'comment' || item.type === 'reply') && me.data ? me.data.handle : item.handle));
  }

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => goBackOr(router, SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Activity</Text>
        <Pressable
          accessibilityRole="button"
          disabled={!hasUnread || markAll.isPending}
          onPress={() => {
            tapConfirm();
            markAll.mutate();
          }}
          hitSlop={8}
          style={styles.allRead}>
          <Text style={[styles.allReadText, { color: p.accent }, !hasUnread && { opacity: 0.4 }]}>{markAll.isPending ? 'Marking...' : 'All read'}</Text>
        </Pressable>
      </View>

      <PullIndicator pull={pullRefresh.pull} busy={pullRefresh.busy} />
      <RefreshingBar active={list.isFetching && !list.isFetchingNextPage && items.length > 0} />
      <FlatList
        ref={scrollRef}
        {...pullRefresh.listProps}
        {...pullRefresh.touch}
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        renderItem={({ item: row }) => {
          if (row.kind === 'label') return <Text style={[styles.groupLabel, { color: p.muted }]}>{row.label}</Text>;
          const item = row.item;
          const name = item.display_name || `@${item.handle}`;
          const meta = getNotificationMeta(item.type);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => open(item)}
              style={[styles.row, { backgroundColor: item.read ? 'transparent' : p.accentSoft }]}>
              {/* Avatar with Floating Event Icon */}
              <View style={styles.avatarBox}>
                <SocialAvatar handle={item.handle} hasAvatar={false} size={46} />
                <View style={[styles.miniBadge, { backgroundColor: meta.color }]}>
                  <Ionicons name={meta.icon} size={11} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.text}>
                <Text style={[styles.line, { color: p.text }]}>
                  <Text style={styles.strong}>{name}</Text>
                  {item.type === 'kudos'
                    ? ' gave kudos to your post'
                    : item.type === 'comment'
                      ? ' commented on your post'
                      : item.type === 'reply'
                        ? ' replied to your comment'
                        : item.type === 'nudge'
                          ? ' sent you a check-in nudge'
                          : item.type === 'pod_invite'
                            ? ' invited you to an accountability pod'
                            : item.type === 'challenge_invite'
                              ? ' invited you on a journey'
                              : item.type === 'request_accepted'
                              ? ' accepted your friend request'
                              : ' sent you a friend request'}
                </Text>
                {(item.type === 'kudos' || item.type === 'comment' || item.type === 'reply') && item.post_preview ? (
                  <Text numberOfLines={1} style={[styles.preview, { color: p.muted }]}>{item.post_preview}</Text>
                ) : null}
              </View>

              <View style={styles.side}>
                <Text style={[styles.when, { color: p.muted }]}>{timeAgo(item.created_at)}</Text>
                {!item.read ? <View style={[styles.unreadDot, { backgroundColor: p.accent }]} /> : null}
              </View>
            </Pressable>
          );
        }}
        ListHeaderComponent={
          <View style={styles.tiles}>
            <Pressable accessibilityRole="button" onPress={() => router.push(socialRoute('/social/requests'))} style={[styles.tile, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={[styles.tileIcon, { backgroundColor: p.accentSoft }]}>
                <Ionicons name="people" size={19} color={p.accent} />
                {requests > 0 ? (
                  <View style={[styles.tileBadge, { backgroundColor: p.accent }]}>
                    <Text style={styles.tileBadgeText}>{requests > 9 ? '9+' : requests}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.tileTitle, { color: p.text }]}>Friend requests</Text>
              <Text numberOfLines={1} style={[styles.tileSub, { color: p.muted }]}>{requests > 0 ? `${requests} waiting` : 'Received and sent'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push(socialRoute('/social/kudos'))} style={[styles.tile, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={[styles.tileIcon, { backgroundColor: '#FDE8EC' }]}>
                <Ionicons name="heart" size={19} color="#F43F5E" />
              </View>
              <Text style={[styles.tileTitle, { color: p.text }]}>Kudos you got</Text>
              <Text numberOfLines={1} style={[styles.tileSub, { color: p.muted }]}>Who cheered your posts</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          list.isPending ? (
            <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} />
          ) : list.isError ? (
            <Text style={[styles.empty, { color: p.muted }]}>Could not load your activity. Pull down to try again.</Text>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-outline" size={32} color={p.muted} />
              <Text style={[styles.emptyTitle, { color: p.text }]}>No activity yet</Text>
              <Text style={[styles.empty, { color: p.muted }]}>When someone gives kudos to your posts, nudges your habits, or accepts your friend request, you will see it here.</Text>
            </View>
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={p.accent} style={{ marginTop: 16 }} /> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  allRead: { minWidth: 56, alignItems: 'flex-end' },
  allReadText: { fontSize: 13.5, fontWeight: '700' },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 11 },
  side: { alignItems: 'flex-end', gap: 6, minWidth: 28 },
  groupLabel: { fontSize: 12.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 4, marginHorizontal: 4 },
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 20, padding: 14, gap: 3 },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileBadge: { position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tileBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' },
  tileTitle: { fontSize: 14, fontWeight: '800' },
  tileSub: { fontSize: 12 },
  avatarBox: { position: 'relative' },
  miniBadge: { position: 'absolute', right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  line: { fontSize: 14, lineHeight: 19 },
  strong: { fontWeight: '800' },
  preview: { fontSize: 12 },
  when: { fontSize: 12, fontWeight: '600' },
  unreadDot: { width: 9, height: 9, borderRadius: 4.5 },
  emptyBox: { alignItems: 'center', paddingTop: 50, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  empty: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 4, paddingHorizontal: 24 },
});
