import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapConfirm, tapSelection, useScrollToTopOnFocus } from '@shared/lib';
import { PullIndicator, RefreshingBar, usePullToRefresh } from '@shared/ui/pull-to-refresh';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { useFriendRequests, useMyHandle, type SocialFriendRequest, SocialAvatar } from '@entities/social';

import { SOCIAL_HOME, socialProfileHref } from '../model/routes';
import { useAnswerFriendRequest, useFriendHandle } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

type Tab = 'incoming' | 'outgoing';

// Friend requests. Received: people who sent me a friend request, with Accept and Decline. Sent: the requests I made that still wait, which I can take
// back. A page at a time with infinite scroll; pull down to load again. The spinner shows only in the list.
export function RequestsScreen() {
  const p = usePalette();
  const scrollRef = useRef<FlatList>(null);
  useScrollToTopOnFocus(scrollRef);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const [tab, setTab] = useState<Tab>('incoming');
  const incoming = useFriendRequests('incoming', me.joined);
  const outgoing = useFriendRequests('outgoing', me.joined);
  const list = tab === 'incoming' ? incoming : outgoing;
  const answer = useAnswerFriendRequest();
  const friend = useFriendHandle();
  const pullRefresh = usePullToRefresh(() => list.refetch());

  // Loaded again each time the screen comes back, so a request that arrived meanwhile is never missing.
  const listRef = useRef(list);
  useEffect(() => {
    listRef.current = list;
  });
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) first.current = false;
      else void listRef.current.refetch();
    }, []),
  );

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const totalIncoming = incoming.data?.pages[0]?.total ?? 0;
  const totalOutgoing = outgoing.data?.pages[0]?.total ?? 0;

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => goBackOr(router, SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Friend Requests</Text>
        <View style={styles.spacer} />
      </View>

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <>
          {/* Segmented Switch for Received & Sent */}
          <View style={[styles.switchContainer, { backgroundColor: p.surface, borderColor: p.border }]}>
            {(
              [
                ['incoming', `Received${totalIncoming ? ` (${totalIncoming})` : ''}`],
                ['outgoing', `Sent${totalOutgoing ? ` (${totalOutgoing})` : ''}`],
              ] as const
            ).map(([key, label]) => {
              const active = tab === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    tapSelection();
                    setTab(key);
                  }}
                  style={[styles.switchItem, active && [styles.switchItemActive, { backgroundColor: p.card }]]}>
                  <Text style={[styles.switchText, { color: active ? p.text : p.muted }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <PullIndicator pull={pullRefresh.pull} busy={pullRefresh.busy} />
          <RefreshingBar active={list.isFetching && !list.isFetchingNextPage && items.length > 0} />
          <FlatList
            ref={scrollRef}
            {...pullRefresh.listProps}
            {...pullRefresh.touch}
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
            }}
            refreshing={list.isRefetching && !list.isFetchingNextPage}
            onRefresh={() => void list.refetch()}
            renderItem={({ item }) => (
              <RequestRow
                item={item}
                busy={(answer.isPending && answer.variables?.id === item.id) || (friend.isPending && friend.variables?.handle === item.handle)}
                onOpen={() => router.push(socialProfileHref(item.handle))}
                onAccept={() => {
                  tapConfirm();
                  answer.mutate({ id: item.id, accept: true });
                }}
                onDeny={() => answer.mutate({ id: item.id, accept: false })}
                onCancel={() => friend.mutate({ handle: item.handle, add: false, requested: true })}
              />
            )}
            ListEmptyComponent={
              list.isPending ? (
                <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} />
              ) : list.isError ? (
                <Text style={[styles.empty, { color: p.muted }]}>Could not load the requests. Pull down to try again.</Text>
              ) : (
                <View style={styles.emptyBox}>
                  <Ionicons name="people-outline" size={34} color={p.muted} />
                  <Text style={[styles.emptyTitle, { color: p.text }]}>{tab === 'incoming' ? 'No requests waiting' : 'No requests sent'}</Text>
                  <Text style={[styles.empty, { color: p.muted }]}>
                    {tab === 'incoming' ? 'When someone sends you a friend request, you can accept or decline it here.' : 'When you send a friend request and the person has not answered yet, it shows here.'}
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

function RequestRow({
  item,
  busy,
  onOpen,
  onAccept,
  onDeny,
  onCancel,
}: {
  item: SocialFriendRequest;
  busy: boolean;
  onOpen: () => void;
  onAccept: () => void;
  onDeny: () => void;
  onCancel: () => void;
}) {
  const p = usePalette();
  return (
    <View style={[styles.row, { backgroundColor: p.card, borderColor: p.border }]}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.who}>
        <SocialAvatar handle={item.handle} hasAvatar={item.has_avatar} size={44} />
        <View style={styles.names}>
          <Text numberOfLines={1} style={[styles.name, { color: p.text }]}>{item.display_name || `@${item.handle}`}</Text>
          <Text numberOfLines={1} style={[styles.sub, { color: p.muted }]}>@{item.handle} · {timeAgo(item.created_at)}</Text>
        </View>
      </Pressable>
      {item.direction === 'incoming' ? (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Accept" disabled={busy} onPress={onAccept} style={[styles.accept, { backgroundColor: p.accent }]}>
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.acceptText}>Accept</Text>
              </View>
            )}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Decline" disabled={busy} onPress={onDeny} style={[styles.deny, { borderColor: p.border, backgroundColor: p.surface }]}>
            <Text style={[styles.denyText, { color: p.text }]}>Decline</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel request" disabled={busy} onPress={onCancel} style={[styles.deny, { borderColor: p.border, backgroundColor: p.surface }]}>
          <Text style={[styles.denyText, { color: p.text }]}>{busy ? '...' : 'Withdraw'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontWeight: '800' },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  switchContainer: { flexDirection: 'row', borderWidth: 1, borderRadius: 20, padding: 3, marginHorizontal: 16, marginBottom: 12 },
  switchItem: { flex: 1, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  switchItemActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  switchText: { fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 18, padding: 12 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  names: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 6 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accept: { minWidth: 78, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  acceptText: { fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' },
  deny: { height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  denyText: { fontSize: 12.5, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 50, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  empty: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 },
});
