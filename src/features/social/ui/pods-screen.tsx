import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapConfirm, tapSelection, useScrollToTopOnFocus } from '@shared/lib';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_RULE, SOCIAL_SPACE, SOCIAL_TYPE, SocialAvatar, useMyHandle, useSocialPodInvites, useSocialPods } from '@entities/social';

import { SOCIAL_HOME, socialPodHref } from '../model/routes';
import { useAnswerPodInvite, useCreatePod } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { StepsPermissionOverlay } from './steps-permission-overlay';
import { StepsBanner } from './steps-banner';
import { StepsCard } from './steps-card';

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
    tapConfirm();
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
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => goBackOr(router, SOCIAL_HOME)} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={p.text} />
        </Pressable>
        <View style={styles.iconBtn} />
      </View>
      <Text numberOfLines={2} style={[SOCIAL_TYPE.display, styles.heading, { color: p.text }]}>Pods</Text>

      <StepsBanner />

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Athletic Squad Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={[styles.heroIconBox, { backgroundColor: p.accentSoft }]}>
                <Ionicons name="people" size={22} color={p.accent} />
              </View>
              <View style={styles.heroText}>
                <Text style={[SOCIAL_TYPE.bodyStrong, { color: p.text }]}>Squad accountability</Text>
                <Text style={[styles.heroBody, { color: p.muted }]}>
                  A private circle of up to 5 friends with one weekly target. A day counts at 5,000 steps, and the streak grows while everyone reaches it.
                </Text>
              </View>
            </View>
            {/* Make a pod: the form opens in a bottom drawer. */}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapSelection();
                setCreating(true);
              }}
              style={[styles.newPod, { backgroundColor: p.accent, borderColor: p.accent }]}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={[styles.newPodText, { color: '#FFFFFF' }]}>Make a pod</Text>
            </Pressable>
          </View>

          <StepsCard />

          {/* Invitations */}
          {invites.data && invites.data.length > 0 ? (
            <View style={styles.block}>
              <View style={styles.sectionHeader}>
                <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>Invitations</Text>
                <View style={[styles.badgePill, { backgroundColor: p.accent }]}>
                  <Text style={styles.badgePillText}>{invites.data.length}</Text>
                </View>
              </View>

              {invites.data.map((invite) => (
                <View key={invite.id} style={[styles.card, { borderBottomColor: p.border }]}>
                  <View style={styles.inviteTop}>
                    <SocialAvatar handle={invite.from.handle} hasAvatar={invite.from.has_avatar} size={42} />
                    <View style={styles.inviteText}>
                      <Text style={[styles.cardTitle, { color: p.text }]}>{invite.pod_name}</Text>
                      <Text numberOfLines={1} style={[styles.cardHint, { color: p.muted }]}>
                        Invited by {invite.from.display_name || `@${invite.from.handle}`}
                      </Text>
                      <View style={styles.inviteChips}>
                        <View style={[styles.miniChip, { backgroundColor: p.surface, borderColor: p.border }]}>
                          <Ionicons name="flag-outline" size={12} color={p.text} />
                          <Text style={[styles.miniChipText, { color: p.text }]}>{invite.weekly_goal}d / wk</Text>
                        </View>
                        <View style={[styles.miniChip, { backgroundColor: p.surface, borderColor: p.border }]}>
                          <Ionicons name="people-outline" size={12} color={p.muted} />
                          <Text style={[styles.miniChipText, { color: p.muted }]}>{invite.member_count} members</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.inviteButtons}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={answer.isPending}
                      onPress={() => {
                        tapConfirm();
                        answer.mutate({ id: invite.id, accept: true });
                      }}
                      style={[styles.btn, { backgroundColor: p.accent }]}>
                      <Text style={styles.btnText}>Join Squad</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={answer.isPending}
                      onPress={() => answer.mutate({ id: invite.id, accept: false })}
                      style={[styles.btn, { borderColor: p.border, borderWidth: 1 }]}>
                      <Text style={[styles.btnText, { color: p.text }]}>Decline</Text>
                    </Pressable>
                  </View>
                  {answer.isError ? <Text style={[styles.error, { color: p.red }]}>{(answer.error as Error).message}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}

          {/* Your Pods */}
          <View style={styles.block}>
            <View style={styles.sectionHeader}>
              <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>Your Pods</Text>
              {pods.data ? (
                <Text style={[styles.sectionSub, { color: p.muted }]}>{pods.data.length} active</Text>
              ) : null}
            </View>

            {pods.isPending ? <ActivityIndicator color={p.accent} style={{ marginVertical: 20 }} /> : null}
            {pods.isError ? <Text style={[styles.note, { color: p.muted }]}>Could not load your pods. Try again in a moment.</Text> : null}
            {pods.data?.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: p.card, borderColor: p.border }]}>
                <Ionicons name="shield-outline" size={28} color={p.muted} />
                <Text style={[styles.emptyTitle, { color: p.text }]}>No pods yet</Text>
                <Text style={[styles.emptySubtitle, { color: p.muted }]}>Create an accountability squad and invite up to 4 friends.</Text>
              </View>
            ) : null}

            {pods.data?.map((pod) => (
              <Pressable
                key={pod.id}
                accessibilityRole="button"
                onPress={() => router.push(socialPodHref(pod.id))}
                style={[
                  styles.card, { borderBottomColor: p.border },
                ]}>
                <View style={styles.podTop}>
                  <View style={styles.podTitleRow}>
                    <Ionicons name="shield-checkmark" size={18} color={pod.week_complete ? p.accent : p.muted} />
                    <Text numberOfLines={1} style={[styles.cardTitle, { color: p.text, flex: 1 }]}>
                      {pod.name}
                    </Text>
                  </View>

                  <View style={[styles.streakBadge, { backgroundColor: p.surface, borderColor: p.border }]}>
                    <Ionicons name="flame" size={15} color={pod.streak_weeks > 0 ? '#E8762B' : p.muted} />
                    <Text style={[styles.streakText, { color: p.text }]}>
                      {pod.streak_weeks} {pod.streak_weeks === 1 ? 'wk' : 'wks'}
                    </Text>
                  </View>
                </View>

                <View style={styles.podMetricsRow}>
                  <View style={[styles.miniChip, { backgroundColor: p.surface, borderColor: p.border }]}>
                    <Ionicons name="flag-outline" size={12} color={p.text} />
                    <Text style={[styles.miniChipText, { color: p.text }]}>{pod.weekly_goal}d / week target</Text>
                  </View>

                  <View style={[styles.miniChip, { backgroundColor: p.surface, borderColor: p.border }]}>
                    <Ionicons name="people-outline" size={12} color={p.muted} />
                    <Text style={[styles.miniChipText, { color: p.muted }]}>{pod.member_count} of {pod.max_members} friends</Text>
                  </View>

                  {pod.week_complete ? (
                    <View style={[styles.miniChip, { backgroundColor: p.accentSoft, borderColor: p.accent }]}>
                      <Ionicons name="checkmark-circle" size={12} color={p.accent} />
                      <Text style={[styles.miniChipText, { color: p.accent, fontWeight: '800' }]}>Week done</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>

        </ScrollView>
      )}

      <StepsPermissionOverlay />

      <BottomSheet visible={creating} onClose={() => setCreating(false)}>
        <View style={styles.sheetForm}>
          <View style={styles.creatingHeader}>
            <Ionicons name="add-circle" size={20} color={p.accent} />
            <Text style={[styles.cardTitle, { color: p.text }]}>Create a New Pod</Text>
          </View>

          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={40}
            placeholder="Squad name, e.g. Morning Movers"
            placeholderTextColor={p.muted}
            style={[styles.input, { color: p.text, borderColor: p.border, backgroundColor: p.input }]}
            accessibilityLabel="Pod name"
          />

          <View style={styles.goalRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.goalTitle, { color: p.text }]}>Weekly Target</Text>
              <Text style={[styles.cardHint, { color: p.muted }]}>Active days (5,000 steps) each week per person</Text>
            </View>
            <View style={styles.stepperContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fewer days"
                onPress={() => {
                  tapSelection();
                  setGoal((g) => Math.max(1, g - 1));
                }}
                style={[styles.stepper, { borderColor: p.border, backgroundColor: p.surface }]}>
                <Ionicons name="remove" size={18} color={p.text} />
              </Pressable>
              <Text style={[styles.goalValue, { color: p.text }]}>{goal}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More days"
                onPress={() => {
                  tapSelection();
                  setGoal((g) => Math.min(7, g + 1));
                }}
                style={[styles.stepper, { borderColor: p.border, backgroundColor: p.surface }]}>
                <Ionicons name="add" size={18} color={p.text} />
              </Pressable>
            </View>
          </View>

          {create.isError ? <Text style={[styles.error, { color: p.red }]}>{(create.error as Error).message}</Text> : null}

          <View style={styles.inviteButtons}>
            <Pressable
              accessibilityRole="button"
              disabled={!name.trim() || create.isPending}
              onPress={submit}
              style={[styles.btn, { backgroundColor: p.accent }, !name.trim() && { opacity: 0.5 }]}>
              {create.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.btnText}>Create Squad</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setCreating(false)} style={[styles.btn, { borderColor: p.border, borderWidth: 1 }]}>
              <Text style={[styles.btnText, { color: p.text }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { paddingHorizontal: SOCIAL_SPACE.edge, paddingBottom: 6 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontWeight: '800' },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  body: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },
  heroCard: { gap: 14, paddingBottom: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, minWidth: 0, gap: 2 },
  heroTitle: { fontSize: 15, fontWeight: '800' },
  heroBody: { fontSize: 12.5, lineHeight: 17 },
  block: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12.5, fontWeight: '500' },
  badgePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgePillText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  note: { fontSize: 13, textAlign: 'center', marginVertical: 8 },
  emptyBox: { borderWidth: 1, borderRadius: 18, padding: 24, alignItems: 'center', gap: 6, marginVertical: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
  card: { borderBottomWidth: SOCIAL_RULE, paddingVertical: 16, gap: 12 },
  cardTitle: { fontSize: 15.5, fontWeight: '800' },
  cardHint: { fontSize: 12.5, fontWeight: '500' },
  podTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  podTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  podMetricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  streakText: { fontSize: 13, fontWeight: '800' },
  miniChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  miniChipText: { fontSize: 11.5, fontWeight: '600' },
  inviteTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteText: { flex: 1, minWidth: 0, gap: 4 },
  inviteChips: { flexDirection: 'row', gap: 6, marginTop: 2 },
  inviteButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  error: { fontSize: 12.5 },
  sheetForm: { gap: 14 },
  creatingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { height: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  goalTitle: { fontSize: 14, fontWeight: '700' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepper: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  goalValue: { width: 22, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  newPod: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24, borderWidth: 1.5 },
  newPodText: { fontSize: 15, fontWeight: '800' },
});
