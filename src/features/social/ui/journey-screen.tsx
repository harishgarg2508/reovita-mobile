import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapConfirm, tapSelection, useScrollToTopOnFocus } from '@shared/lib';
import { ConfirmDialog } from '@shared/ui';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { SocialAvatar, useJourney, useMyHandle, useSocialPeople } from '@entities/social';

import { socialProfileHref, socialRoute } from '../model/routes';
import { useInviteToJourney, useLeaveJourney } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { StepsBanner } from './steps-banner';
import { StepsPermissionOverlay } from './steps-permission-overlay';
import { JourneyMap } from './journey-map';

function getThemeIcon(theme: string): keyof typeof Ionicons.glyphMap {
  switch (theme) {
    case 'backwaters':
      return 'water-outline';
    case 'coast':
      return 'boat-outline';
    case 'mountain':
      return 'trail-sign-outline';
    default:
      return 'sunny-outline';
  }
}

function getRankBadge(rank: number, p: ReturnType<typeof usePalette>) {
  if (rank === 1) {
    return {
      bg: 'rgba(245, 158, 11, 0.15)',
      text: '#F59E0B',
      border: 'rgba(245, 158, 11, 0.35)',
      icon: 'trophy' as const,
    };
  }
  if (rank === 2) {
    return {
      bg: 'rgba(148, 163, 184, 0.15)',
      text: '#94A3B8',
      border: 'rgba(148, 163, 184, 0.35)',
      icon: 'medal' as const,
    };
  }
  if (rank === 3) {
    return {
      bg: 'rgba(217, 119, 6, 0.15)',
      text: '#D97706',
      border: 'rgba(217, 119, 6, 0.35)',
      icon: 'medal-outline' as const,
    };
  }
  return {
    bg: 'transparent',
    text: p.muted,
    border: 'transparent',
    icon: null,
  };
}

// One journey: the animated map with everyone on the route, the ranking with each person's distance, and a way to invite friends or leave.
export function JourneyScreen({ id }: { id: string }) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const me = useMyHandle();
  const journey = useJourney(id, me.joined);
  const friends = useSocialPeople('friends');
  const invite = useInviteToJourney(id);
  const leave = useLeaveJourney(id);
  const [inviting, setInviting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const data = journey.data;
  const taken = new Set([...(data?.members.map((m) => m.handle) ?? []), ...(data?.pending_invites.map((i) => i.handle) ?? [])]);
  const candidates = (friends.data ?? []).filter((f) => !taken.has(f.handle));
  const full = data ? data.member_count + data.pending_invites.length >= data.max_members : false;
  const back = () => goBackOr(router, socialRoute('/social/journeys'));
  const mapWidth = Math.min(screenWidth, 560) - 32;

  const leader = data?.members[0];

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      {/* Top Bar */}
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={back} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>

        <View style={styles.titleContainer}>
          <Ionicons name={getThemeIcon(data?.theme ?? 'plains')} size={18} color={p.accent} />
          <Text numberOfLines={1} style={[styles.title, { color: p.text }]}>{data?.title ?? 'Journey'}</Text>
        </View>

        <View style={styles.barRight}>
          {data ? (
            <View style={[styles.statusPill, { backgroundColor: data.status === 'active' ? p.accentSoft : p.surface, borderColor: p.border }]}>
              <Text style={[styles.statusText, { color: data.status === 'active' ? p.accent : p.muted }]}>
                {data.status === 'active' ? 'Active' : 'Ended'}
              </Text>
            </View>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
      </View>

      <StepsBanner />

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : journey.isPending ? (
        <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} />
      ) : journey.isError || !data ? (
        <Text style={[styles.note, { color: p.muted }]}>This journey is not available. You may have left it.</Text>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {/* Isometric Journey Map Card */}
          <View style={[styles.mapContainer, { backgroundColor: p.card, borderColor: p.border }]}>
            <View style={styles.mapWrap}>
              <JourneyMap mapKey={data.map_key} theme={data.theme} members={data.members} width={mapWidth} />
            </View>

            {/* Overlay Chips */}
            <View style={[styles.mapRouteBadge, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}>
              <Ionicons name="trail-sign" size={12} color="#FFFFFF" />
              <Text style={styles.mapRouteBadgeText}>{data.total_km} km Route</Text>
            </View>

            {leader ? (
              <View style={[styles.mapLeaderBadge, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}>
                <Ionicons name="trophy" size={12} color="#F59E0B" />
                <Text style={styles.mapLeaderBadgeText}>Leader: {leader.km} km</Text>
              </View>
            ) : null}
          </View>

          {/* Expedition Tagline */}
          <View style={styles.taglineBox}>
            <Ionicons name="sparkles" size={13} color={p.accent} />
            <Text style={[styles.tagline, { color: p.muted }]}>{data.tagline}</Text>
          </View>

          {/* Primary Journey Progress Card */}
          <View style={[styles.progressCard, { backgroundColor: p.card, borderColor: data.finished ? p.accent : p.border }]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <View style={styles.kmRow}>
                  <Text style={[styles.myKmValue, { color: p.text }]}>{data.my_km}</Text>
                  <Text style={[styles.kmUnit, { color: p.muted }]}> km</Text>
                </View>
                <Text style={[styles.myKmLabel, { color: p.muted }]}>Your distance walked</Text>
              </View>

              <View style={[styles.pctBadge, { backgroundColor: p.accentSoft }]}>
                <Text style={[styles.pctText, { color: p.accent }]}>
                  {Math.round(data.my_percent)}% completed
                </Text>
              </View>
            </View>

            {/* High-Contrast Progress Bar */}
            <View style={[styles.track, { backgroundColor: p.surface }]}>
              <View style={[styles.fill, { backgroundColor: p.accent, width: `${Math.max(2, Math.min(100, data.my_percent))}%` }]} />
            </View>

            {/* 3 Metric Capsules */}
            <View style={[styles.metricsStrip, { borderColor: p.border }]}>
              <View style={styles.metricItem}>
                <View style={styles.metricTop}>
                  <Ionicons name="people-outline" size={14} color={p.accent} />
                  <Text style={[styles.metricValue, { color: p.text }]}>{data.member_count}</Text>
                </View>
                <Text style={[styles.metricLabel, { color: p.muted }]}>Walkers</Text>
              </View>

              <View style={[styles.metricDivider, { backgroundColor: p.border }]} />

              <View style={styles.metricItem}>
                <View style={styles.metricTop}>
                  <Ionicons name="map-outline" size={14} color={p.text} />
                  <Text style={[styles.metricValue, { color: p.text }]}>{data.total_km} km</Text>
                </View>
                <Text style={[styles.metricLabel, { color: p.muted }]}>Route goal</Text>
              </View>

              <View style={[styles.metricDivider, { backgroundColor: p.border }]} />

              <View style={styles.metricItem}>
                <View style={styles.metricTop}>
                  <Ionicons name="time-outline" size={14} color={data.status === 'ended' ? p.red : p.muted} />
                  <Text style={[styles.metricValue, { color: data.status === 'ended' ? p.red : p.text }]}>
                    {data.status === 'ended' ? 'Ended' : `${data.days_left}d`}
                  </Text>
                </View>
                <Text style={[styles.metricLabel, { color: p.muted }]}>Time remaining</Text>
              </View>
            </View>
          </View>

          {/* Finished Achievement Banner */}
          {data.finished ? (
            <View style={[styles.finishBanner, { backgroundColor: p.accentSoft, borderColor: p.accent }]}>
              <View style={[styles.trophyBox, { backgroundColor: p.card }]}>
                <Ionicons name="trophy" size={20} color={p.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.finishTitle, { color: p.text }]}>Journey complete</Text>
                <Text style={[styles.finishBody, { color: p.muted }]}>You reached the end of the route. The badge is on your profile.</Text>
              </View>
            </View>
          ) : null}

          {/* Where the distance comes from */}
          <View style={styles.noteRow}>
            <Ionicons name="footsteps-outline" size={14} color={p.muted} />
            <Text style={[styles.disclaimerText, { color: p.muted }]}>Distance comes from your steps: 7,000 steps is a full day on the route. It is never a GPS position.</Text>
          </View>

          {/* Ranking Section */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: p.text }]}>Ranking</Text>
              <Text style={[styles.sectionSubtitle, { color: p.muted }]}>Furthest first</Text>
            </View>
            <View style={styles.headRight}>
              <View style={[styles.memberCountPill, { backgroundColor: p.surface, borderColor: p.border }]}>
                <Ionicons name="people-outline" size={13} color={p.muted} />
                <Text style={[styles.memberCountText, { color: p.text }]}>{data.member_count} of {data.max_members}</Text>
              </View>
              {/* The friends to invite are chosen in a drawer. */}
              {data.status === 'active' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Invite a friend to this journey"
                  onPress={() => {
                    tapSelection();
                    setInviting(true);
                  }}
                  style={[styles.invitePill, { backgroundColor: p.accent }]}>
                  <Ionicons name="person-add" size={14} color="#FFFFFF" />
                  <Text style={styles.invitePillLabel}>Invite</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Members Leaderboard */}
          {data.members.map((member) => {
            const badge = getRankBadge(member.rank, p);
            return (
              <Pressable
                key={member.handle}
                accessibilityRole="button"
                onPress={() => router.push(socialProfileHref(member.handle))}
                style={[
                  styles.memberCard,
                  {
                    backgroundColor: member.is_me ? p.accentSoft : p.card,
                    borderColor: member.is_me ? p.accent : p.border,
                  },
                ]}>
                {/* Rank Badge */}
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: badge.bg, borderColor: badge.border },
                    badge.icon ? styles.rankBadgeMedal : null,
                  ]}>
                  {badge.icon ? (
                    <Ionicons name={badge.icon} size={15} color={badge.text} />
                  ) : (
                    <Text style={[styles.rankNumber, { color: badge.text }]}>{member.rank}</Text>
                  )}
                </View>

                <SocialAvatar handle={member.handle} hasAvatar={member.has_avatar} size={42} />

                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text numberOfLines={1} style={[styles.memberName, { color: p.text }]}>
                      {member.is_me ? 'You' : member.display_name || `@${member.handle}`}
                    </Text>
                    {member.is_me ? (
                      <View style={[styles.tagPill, { backgroundColor: p.accent }]}>
                        <Text style={styles.tagPillText}>YOU</Text>
                      </View>
                    ) : null}
                    {member.is_owner ? (
                      <View style={[styles.tagPill, { backgroundColor: p.surface, borderColor: p.border, borderWidth: 1 }]}>
                        <Text style={[styles.tagPillText, { color: p.muted }]}>OWNER</Text>
                      </View>
                    ) : null}
                    {member.rank === 1 && !member.is_me ? (
                      <View style={[styles.tagPill, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                        <Text style={[styles.tagPillText, { color: '#F59E0B' }]}>LEAD</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Route Progress Track */}
                  <View style={styles.memberTrackRow}>
                    <View style={[styles.memberTrack, { backgroundColor: p.surface }]}>
                      <View
                        style={[
                          styles.memberFill,
                          {
                            backgroundColor: member.finished ? '#10B981' : p.accent,
                            width: `${Math.max(2, Math.min(100, member.percent))}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.memberPct, { color: p.muted }]}>{Math.round(member.percent)}%</Text>
                  </View>
                </View>

                {/* Metric Output */}
                <View style={styles.memberEnd}>
                  <Text style={[styles.memberKm, { color: p.text }]}>{member.km} km</Text>
                  {member.finished ? (
                    <View style={[styles.badgeChip, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="flag" size={10} color="#10B981" />
                      <Text style={[styles.badgeChipText, { color: "#10B981" }]}>Done</Text>
                    </View>
                  ) : member.checked_in_today ? (
                    <View style={[styles.badgeChip, { backgroundColor: 'rgba(232, 118, 43, 0.15)' }]}>
                      <Ionicons name="flame" size={10} color="#E8762B" />
                      <Text style={[styles.badgeChipText, { color: "#E8762B" }]}>Today</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}

          {/* Pending Invites */}
          {data.pending_invites.map((waiting) => (
            <View key={waiting.handle} style={[styles.memberCard, { borderColor: p.border, borderStyle: 'dashed' }]}>
              <SocialAvatar handle={waiting.handle} hasAvatar={false} size={42} />
              <View style={styles.memberInfo}>
                <Text numberOfLines={1} style={[styles.memberName, { color: p.muted }]}>{waiting.display_name || `@${waiting.handle}`}</Text>
                <Text style={[styles.invitedSubtext, { color: p.muted }]}>Invitation sent · awaiting response</Text>
              </View>
            </View>
          ))}

          {/* Leave Journey Danger Link */}
          <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={styles.leaveBtn}>
            <Ionicons name="log-out-outline" size={16} color={p.red} />
            <Text style={[styles.leaveText, { color: p.red }]}>Leave Journey</Text>
          </Pressable>
        </ScrollView>
      )}

      <StepsPermissionOverlay />

      <BottomSheet visible={inviting} onClose={() => setInviting(false)}>
        <View style={styles.sheetBody}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>Invite a Friend</Text>
          {full ? <Text style={[styles.disclaimerText, { color: p.muted }]}>The journey is full, counting the invitations that wait.</Text> : null}
          {!full && friends.isPending ? <ActivityIndicator color={p.accent} /> : null}
          {!full && !friends.isPending && candidates.length === 0 ? <Text style={[styles.disclaimerText, { color: p.muted }]}>All your friends are on this journey already, or you have no friends yet.</Text> : null}
          <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
            {!full
              ? candidates.map((friend) => (
                  <View key={friend.handle} style={styles.candidateRow}>
                    <SocialAvatar handle={friend.handle} hasAvatar={friend.has_avatar} size={40} />
                    <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                      <Text numberOfLines={1} style={[styles.candidateName, { color: p.text }]}>{friend.display_name || `@${friend.handle}`}</Text>
                      <Text style={[styles.candidateHandle, { color: p.muted }]}>@{friend.handle}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      disabled={invite.isPending}
                      onPress={() => {
                        tapConfirm();
                        invite.mutate(friend.handle);
                      }}
                      style={[styles.invitePillBtn, { backgroundColor: p.accent }]}>
                      {invite.isPending && invite.variables === friend.handle ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.invitePillText}>Invite</Text>}
                    </Pressable>
                  </View>
                ))
              : null}
          </ScrollView>
          {invite.isError ? <Text style={[styles.disclaimerText, { color: p.red }]}>{(invite.error as Error).message}</Text> : null}
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={confirming}
        title="Leave this journey?"
        message={data && data.member_count <= 1 ? 'You are the last one on it, so the journey is deleted.' : 'Your distance is removed. You can be invited again later.'}
        confirmLabel="Leave"
        busy={leave.isPending}
        onConfirm={() =>
          leave.mutate(undefined, {
            onSuccess: () => {
              setConfirming(false);
              router.replace(socialRoute('/social/journeys'));
            },
            onSettled: () => setConfirming(false),
          })
        }
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  spacer: { width: 40, height: 40 },
  titleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { fontSize: 18, fontWeight: '800' },
  barRight: { minWidth: 40, alignItems: 'flex-end' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 11.5, fontWeight: '800' },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  note: { fontSize: 13, textAlign: 'center', marginTop: 24, paddingHorizontal: 24 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  // Map Frame & Overlays
  mapContainer: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  mapWrap: { alignItems: 'center' },
  mapRouteBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  mapRouteBadgeText: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' },
  mapLeaderBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  mapLeaderBadgeText: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' },
  taglineBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -2 },
  tagline: { fontSize: 13.5, fontStyle: 'italic', fontWeight: '500' },
  // Progress Card
  progressCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  kmRow: { flexDirection: 'row', alignItems: 'baseline' },
  myKmValue: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  kmUnit: { fontSize: 16, fontWeight: '700' },
  myKmLabel: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  pctText: { fontSize: 12.5, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  metricsStrip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8 },
  metricItem: { flex: 1, alignItems: 'center', gap: 3 },
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricValue: { fontSize: 15, fontWeight: '800' },
  metricLabel: { fontSize: 11, fontWeight: '600' },
  metricDivider: { width: 1, height: 24 },
  // Finish Banner
  finishBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, padding: 14 },
  trophyBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  finishTitle: { fontSize: 15, fontWeight: '800' },
  finishBody: { fontSize: 12.5, lineHeight: 17 },
  // Disclaimer
  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 14, padding: 10 },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 16 },
  // Section Header
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  invitePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 30, borderRadius: 15 },
  invitePillLabel: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  memberCountPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  memberCountText: { fontSize: 12, fontWeight: '700' },
  // Member Card
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 12 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankBadgeMedal: { borderWidth: 1 },
  rankNumber: { fontSize: 14, fontWeight: '800' },
  memberInfo: { flex: 1, minWidth: 0, gap: 5 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14.5, fontWeight: '700' },
  tagPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagPillText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  memberTrackRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  memberFill: { height: 6, borderRadius: 3 },
  memberPct: { fontSize: 11, fontWeight: '600', width: 32 },
  memberEnd: { alignItems: 'flex-end', gap: 3 },
  memberKm: { fontSize: 15, fontWeight: '800' },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeChipText: { fontSize: 10, fontWeight: '800' },
  invitedSubtext: { fontSize: 12, fontWeight: '500' },
  // Invite Panel
  sheetBody: { gap: 12 },
  sheetList: { maxHeight: 420 },
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  candidateName: { fontSize: 14.5, fontWeight: '700' },
  candidateHandle: { fontSize: 12, fontWeight: '500' },
  invitePillBtn: { minWidth: 72, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  invitePillText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  inviteActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24, borderWidth: 1.5 },
  inviteActionText: { fontSize: 15, fontWeight: '800' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginTop: 4 },
  leaveText: { fontSize: 13.5, fontWeight: '700' },
});
