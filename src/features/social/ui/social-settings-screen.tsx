import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState, useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@shared/ui';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_RULE, SOCIAL_SPACE, SOCIAL_TYPE, useMyHandle, useSocialProfile, useSocialUnread } from '@entities/social';

import { SOCIAL_HOME, socialRoute } from '../model/routes';
import { useLeaveSocial } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { useScrollToTopOnFocus } from '@shared/lib';

type Row = { icon: keyof typeof Ionicons.glyphMap; label: string; hint?: string; badge?: number; href: Href };

// The settings of the social account, opened from the menu button on my profile: my saved posts, my activity, the app's notifications, friend
// requests, the blocked and reported people, and deleting the social account. Deleting asks first, and removes only the social account.
export function SocialSettingsScreen() {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const profile = useSocialProfile(me.data?.handle ?? '', me.joined);
  const unread = useSocialUnread(me.joined);
  const leave = useLeaveSocial();
  const [confirming, setConfirming] = useState(false);

  const blocked = profile.data?.blocked_count;
  // Only what is about the person's own Social: the saved posts, and the notifications of Social (kudos, comments, requests, invitations), which open on Activity.
  // Journeys, pods and quests are in Move; friend requests and kudos are in Activity.
  const rows: Row[] = [
    { icon: 'bookmark-outline', label: 'Saved posts', hint: 'Posts you kept with the bookmark', href: socialRoute('/social/saved') },
    { icon: 'notifications-outline', label: 'Notifications', hint: 'Kudos, comments, requests and invitations', badge: (unread.data?.unread ?? 0) + (unread.data?.requests ?? 0), href: socialRoute('/social/activity') },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => goBackOr(router, SOCIAL_HOME)} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={p.text} />
        </Pressable>
        <View style={styles.iconBtn} />
      </View>
      <View style={styles.heading}>
        <Text style={[SOCIAL_TYPE.display, { color: p.text }]}>Settings</Text>
      </View>

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { borderTopColor: p.border }]}>
            {rows.map((row, index) => (
              <Pressable
                key={row.label}
                accessibilityRole="button"
                onPress={() => router.push(row.href)}
                style={[styles.row, { borderBottomWidth: SOCIAL_RULE, borderBottomColor: p.border }]}>
                <View style={styles.iconBox}>
                  <Ionicons name={row.icon} size={19} color={p.accent} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: p.text }]}>{row.label}</Text>
                  {row.hint ? <Text numberOfLines={1} style={[styles.rowHint, { color: p.muted }]}>{row.hint}</Text> : null}
                </View>
                {row.badge ? (
                  <View style={[styles.badge, { backgroundColor: p.red }]}>
                    <Text style={styles.badgeText}>{row.badge > 99 ? '99+' : row.badge}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={p.muted} />
              </Pressable>
            ))}
          </View>

          <View style={[styles.card, { borderTopColor: p.border }]}>
            <Pressable accessibilityRole="button" onPress={() => router.push(socialRoute('/social/blocked'))} style={[styles.row, { borderBottomWidth: SOCIAL_RULE, borderBottomColor: p.border }]}>
              <View style={styles.iconBox}>
                <Ionicons name="ban-outline" size={19} color={p.accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: p.text }]}>Blocked and reported</Text>
                <Text numberOfLines={1} style={[styles.rowHint, { color: p.muted }]}>{typeof blocked === 'number' ? `${blocked} blocked` : 'People you blocked or reported'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={p.muted} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={styles.row}>
              <View style={styles.iconBox}>
                <Ionicons name="trash-outline" size={19} color={p.red} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: p.red }]}>Delete account</Text>
                <Text numberOfLines={1} style={[styles.rowHint, { color: p.muted }]}>Removes your social account only</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <ConfirmDialog
        visible={confirming}
        title="Delete account?"
        message="Your social account is deleted: your handle, posts, kudos, friends and photos. Your health information and your Reovita account are not affected. You can create a new social account later with a new handle."
        confirmLabel="Delete"
        busy={leave.isPending}
        onConfirm={() => leave.mutate(undefined, { onSuccess: () => router.replace(SOCIAL_HOME), onSettled: () => setConfirming(false) })}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { paddingHorizontal: SOCIAL_SPACE.edge, paddingBottom: SOCIAL_SPACE.inner, gap: 2 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  // Keeps the title in the middle without drawing anything on the right.
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontWeight: '800' },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  card: { borderTopWidth: SOCIAL_RULE },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, paddingVertical: 16 },
  iconBox: { width: 28, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
  rowLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 15.5, lineHeight: 22 },
  rowHint: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, lineHeight: 17 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' },
});
