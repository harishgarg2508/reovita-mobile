import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@shared/ui';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { SocialAvatar, useMyHandle, useSocialPeople, useSocialPod } from '@entities/social';

import { socialProfileHref, socialRoute } from '../model/routes';
import { useDeletePod, useInviteToPod, useLeavePod } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { StepsPermissionOverlay } from './steps-permission-overlay';
import { tapConfirm, tapSelection, useScrollToTopOnFocus } from '@shared/lib';

// One pod: the weekly target, the shared streak, and each member with their days this week as dots (a filled dot is an active day of 5,000 steps; the
// ring is green once the member reached the target). Members are chosen from friends by invitation. Any member can leave; the owner can delete the pod.
export function PodScreen({ id }: { id: string }) {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const pod = useSocialPod(id, me.joined);
  const friends = useSocialPeople('friends');
  const invite = useInviteToPod(id);
  const leave = useLeavePod(id);
  const remove = useDeletePod(id);
  const [inviting, setInviting] = useState(false);
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);

  const data = pod.data;
  const inPod = new Set([...(data?.members.map((m) => m.handle) ?? []), ...(data?.pending_invites.map((i) => i.handle) ?? [])]);
  const candidates = (friends.data ?? []).filter((f) => !inPod.has(f.handle));
  const full = data ? data.member_count + data.pending_invites.length >= data.max_members : false;
  const back = () => goBackOr(router, socialRoute('/social/pods'));

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={back} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <View style={styles.titleContainer}>
          <Ionicons name="shield-checkmark" size={17} color={p.accent} />
          <Text numberOfLines={1} style={[styles.title, { color: p.text }]}>{data?.name ?? 'Pod'}</Text>
        </View>
        <View style={styles.spacer} />
      </View>

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : pod.isPending ? (
        <ActivityIndicator color={p.accent} style={{ marginTop: 40 }} />
      ) : pod.isError || !data ? (
        <Text style={[styles.note, { color: p.muted }]}>This pod is not available. It may have been deleted.</Text>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {/* Summary Metric Strip */}
          <View style={[styles.summary, { backgroundColor: p.card, borderColor: data.week_complete ? p.accent : p.border }]}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryTop}>
                <Ionicons name="flame" size={18} color={data.streak_weeks > 0 ? '#E8762B' : p.muted} />
                <Text style={[styles.summaryValue, { color: p.text }]}>{data.streak_weeks}</Text>
              </View>
              <Text style={[styles.summaryLabel, { color: p.muted }]}>
                {data.streak_weeks === 1 ? 'Week streak' : 'Weeks streak'}
              </Text>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: p.border }]} />

            <View style={styles.summaryItem}>
              <View style={styles.summaryTop}>
                <Ionicons name="flag-outline" size={16} color={p.accent} />
                <Text style={[styles.summaryValue, { color: p.text }]}>{data.weekly_goal}</Text>
              </View>
              <Text style={[styles.summaryLabel, { color: p.muted }]}>Days / week</Text>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: p.border }]} />

            <View style={styles.summaryItem}>
              <View style={styles.summaryTop}>
                <Ionicons name={data.week_complete ? 'checkmark-circle' : 'time-outline'} size={18} color={data.week_complete ? p.accent : p.muted} />
                <Text style={[styles.summaryValue, { color: data.week_complete ? p.accent : p.text }]}>
                  {data.week_complete ? 'Done' : 'Active'}
                </Text>
              </View>
              <Text style={[styles.summaryLabel, { color: p.muted }]}>This week</Text>
            </View>
          </View>

          {/* Members List */}
          <View style={styles.sectionHead}>
            <Text style={[styles.section, { color: p.text }]}>Members</Text>
            <View style={[styles.memberCountBadge, { backgroundColor: p.surface, borderColor: p.border }]}>
              <Ionicons name="people-outline" size={13} color={p.muted} />
              <Text style={[styles.memberCountText, { color: p.text }]}>{data.member_count} of {data.max_members}</Text>
            </View>
          </View>

          {data.members.map((member) => (
            <Pressable
              key={member.handle}
              accessibilityRole="button"
              onPress={() => router.push(socialProfileHref(member.handle))}
              style={[styles.member, { backgroundColor: p.card, borderColor: member.met_goal ? p.accent : p.border }]}>
              <SocialAvatar handle={member.handle} hasAvatar={member.has_avatar} size={42} />

              <View style={styles.memberText}>
                <View style={styles.memberNameRow}>
                  <Text numberOfLines={1} style={[styles.memberName, { color: p.text }]}>
                    {member.is_me ? 'You' : member.display_name || `@${member.handle}`}
                  </Text>
                  {member.is_owner ? (
                    <View style={[styles.tagBadge, { backgroundColor: p.surface, borderColor: p.border }]}>
                      <Text style={[styles.tagBadgeText, { color: p.muted }]}>OWNER</Text>
                    </View>
                  ) : null}
                  {member.is_me && !member.is_owner ? (
                    <View style={[styles.tagBadge, { backgroundColor: p.accentSoft }]}>
                      <Text style={[styles.tagBadgeText, { color: p.accent }]}>YOU</Text>
                    </View>
                  ) : null}
                </View>

                {/* Dot Matrix for Weekly Goal */}
                <View style={styles.dots}>
                  {Array.from({ length: Math.max(data.weekly_goal, member.active_days) }, (_, n) => {
                    const filled = n < member.active_days;
                    return (
                      <View
                        key={n}
                        style={[
                          styles.dot,
                          {
                            backgroundColor: filled ? p.accent : 'transparent',
                            borderColor: filled ? p.accent : p.border,
                          },
                        ]}>
                        {filled ? <Ionicons name="checkmark" size={8} color="#FFFFFF" /> : null}
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.memberEnd}>
                <Text style={[styles.memberDays, { color: member.met_goal ? p.accent : p.text }]}>
                  {member.active_days} / {data.weekly_goal}
                </Text>

                <View style={styles.memberStatusChips}>
                  {member.met_goal ? (
                    <View style={[styles.statusChip, { backgroundColor: p.accentSoft }]}>
                      <Text style={[styles.statusChipText, { color: p.accent }]}>Goal met</Text>
                    </View>
                  ) : null}
                  {member.checked_in_today ? (
                    <View style={[styles.statusChip, { backgroundColor: 'rgba(232, 118, 43, 0.12)' }]}>
                      <Text style={[styles.statusChipText, { color: '#E8762B' }]}>Today</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          ))}

          {/* Pending Invites */}
          {data.pending_invites.map((waiting) => (
            <View key={waiting.handle} style={[styles.member, { borderColor: p.border, borderStyle: 'dashed' }]}>
              <SocialAvatar handle={waiting.handle} hasAvatar={false} size={42} />
              <View style={styles.memberText}>
                <Text numberOfLines={1} style={[styles.memberName, { color: p.muted }]}>{waiting.display_name || `@${waiting.handle}`}</Text>
                <Text style={[styles.invitedSubtext, { color: p.muted }]}>Invitation sent · awaiting response</Text>
              </View>
            </View>
          ))}

          {/* Invite Panel */}
          {inviting ? (
            <View style={[styles.invitePanel, { backgroundColor: p.card, borderColor: p.border }]}>
              <View style={styles.sectionHead}>
                <Text style={[styles.section, { color: p.text }]}>Invite a Friend</Text>
                <Pressable accessibilityRole="button" onPress={() => setInviting(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={p.muted} />
                </Pressable>
              </View>

              {full ? <Text style={[styles.note, { color: p.muted }]}>The pod is full, counting the invitations that wait.</Text> : null}
              {!full && friends.isPending ? <ActivityIndicator color={p.accent} /> : null}
              {!full && candidates.length === 0 && !friends.isPending ? <Text style={[styles.note, { color: p.muted }]}>All your friends are in this pod already, or you have no friends yet. Find people with Search.</Text> : null}
              {!full
                ? candidates.map((friend) => (
                    <View key={friend.handle} style={styles.candidate}>
                      <SocialAvatar handle={friend.handle} hasAvatar={friend.has_avatar} size={38} />
                      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                        <Text numberOfLines={1} style={[styles.memberName, { color: p.text }]}>{friend.display_name || `@${friend.handle}`}</Text>
                        <Text style={[styles.invitedSubtext, { color: p.muted }]}>@{friend.handle}</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        disabled={invite.isPending}
                        onPress={() => {
                          tapConfirm();
                          invite.mutate(friend.handle);
                        }}
                        style={[styles.inviteBtn, { backgroundColor: p.accent }]}>
                        {invite.isPending && invite.variables === friend.handle ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.inviteBtnText}>Invite</Text>
                        )}
                      </Pressable>
                    </View>
                  ))
                : null}
              {invite.isError ? <Text style={[styles.error, { color: p.red }]}>{(invite.error as Error).message}</Text> : null}
            </View>
          ) : !full ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapSelection();
                setInviting(true);
              }}
              style={[styles.newInvite, { borderColor: p.accent, backgroundColor: p.surface }]}>
              <Ionicons name="person-add-outline" size={17} color={p.accent} />
              <Text style={[styles.newInviteText, { color: p.accent }]}>Invite a Friend to Squad</Text>
            </Pressable>
          ) : null}

          {/* Danger Zone Actions */}
          <View style={styles.dangerRow}>
            <Pressable accessibilityRole="button" onPress={() => setConfirm('leave')} style={styles.dangerBtn}>
              <Ionicons name="log-out-outline" size={16} color={p.red} />
              <Text style={[styles.dangerText, { color: p.red }]}>Leave Squad</Text>
            </Pressable>
            {data.is_owner ? (
              <Pressable accessibilityRole="button" onPress={() => setConfirm('delete')} style={styles.dangerBtn}>
                <Ionicons name="trash-outline" size={16} color={p.red} />
                <Text style={[styles.dangerText, { color: p.red }]}>Delete Squad</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      )}

      <StepsPermissionOverlay />

      <ConfirmDialog
        visible={confirm !== null}
        title={confirm === 'delete' ? 'Delete this pod?' : 'Leave this pod?'}
        message={confirm === 'delete' ? 'The pod and its streak are deleted for everyone in it.' : data && data.member_count <= 1 ? 'You are the last member, so the pod is deleted.' : 'You can be invited again later.'}
        confirmLabel={confirm === 'delete' ? 'Delete' : 'Leave'}
        busy={leave.isPending || remove.isPending}
        onConfirm={() => {
          const action = confirm === 'delete' ? remove : leave;
          action.mutate(undefined, {
            onSuccess: () => {
              setConfirm(null);
              router.replace(socialRoute('/social/pods'));
            },
            onSettled: () => setConfirm(null),
          });
        }}
        onCancel={() => setConfirm(null)}
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
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  note: { fontSize: 13, textAlign: 'center', marginTop: 24, paddingHorizontal: 24 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 8 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryDivider: { width: 1, height: 28 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 11.5, fontWeight: '600' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  section: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  memberCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  memberCountText: { fontSize: 11.5, fontWeight: '700' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  memberText: { flex: 1, minWidth: 0, gap: 6 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 15, fontWeight: '700' },
  tagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'transparent' },
  tagBadgeText: { fontSize: 9, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 15, height: 15, borderRadius: 7.5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  memberEnd: { alignItems: 'flex-end', gap: 3 },
  memberDays: { fontSize: 15, fontWeight: '800' },
  memberStatusChips: { flexDirection: 'row', gap: 4 },
  statusChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusChipText: { fontSize: 10, fontWeight: '800' },
  invitedSubtext: { fontSize: 12, fontWeight: '500' },
  invitePanel: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 12 },
  candidate: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteBtn: { minWidth: 72, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  inviteBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  newInvite: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 23, borderWidth: 1.5 },
  newInviteText: { fontSize: 14.5, fontWeight: '800' },
  error: { fontSize: 12.5 },
  dangerRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  dangerText: { fontSize: 13.5, fontWeight: '700' },
});
