import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { SocialAvatar, useMyHandle, useSocialPodInvites, useSocialPods } from '@entities/social';

import { SOCIAL_HOME, socialPodHref } from '../model/routes';
import { useAnswerPodInvite, useCreatePod } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { useScrollToTopOnFocus } from '@shared/lib';

// Accountability pods: small private groups with one weekly target for everyone and a shared streak (the weeks in a row in which every member
// reached it). This screen lists the invitations waiting for an answer and the pods the person is in, and makes a new pod.
export function PodsScreen() {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const pods = useSocialPods(me.joined);
  const invites = useSocialPodInvites(me.joined);
  const answer = useAnswerPodInvite();
  const create = useCreatePod();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(4);

  function submit() {
    const clean = name.trim();
    if (!clean || create.isPending) return;
    create.mutate(
      { name: clean, weeklyGoal: goal },
      {
        onSuccess: (pod) => {
          setCreating(false);
          setName('');
          router.push(socialPodHref(pod.id));
        },
      },
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8 }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => goBackOr(router, SOCIAL_HOME)} style={[styles.round, { backgroundColor: p.card, borderColor: p.border }]}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={[styles.title, { color: p.text }]}>Pods</Text>
        <View style={styles.spacer} />
      </View>

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.intro, { color: p.muted }]}>A pod is a private group of up to 5 friends. Everyone aims for the same number of check-in days a week, and the pod keeps a streak while all of you reach it.</Text>

          {invites.data && invites.data.length > 0 ? (
            <View style={styles.block}>
              <Text style={[styles.section, { color: p.text }]}>Invitations</Text>
              {invites.data.map((invite) => (
                <View key={invite.id} style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
                  <View style={styles.inviteTop}>
                    <SocialAvatar handle={invite.from.handle} hasAvatar={invite.from.has_avatar} size={38} />
                    <View style={styles.inviteText}>
                      <Text style={[styles.cardTitle, { color: p.text }]}>{invite.pod_name}</Text>
                      <Text numberOfLines={1} style={[styles.cardHint, { color: p.muted }]}>
                        {invite.from.display_name || `@${invite.from.handle}`} invited you · {invite.weekly_goal} days a week · {invite.member_count} in it
                      </Text>
                    </View>
                  </View>
                  <View style={styles.inviteButtons}>
                    <Pressable accessibilityRole="button" disabled={answer.isPending} onPress={() => answer.mutate({ id: invite.id, accept: true })} style={[styles.btn, { backgroundColor: p.accent }]}>
                      <Text style={styles.btnText}>Join</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={answer.isPending} onPress={() => answer.mutate({ id: invite.id, accept: false })} style={[styles.btn, { borderColor: p.border, borderWidth: 1 }]}>
                      <Text style={[styles.btnText, { color: p.text }]}>Decline</Text>
                    </Pressable>
                  </View>
                  {answer.isError ? <Text style={[styles.error, { color: p.red }]}>{(answer.error as Error).message}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.block}>
            <Text style={[styles.section, { color: p.text }]}>Your pods</Text>
            {pods.isPending ? <ActivityIndicator color={p.accent} style={{ marginVertical: 20 }} /> : null}
            {pods.isError ? <Text style={[styles.note, { color: p.muted }]}>Could not load your pods. Try again in a moment.</Text> : null}
            {pods.data?.length === 0 ? <Text style={[styles.note, { color: p.muted }]}>You are not in a pod yet. Make one and invite friends.</Text> : null}
            {pods.data?.map((pod) => (
              <Pressable key={pod.id} accessibilityRole="button" onPress={() => router.push(socialPodHref(pod.id))} style={[styles.card, { backgroundColor: p.card, borderColor: pod.week_complete ? p.accent : p.border }]}>
                <View style={styles.podTop}>
                  <Text numberOfLines={1} style={[styles.cardTitle, { color: p.text, flex: 1 }]}>{pod.name}</Text>
                  <View style={styles.streakRow}>
                    <Ionicons name="flame" size={15} color={pod.streak_weeks > 0 ? '#E8762B' : p.muted} />
                    <Text style={[styles.streakText, { color: p.text }]}>{pod.streak_weeks} {pod.streak_weeks === 1 ? 'week' : 'weeks'}</Text>
                  </View>
                </View>
                <Text style={[styles.cardHint, { color: p.muted }]}>
                  {pod.member_count} of {pod.max_members} people · {pod.weekly_goal} days a week{pod.week_complete ? ' · this week done' : ''}
                </Text>
              </Pressable>
            ))}
          </View>

          {creating ? (
            <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
              <Text style={[styles.cardTitle, { color: p.text }]}>New pod</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                maxLength={40}
                placeholder="Name, like Morning movers"
                placeholderTextColor={p.muted}
                style={[styles.input, { color: p.text, borderColor: p.border, backgroundColor: p.input }]}
                accessibilityLabel="Pod name"
              />
              <View style={styles.goalRow}>
                <Text style={[styles.cardHint, { color: p.muted, flex: 1 }]}>Check-in days a week for each person</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Fewer days" onPress={() => setGoal((g) => Math.max(1, g - 1))} style={[styles.stepper, { borderColor: p.border }]}>
                  <Ionicons name="remove" size={18} color={p.text} />
                </Pressable>
                <Text style={[styles.goalValue, { color: p.text }]}>{goal}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="More days" onPress={() => setGoal((g) => Math.min(7, g + 1))} style={[styles.stepper, { borderColor: p.border }]}>
                  <Ionicons name="add" size={18} color={p.text} />
                </Pressable>
              </View>
              {create.isError ? <Text style={[styles.error, { color: p.red }]}>{(create.error as Error).message}</Text> : null}
              <View style={styles.inviteButtons}>
                <Pressable accessibilityRole="button" disabled={!name.trim() || create.isPending} onPress={submit} style={[styles.btn, { backgroundColor: p.accent }, !name.trim() && { opacity: 0.5 }]}>
                  {create.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.btnText}>Create pod</Text>}
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setCreating(false)} style={[styles.btn, { borderColor: p.border, borderWidth: 1 }]}>
                  <Text style={[styles.btnText, { color: p.text }]}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setCreating(true)} style={[styles.newPod, { borderColor: p.accent }]}>
              <Ionicons name="add" size={18} color={p.accent} />
              <Text style={[styles.newPodText, { color: p.accent }]}>Make a pod</Text>
            </Pressable>
          )}
        </ScrollView>
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
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  intro: { fontSize: 13.5, lineHeight: 19 },
  block: { gap: 10 },
  section: { fontSize: 16, fontWeight: '800' },
  note: { fontSize: 13, textAlign: 'center', marginVertical: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardHint: { fontSize: 12.5 },
  podTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontSize: 13, fontWeight: '800' },
  inviteTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteText: { flex: 1, minWidth: 0, gap: 1 },
  inviteButtons: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btn: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  error: { fontSize: 12.5 },
  input: { height: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepper: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  goalValue: { width: 20, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  newPod: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 23, borderWidth: 1.5 },
  newPodText: { fontSize: 14.5, fontWeight: '800' },
});
