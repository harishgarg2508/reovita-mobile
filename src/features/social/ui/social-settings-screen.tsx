import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState, useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@shared/ui';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { useMyHandle, useSocialProfile, useSocialUnread } from '@entities/social';

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
  const rows: Row[] = [
    { icon: 'people-circle-outline', label: 'Accountability pods', hint: 'Small groups with a shared weekly target', href: socialRoute('/social/pods') },
    { icon: 'map-outline', label: 'Journeys', hint: 'Walk a route with friends on an animated map', href: socialRoute('/social/journeys') },
    { icon: 'trophy-outline', label: 'Quests and leaderboard', hint: 'Monthly goals and your friends', href: socialRoute('/social/quests') },
    { icon: 'bookmark-outline', label: 'Saved posts', hint: 'Posts you kept with the bookmark', href: socialRoute('/social/saved') },
    { icon: 'pulse-outline', label: 'Your activity', hint: 'Kudos, comments and accepted requests', badge: unread.data?.unread ?? 0, href: socialRoute('/social/activity') },
    { icon: 'notifications-outline', label: 'Notifications', hint: 'Updates about your reports', href: '/(app)/notifications' as Href },
    { icon: 'people-outline', label: 'Friend requests', hint: 'Received and sent', badge: unread.data?.requests ?? 0, href: socialRoute('/social/requests') },
    { icon: 'ban-outline', label: 'Blocked and reported', hint: typeof blocked === 'number' ? `${blocked} blocked` : 'People you blocked or reported', href: socialRoute('/social/blocked') },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => goBackOr(router, SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Settings</Text>
        <View style={styles.spacer} />
      </View>

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
            {rows.map((row, index) => (
              <Pressable
                key={row.label}
                accessibilityRole="button"
                onPress={() => router.push(row.href)}
                style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border }]}>
                <View style={[styles.iconBox, { backgroundColor: p.accentSoft }]}>
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

          <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
            <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: p.redSoft }]}>
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
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  // Keeps the title in the middle without drawing anything on the right.
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontWeight: '800' },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  card: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
  rowLabel: { fontSize: 15.5, fontWeight: '700' },
  rowHint: { fontSize: 12.5 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' },
});
