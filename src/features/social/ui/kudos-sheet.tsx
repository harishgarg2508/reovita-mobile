import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@shared/ui/bottom-sheet';
import { usePalette } from '@shared/ui/theme';
import { useSocialKudos, type SocialKudosPerson, type SocialPost } from '@entities/social';

import { friendIsQuiet, friendLabel, friendTap } from '../model/friend-button';
import { useFriendHandle } from '../model/use-social-actions';

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Who gave kudos to one of my posts, in the swipe-down bottom drawer. A page at a time as the list is scrolled; each person can be followed
// or opened from here. Only the author of the post opens this (the server refuses anyone else).
export function KudosSheet({ post, onClose, onOpenProfile }: { post: SocialPost | null; onClose: () => void; onOpenProfile?: (handle: string) => void }) {
  const p = usePalette();
  const list = useSocialKudos(post?.id ?? '', post !== null);
  const friend = useFriendHandle();
  const people = list.data?.pages.flatMap((page) => page.items) ?? [];

  function open(person: SocialKudosPerson) {
    onClose();
    onOpenProfile?.(person.handle);
  }

  return (
    <BottomSheet visible={post !== null} onClose={onClose} dragHandleOnly>
      <Text style={[styles.title, { color: p.text }]}>Kudos{post ? ` · ${post.kudos_count}` : ''}</Text>
      <FlatList
        data={people}
        keyExtractor={(person) => person.handle}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: p.border }]} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={() => open(item)} style={styles.who}>
              <View style={[styles.avatar, { backgroundColor: p.accentSoft }]}>
                <Text style={[styles.avatarText, { color: p.accent }]}>{item.handle.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.names}>
                <Text numberOfLines={1} style={[styles.name, { color: p.text }]}>{item.display_name || `@${item.handle}`}</Text>
                <Text numberOfLines={1} style={[styles.sub, { color: p.muted }]}>@{item.handle} · {timeAgo(item.given_at)}</Text>
              </View>
            </Pressable>
            {item.is_me ? null : (
              <Pressable
                accessibilityRole="button"
                disabled={friend.isPending && friend.variables?.handle === item.handle}
                onPress={() => friend.mutate(friendTap(item))}
                style={[styles.button, friendIsQuiet(item) ? { borderColor: p.border, borderWidth: 1 } : { backgroundColor: p.accent }]}>
                <Text style={[styles.buttonText, { color: friendIsQuiet(item) ? p.text : '#FFFFFF' }]}>{friendLabel(item)}</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          list.isPending ? (
            <ActivityIndicator color={p.accent} style={{ marginVertical: 28 }} />
          ) : list.isError ? (
            <Text style={[styles.empty, { color: p.muted }]}>Could not load the list. Close this and try again.</Text>
          ) : (
            <Text style={[styles.empty, { color: p.muted }]}>No kudos yet.</Text>
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={p.accent} style={{ marginVertical: 12 }} /> : undefined}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '800' },
  // Tall enough for about six people, then it scrolls.
  list: { maxHeight: 340 },
  sep: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800' },
  names: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12.5 },
  button: { minWidth: 92, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  buttonText: { fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', fontSize: 14, marginVertical: 28 },
});
