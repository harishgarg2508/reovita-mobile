import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PullIndicator, RefreshingBar, usePullToRefresh } from '@shared/ui/pull-to-refresh';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { useSocialFriendsOf, type SocialPerson } from '@entities/social';

import { friendIsQuiet, friendLabel, friendTap } from '../model/friend-button';
import { SOCIAL_HOME, socialProfileHref } from '../model/routes';
import { useFriendHandle } from '../model/use-social-actions';

// The friends of a person, opened by tapping the Friends count on their page. A page at a time, with a button on each row so people can send a
// friend request from here.
export function FriendsScreen({ handle }: { handle: string }) {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useSocialFriendsOf(handle);
  const friend = useFriendHandle();
  const pullRefresh = usePullToRefresh(() => list.refetch());

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => goBackOr(router, SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: p.text }]}>Friends</Text>
          <Text numberOfLines={1} style={[styles.sub, { color: p.muted }]}>@{handle}</Text>
        </View>
        <View style={styles.spacer} />
      </View>

      <PullIndicator pull={pullRefresh.pull} busy={pullRefresh.busy} />
      <RefreshingBar active={list.isFetching && !list.isFetchingNextPage && items.length > 0} />
      <FlatList
        {...pullRefresh.listProps}
        {...pullRefresh.touch}
        data={items}
        keyExtractor={(person) => person.handle}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: p.border }]} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        renderItem={({ item }) => (
          <PersonRow
            person={item}
            busy={friend.isPending && friend.variables?.handle === item.handle}
            onOpen={() => router.push(socialProfileHref(item.handle))}
            onToggle={() => friend.mutate(friendTap(item))}
          />
        )}
        ListEmptyComponent={
          list.isPending ? (
            <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} />
          ) : list.isError ? (
            <Text style={[styles.empty, { color: p.muted }]}>Could not load this list. Pull down to try again.</Text>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyTitle, { color: p.text }]}>No friends yet</Text>
            </View>
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={p.accent} style={{ marginTop: 16 }} /> : undefined}
      />
    </View>
  );
}

function PersonRow({ person, busy, onOpen, onToggle }: { person: SocialPerson; busy: boolean; onOpen: () => void; onToggle: () => void }) {
  const p = usePalette();
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.who}>
        <View style={[styles.avatar, { backgroundColor: p.accentSoft }]}>
          <Text style={[styles.avatarText, { color: p.accent }]}>{person.handle.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.names}>
          <Text numberOfLines={1} style={[styles.name, { color: p.text }]}>{person.display_name || `@${person.handle}`}</Text>
          <Text numberOfLines={1} style={[styles.handle, { color: p.muted }]}>@{person.handle}{person.is_me ? ' · you' : ''}</Text>
        </View>
      </Pressable>
      {person.is_me ? null : (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onToggle}
          style={[styles.button, friendIsQuiet(person) ? { borderColor: p.border, borderWidth: 1 } : { backgroundColor: p.accent }]}>
          {busy ? (
            <ActivityIndicator size="small" color={friendIsQuiet(person) ? p.accent : '#FFFFFF'} />
          ) : (
            <Text style={[styles.buttonText, { color: friendIsQuiet(person) ? p.text : '#FFFFFF' }]}>{friendLabel(person)}</Text>
          )}
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
  titleBox: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 12 },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  sep: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  names: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '800' },
  handle: { fontSize: 12.5 },
  button: { minWidth: 96, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  buttonText: { fontSize: 13, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 50 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
});
