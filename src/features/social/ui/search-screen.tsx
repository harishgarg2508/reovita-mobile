import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@shared/ui/theme';
import { useMyHandle, useSocialSearch, type SocialPerson } from '@entities/social';

import { SOCIAL_HOME, socialProfileHref } from '../model/routes';
import { friendIsQuiet, friendLabel, friendTap } from '../model/friend-button';
import { useFriendHandle } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { SOCIAL_DOCK_SPACE, SocialDock } from './social-dock';

// Suggestions start at this many letters, the same as the server.
const MIN_CHARS = 3;

// Search for people. From three letters, the people whose handle or name contains the text are listed as suggestions, alphabetical, ten at a
// time as the list is scrolled. Tapping one opens their page; each has an Add friend button. The loading spinner shows only in the list.
export function SearchScreen() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const friend = useFriendHandle();
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');

  const typed = text.trim().replace(/^@+/, '');
  // The search waits until the person pauses typing, so one request is sent, not one per letter.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(typed), 350);
    return () => clearTimeout(timer);
  }, [typed]);

  const ready = typed.length >= MIN_CHARS;
  const results = useSocialSearch(debounced, me.joined && debounced.length >= MIN_CHARS);
  const people = results.data?.pages.flatMap((page) => page.items) ?? [];
  // Letters were typed since the last search ran: the list shows its spinner, not the old people.
  const waiting = ready && (typed !== debounced || results.isPending);

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => router.replace(SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Search</Text>
        <View style={styles.spacer} />
      </View>

      {me.notJoined ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <>
          <View style={[styles.search, { backgroundColor: p.card, borderColor: p.border }]}>
            <Ionicons name="search-outline" size={18} color={p.muted} />
            <TextInput
              value={text}
              onChangeText={(v) => setText(v.replace(/[^\p{L}\p{N}_@ ]/gu, '').slice(0, 25))}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              placeholder="Search people by name or handle"
              placeholderTextColor={p.muted}
              returnKeyType="search"
              style={[styles.input, { color: p.text }]}
              accessibilityLabel="Search people by name or handle"
            />
            {text ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear" hitSlop={8} onPress={() => setText('')}>
                <Ionicons name="close" size={18} color={p.muted} />
              </Pressable>
            ) : null}
          </View>

          {ready ? (
            <FlatList
              data={waiting ? [] : people}
              keyExtractor={(person) => person.handle}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + SOCIAL_DOCK_SPACE + 16 }]}
              ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: p.border }]} />}
              onEndReachedThreshold={0.4}
              onEndReached={() => {
                if (results.hasNextPage && !results.isFetchingNextPage) void results.fetchNextPage();
              }}
              renderItem={({ item }) => (
                <SuggestionRow
                  person={item}
                  busy={friend.isPending && friend.variables?.handle === item.handle}
                  onOpen={() => router.push(socialProfileHref(item.handle))}
                  onToggle={() => friend.mutate(friendTap(item))}
                />
              )}
              ListEmptyComponent={
                waiting ? (
                  <ActivityIndicator color={p.accent} style={{ marginTop: 28 }} />
                ) : results.isError ? (
                  <Text style={[styles.hint, { color: p.muted }]}>Could not search right now. Try again in a moment.</Text>
                ) : (
                  <Text style={[styles.hint, { color: p.muted }]}>No one found for “{debounced}”. Check the spelling, or try another part of their name.</Text>
                )
              }
              ListFooterComponent={results.isFetchingNextPage ? <ActivityIndicator color={p.accent} style={{ marginVertical: 16 }} /> : undefined}
            />
          ) : (
            <View style={styles.body}>
              <Text style={[styles.hint, { color: p.muted }]}>
                {typed.length === 0 ? `Type at least ${MIN_CHARS} letters of a name or handle and the people who match will show here.` : `Keep typing: ${MIN_CHARS - typed.length} more ${MIN_CHARS - typed.length === 1 ? 'letter' : 'letters'} to see suggestions.`}
              </Text>
            </View>
          )}
        </>
      )}

      <SocialDock active="search" />
    </View>
  );
}

function SuggestionRow({ person, busy, onOpen, onToggle }: { person: SocialPerson; busy: boolean; onOpen: () => void; onToggle: () => void }) {
  const p = usePalette();
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.who}>
        <View style={[styles.avatar, { backgroundColor: p.accentSoft }]}>
          <Text style={[styles.avatarText, { color: p.accent }]}>{person.handle.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.names}>
          <Text numberOfLines={1} style={[styles.name, { color: p.text }]}>{person.display_name || `@${person.handle}`}</Text>
          <Text numberOfLines={1} style={[styles.handle, { color: p.muted }]}>@{person.handle}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onToggle}
        style={[styles.friendBtn, friendIsQuiet(person) ? { borderColor: p.border, borderWidth: 1 } : { backgroundColor: p.accent }]}>
        {busy ? (
          <ActivityIndicator size="small" color={friendIsQuiet(person) ? p.accent : '#FFFFFF'} />
        ) : (
          <Text style={[styles.friendBtnText, { color: friendIsQuiet(person) ? p.text : '#FFFFFF' }]}>{friendLabel(person)}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  // Keeps the title in the middle without drawing anything on the right.
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontWeight: '800' },
  gutter: { paddingHorizontal: 16, paddingTop: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, height: 48, marginHorizontal: 16, marginBottom: 12 },
  input: { flex: 1, fontSize: 15, padding: 0, height: '100%' },
  body: { paddingHorizontal: 16, gap: 14 },
  list: { paddingHorizontal: 16, flexGrow: 1 },
  sep: { height: StyleSheet.hairlineWidth },
  hint: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', paddingHorizontal: 12, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  names: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '800' },
  handle: { fontSize: 12.5 },
  friendBtn: { minWidth: 92, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  friendBtnText: { fontSize: 13, fontWeight: '700' },
});
