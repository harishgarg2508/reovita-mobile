import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryKeys } from '@shared/api';
import { PullIndicator, RefreshingBar, usePullToRefresh } from '@shared/ui/pull-to-refresh';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { useBlockedProfiles, useMyHandle, useReportedProfiles, type SocialBlockedProfile, type SocialReportedProfile } from '@entities/social';

import { SOCIAL_HOME, socialProfileHref } from '../model/routes';
import { useBlockHandle } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type Tab = 'blocked' | 'reported';

// Blocked and reported profiles, opened from the Blocked count on my own page. Two tabs: the people I blocked (with Unblock) and the people whose
// posts I reported (one row each, with how many times). Both lists are private to me. Each loads from the server every time it is opened, a page
// at a time, with a loader while it loads.
export function BlockedScreen() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const me = useMyHandle();
  const [tab, setTab] = useState<Tab>('blocked');
  const blocked = useBlockedProfiles(me.joined && tab === 'blocked');
  const reported = useReportedProfiles(me.joined && tab === 'reported');
  const list = tab === 'blocked' ? blocked : reported;
  const unblock = useBlockHandle();
  const pullRefresh = usePullToRefresh(() => list.refetch());

  // The two lists have different rows, so the pages are read as one shape: a row is blocked (it has blocked_at) or reported.
  const pages = (list.data?.pages ?? []) as { total: number; items: (SocialBlockedProfile | SocialReportedProfile)[] }[];
  const items = pages.flatMap((page) => page.items);
  const total = pages[0]?.total ?? 0;

  // A tab always loads from the server: its list is emptied first, so its loader shows and no old rows are seen.
  const selectTab = (next: Tab) => {
    if (next !== tab) void queryClient.resetQueries({ queryKey: next === 'blocked' ? queryKeys.social.blocked() : queryKeys.social.reported() });
    setTab(next);
  };

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => goBackOr(router, SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: p.text }]}>Blocked & reported</Text>
          <Text style={[styles.sub, { color: p.muted }]}>Only you can see these lists</Text>
        </View>
        <View style={styles.spacer} />
      </View>

      {me.notJoined ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <>
          <View style={[styles.tabs, { borderBottomColor: p.border }]}>
            {(
              [
                ['blocked', 'Blocked'],
                ['reported', 'Reported'],
              ] as const
            ).map(([key, label]) => (
              <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => selectTab(key)} style={[styles.tab, tab === key && { borderBottomColor: p.accent }]}>
                <Text style={[styles.tabText, { color: tab === key ? p.accent : p.muted }, tab === key && styles.tabTextOn]}>
                  {label}
                  {tab === key && total > 0 ? ` · ${total}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>

          <PullIndicator pull={pullRefresh.pull} busy={pullRefresh.busy} />
          <RefreshingBar active={list.isFetching && !list.isFetchingNextPage && items.length > 0} />
          <FlatList
            {...pullRefresh.listProps}
            {...pullRefresh.touch}
            data={items}
            keyExtractor={(item) => item.handle}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
            }}
            refreshing={list.isRefetching && !list.isFetchingNextPage}
            onRefresh={() => void list.refetch()}
            renderItem={({ item }) => {
              const isBlockedRow = 'blocked_at' in item;
              return (
                <View style={[styles.row, { backgroundColor: p.card, borderColor: p.border }]}>
                  <Pressable
                    accessibilityRole="button"
                    // A blocked person's page is closed to me, so only a reported person can be opened.
                    disabled={isBlockedRow}
                    onPress={() => router.push(socialProfileHref(item.handle))}
                    style={styles.who}>
                    <View style={[styles.avatar, { backgroundColor: p.accentSoft }]}>
                      <Text style={[styles.avatarText, { color: p.accent }]}>{item.handle.slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={styles.names}>
                      <Text numberOfLines={1} style={[styles.name, { color: p.text }]}>{item.display_name || `@${item.handle}`}</Text>
                      <Text numberOfLines={1} style={[styles.handle, { color: p.muted }]}>
                        @{item.handle} · {'blocked_at' in item ? `blocked ${timeAgo(item.blocked_at)}` : `reported ${item.reports} ${item.reports === 1 ? 'time' : 'times'}, ${timeAgo(item.last_reported_at)}`}
                      </Text>
                    </View>
                  </Pressable>
                  {isBlockedRow ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Unblock @${item.handle}`}
                      disabled={unblock.isPending}
                      onPress={() => unblock.mutate({ handle: item.handle, block: false })}
                      style={[styles.action, { borderColor: p.border }]}>
                      {unblock.isPending && unblock.variables?.handle === item.handle ? <ActivityIndicator size="small" color={p.accent} /> : <Text style={[styles.actionText, { color: p.text }]}>Unblock</Text>}
                    </Pressable>
                  ) : (
                    <Ionicons name="flag-outline" size={18} color={p.muted} />
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              list.isPending ? (
                <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} />
              ) : list.isError ? (
                <Text style={[styles.empty, { color: p.muted }]}>Could not load this list. Pull down to try again.</Text>
              ) : (
                <View style={styles.emptyBox}>
                  <Ionicons name={tab === 'blocked' ? 'ban-outline' : 'flag-outline'} size={34} color={p.muted} />
                  <Text style={[styles.emptyTitle, { color: p.text }]}>{tab === 'blocked' ? 'No blocked profiles' : 'No reported profiles'}</Text>
                  <Text style={[styles.empty, { color: p.muted }]}>
                    {tab === 'blocked' ? 'People you block show here, and you can unblock them.' : 'People whose posts you report show here, with how many times.'}
                  </Text>
                </View>
              )
            }
            ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={p.accent} style={{ marginTop: 16 }} /> : undefined}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  spacer: { width: 40, height: 40 },
  titleBox: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 12 },
  gutter: { paddingHorizontal: 16, paddingTop: 12 },
  tabs: { flexDirection: 'row', gap: 22, borderBottomWidth: 1, marginHorizontal: 16, marginBottom: 12 },
  tab: { paddingVertical: 10, borderBottomWidth: 2.5, borderBottomColor: 'transparent', marginBottom: -1 },
  tabText: { fontSize: 14.5, fontWeight: '600' },
  tabTextOn: { fontWeight: '800' },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 18, padding: 12 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  names: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '800' },
  handle: { fontSize: 12 },
  action: { minWidth: 84, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  actionText: { fontSize: 12.5, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 50, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  empty: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 },
});
