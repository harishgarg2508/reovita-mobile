import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PullIndicator, RefreshingBar, usePullToRefresh } from '@shared/ui/pull-to-refresh';
import { usePalette } from '@shared/ui/theme';
import { useMyHandle, useReceivedKudos, type SocialReceivedKudos } from '@entities/social';

import { SOCIAL_HOME, socialProfileHref } from '../model/routes';
import { friendIsQuiet, friendLabel, friendTap } from '../model/friend-button';
import { useFriendHandle, useMarkAllSocialRead } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { SOCIAL_DOCK_SPACE, SocialDock } from './social-dock';

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// The Kudos item of the dock: every kudos my posts have received, newest first, each with who gave it and which post it was for. A page at a
// time with infinite scroll; pull down to load it again. The loading spinner shows only in the list, never over the whole screen.
export function KudosScreen() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const list = useReceivedKudos(me.joined);
  const friend = useFriendHandle();
  const clearBadge = useMarkAllSocialRead('kudos');

  // Opening the screen shows the kudos, so the red badge on the dock goes away.
  const clearRef = useRef(clearBadge.mutate);
  useFocusEffect(
    useCallback(() => {
      clearRef.current();
    }, []),
  );

  // Loaded again each time the screen comes back, so it is never stale.
  const listRef = useRef(list);
  useFocusEffect(
    useCallback(() => {
      listRef.current = list;
    }, [list]),
  );
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) first.current = false;
      else void listRef.current.refetch();
    }, []),
  );
  const pullRefresh = usePullToRefresh(() => list.refetch());

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => router.replace(SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: p.text }]}>Kudos</Text>
          <Text style={[styles.sub, { color: p.muted }]}>{total} {total === 1 ? 'kudos' : 'kudos'} on your posts</Text>
        </View>
        <View style={styles.spacer} />
      </View>

      {me.notJoined ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <>
          <PullIndicator pull={pullRefresh.pull} busy={pullRefresh.busy} />
          <RefreshingBar active={list.isFetching && !list.isFetchingNextPage && items.length > 0} />
          <FlatList
            {...pullRefresh.listProps}
            {...pullRefresh.touch}
            data={items}
            keyExtractor={(item) => `${item.post_id}:${item.handle}`}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + SOCIAL_DOCK_SPACE + 16 }]}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
            }}
            refreshing={list.isRefetching && !list.isFetchingNextPage}
            onRefresh={() => void list.refetch()}
            renderItem={({ item }) => <KudosRow item={item} busy={friend.isPending && friend.variables?.handle === item.handle} onOpen={() => router.push(socialProfileHref(item.handle))} onFriend={() => friend.mutate(friendTap(item))} />}
            ListEmptyComponent={
              list.isPending ? (
                <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} />
              ) : list.isError ? (
                <Text style={[styles.empty, { color: p.muted }]}>Could not load your kudos. Pull down to try again.</Text>
              ) : (
                <View style={styles.emptyBox}>
                  <Ionicons name="heart-outline" size={34} color={p.muted} />
                  <Text style={[styles.emptyTitle, { color: p.text }]}>No kudos yet</Text>
                  <Text style={[styles.empty, { color: p.muted }]}>When someone gives kudos to one of your posts, you will see who it was here.</Text>
                </View>
              )
            }
            ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={p.accent} style={{ marginTop: 16 }} /> : undefined}
          />
        </>
      )}

      <SocialDock active="kudos" />
    </View>
  );
}

function KudosRow({ item, busy, onOpen, onFriend }: { item: SocialReceivedKudos; busy: boolean; onOpen: () => void; onFriend: () => void }) {
  const p = usePalette();
  const name = item.display_name || `@${item.handle}`;
  return (
    <View style={[styles.row, { backgroundColor: p.card, borderColor: p.border }]}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.who}>
        <View style={[styles.avatar, { backgroundColor: p.accentSoft }]}>
          <Text style={[styles.avatarText, { color: p.accent }]}>{item.handle.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.text}>
          <Text style={[styles.line, { color: p.text }]}>
            <Text style={styles.strong}>{name}</Text> gave kudos
          </Text>
          {item.post_preview ? <Text numberOfLines={1} style={[styles.preview, { color: p.muted }]}>“{item.post_preview}”</Text> : null}
          <Text style={[styles.when, { color: p.muted }]}>@{item.handle} · {timeAgo(item.given_at)}</Text>
        </View>
      </Pressable>
      {item.is_friend ? null : (
        <Pressable accessibilityRole="button" disabled={busy} onPress={onFriend} style={[styles.friendBtn, friendIsQuiet(item) ? { borderColor: p.border, borderWidth: 1 } : { backgroundColor: p.accent }]}>
          <Text style={[styles.friendBtnText, friendIsQuiet(item) && { color: p.text }]}>{friendLabel(item)}</Text>
        </Pressable>
      )}
      <Ionicons name="heart" size={16} color={p.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  // Keeps the title in the middle without drawing anything on the right.
  spacer: { width: 40, height: 40 },
  titleBox: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 12 },
  gutter: { paddingHorizontal: 16, paddingTop: 12 },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 18, padding: 12 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  line: { fontSize: 14, lineHeight: 19 },
  strong: { fontWeight: '800' },
  preview: { fontSize: 12.5 },
  when: { fontSize: 11.5 },
  friendBtn: { height: 32, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  friendBtnText: { fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' },
  emptyBox: { alignItems: 'center', paddingTop: 50, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  empty: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 },
});
