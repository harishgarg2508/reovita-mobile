import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { useMyHandle, useSavedPosts } from '@entities/social';

import { SOCIAL_HOME, socialProfileHref } from '../model/routes';
import { JoinPanel } from './join-panel';
import { PostFeed } from './post-feed';

// The posts I saved with the bookmark, the most recently saved first, ten at a time with infinite scroll, in a bento grid (one big tile and two
// small ones in each group). Tapping a tile opens the post in the swipe-down drawer. Un-saving a post there keeps it on the screen until the list
// loads again, so a tap by mistake can be undone.
export function SavedScreen() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const saved = useSavedPosts(me.joined);

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => goBackOr(router, SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Saved</Text>
        <View style={styles.spacer} />
      </View>

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <PostFeed
          query={saved}
          layout="bento"
          edgeToEdge
          emptyTitle="Nothing saved yet"
          emptyBody="Tap the bookmark on a post to keep it here."
          onOpenProfile={(handle) => router.push(socialProfileHref(handle))}
          bottomPadding={insets.bottom + 24}
        />
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
});
