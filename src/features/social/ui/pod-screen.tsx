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
import { useScrollToTopOnFocus } from '@shared/lib';

// One pod: the weekly target, the shared streak, and each member with their days this week as dots (a filled dot is a day with a check-in; the
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
        <Text numberOfLines={1} style={[styles.title, { color: p.text }]}>{data?.name ?? 'Pod'}</Text>
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
          <View style={[styles.summary, { backgroundColor: p.card, borderColor: data.week_complete ? p.accent : p.border }]}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryTop}>
                <Ionicons name="flame" size={18} color={data.streak_weeks > 0 ? '#E8762B' : p.muted} />
                <Text style={[styles.summaryValue, { color: p.text }]}>{data.streak_weeks}</Text>
              </View>
              <Text style={[styles.summaryLabel, { color: p.muted }]}>{data.streak_weeks === 1 ? 'Week streak' : 'Weeks streak'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: p.text }]}>{data.weekly_goal}</Text>
              <Text style={[styles.summaryLabel, { color: p.muted }]}>Days a week</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name={data.week_complete ? 'checkmark-circle' : 'time-outline'} size={22} color={data.week_complete ? p.accent : p.muted} />
              <Text style={[styles.summaryLabel, { color: p.muted }]}>{data.week_complete ? 'Week done' : 'This week'}</Text>
            </View>
          </View>

          <Text style={[styles.section, { color: p.text }]}>Members · {data.member_count}/{data.max_members}</Text>
          {data.members.map((member) => (
            <Pressable key={member.handle} accessibilityRole="button" onPress={() => router.push(socialProfileHref(member.handle))} style={[styles.member, { backgroundColor: p.card, borderColor: member.met_goal ? p.accent : p.border }]}>
              <SocialAvatar handle={member.handle} hasAvatar={member.has_avatar} size={40} />
              <View style={styles.memberText}>
                <Text numberOfLines={1} style={[styles.memberName, { color: p.text }]}>
                  {member.is_me ? 'You' : member.display_name || `@${member.handle}`}
                  {member.is_owner ? '  · owner' : ''}
                </Text>
                <View style={styles.dots}>
                  {Array.from({ length: Math.max(data.weekly_goal, member.active_days) }, (_, n) => (
                    <View key={n} style={[styles.dot, { backgroundColor: n < member.active_days ? p.accent : 'transparent', borderColor: n < member.active_days ? p.accent : p.border }]} />
                  ))}
                </View>
              </View>
              <View style={styles.memberEnd}>
                <Text style={[styles.memberDays, { color: member.met_goal ? p.accent : p.text }]}>
                  {member.active_days}/{data.weekly_goal}
                </Text>
                {member.checked_in_today ? <Text style={[styles.today, { color: p.accent }]}>today</Text> : null}
              </View>
            </Pressable>
          ))}
          {data.pending_invites.map((waiting) => (
            <View key={waiting.handle} style={[styles.member, { borderColor: p.border, borderStyle: 'dashed' }]}>
              <SocialAvatar handle={waiting.handle} hasAvatar={false} size={40} />
              <Text numberOfLines={1} style={[styles.memberName, { color: p.muted, flex: 1 }]}>{waiting.display_name || `@${waiting.handle}`} · invited</Text>
            </View>
          ))}

          {inviting ? (
            <View style={[styles.invitePanel, { backgroundColor: p.card, borderColor: p.border }]}>
              <Text style={[styles.section, { color: p.text }]}>Invite a friend</Text>
              {full ? <Text style={[styles.note, { color: p.muted }]}>The pod is full, counting the invitations that wait.</Text> : null}
              {!full && friends.isPending ? <ActivityIndicator color={p.accent} /> : null}
              {!full && candidates.length === 0 && !friends.isPending ? <Text style={[styles.note, { color: p.muted }]}>All your friends are in this pod already, or you have no friends yet. Find people with Search.</Text> : null}
              {!full
                ? candidates.map((friend) => (
                    <View key={friend.handle} style={styles.candidate}>
                      <SocialAvatar handle={friend.handle} hasAvatar={friend.has_avatar} size={36} />
                      <Text numberOfLines={1} style={[styles.memberName, { color: p.text, flex: 1 }]}>{friend.display_name || `@${friend.handle}`}</Text>
                      <Pressable accessibilityRole="button" disabled={invite.isPending} onPress={() => invite.mutate(friend.handle)} style={[styles.inviteBtn, { backgroundColor: p.accent }]}>
                        {invite.isPending && invite.variables === friend.handle ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.inviteBtnText}>Invite</Text>}
                      </Pressable>
                    </View>
                  ))
                : null}
              {invite.isError ? <Text style={[styles.error, { color: p.red }]}>{(invite.error as Error).message}</Text> : null}
            </View>
          ) : !full ? (
            <Pressable accessibilityRole="button" onPress={() => setInviting(true)} style={[styles.newInvite, { borderColor: p.accent }]}>
              <Ionicons name="person-add-outline" size={16} color={p.accent} />
              <Text style={[styles.newInviteText, { color: p.accent }]}>Invite a friend</Text>
            </Pressable>
          ) : null}

          <View style={styles.dangerRow}>
            <Pressable accessibilityRole="button" onPress={() => setConfirm('leave')}>
              <Text style={[styles.dangerText, { color: p.red }]}>Leave pod</Text>
            </Pressable>
            {data.is_owner ? (
              <Pressable accessibilityRole="button" onPress={() => setConfirm('delete')}>
                <Text style={[styles.dangerText, { color: p.red }]}>Delete pod</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      )}

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
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  note: { fontSize: 13, textAlign: 'center', marginTop: 24, paddingHorizontal: 24 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  summary: { flexDirection: 'row', borderWidth: 1.5, borderRadius: 18, paddingVertical: 14 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 11.5 },
  section: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  memberText: { flex: 1, minWidth: 0, gap: 6 },
  memberName: { fontSize: 14.5, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  memberEnd: { alignItems: 'flex-end', gap: 2 },
  memberDays: { fontSize: 15, fontWeight: '800' },
  today: { fontSize: 11, fontWeight: '800' },
  invitePanel: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  candidate: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteBtn: { minWidth: 72, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  inviteBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  newInvite: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 22, borderWidth: 1.5 },
  newInviteText: { fontSize: 14, fontWeight: '800' },
  error: { fontSize: 12.5 },
  dangerRow: { flexDirection: 'row', justifyContent: 'center', gap: 28, marginTop: 14 },
  dangerText: { fontSize: 14, fontWeight: '700' },
});
