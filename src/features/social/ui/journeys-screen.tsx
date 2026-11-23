import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapConfirm, tapSelection, useScrollToTopOnFocus } from '@shared/lib';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { NumberWheel } from '@shared/ui/number-wheel';
import { goBackOr } from '@shared/ui/screen-back/screen-back-button';
import { usePalette } from '@shared/ui/theme';
import { SOCIAL_RULE, SOCIAL_SPACE, SOCIAL_TYPE, SocialAvatar, useJourneyInvites, useJourneyMaps, useJourneys, useMyHandle, type SocialJourneyMember } from '@entities/social';

import { THEMES, type JourneyTheme } from '../model/journey-maps';
import { SOCIAL_HOME, socialJourneyHref } from '../model/routes';
import { useAnswerJourneyInvite, useStartJourney } from '../model/use-social-actions';
import { JoinPanel } from './join-panel';
import { JourneyMap } from './journey-map';
import { StepsPermissionOverlay } from './steps-permission-overlay';
import { StepsBanner } from './steps-banner';
import { StepsCard } from './steps-card';

const NO_MEMBERS: SocialJourneyMember[] = [];
const LOOK_LABEL: Record<JourneyTheme, string> = { plains: 'Plains', mountain: 'Mountain', coast: 'Coast', backwaters: 'Backwaters' };
const THEME_ICON: Record<string, keyof typeof Ionicons.glyphMap> = { plains: 'sunny-outline', mountain: 'trail-sign-outline', coast: 'boat-outline', backwaters: 'water-outline' };

// Journeys: a trip along a map that friends make together. Each day with a check-in moves everyone forward; whoever is furthest leads. The distance is a
// distance made from the steps the phone counts, never a position. This screen lists the invitations, the journeys the person is on, and starts a new one
// from a bottom drawer of maps.
export function JourneysScreen() {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // The preview fills the drawer: the screen width (the drawer is at most 560 wide) less the drawer's side padding.
  const previewWidth = Math.min(useWindowDimensions().width, 560) - 48;
  const me = useMyHandle();
  const journeys = useJourneys(me.joined);
  const invites = useJourneyInvites(me.joined);
  const maps = useJourneyMaps(me.joined);
  const answer = useAnswerJourneyInvite();
  const start = useStartJourney();
  const [choosing, setChoosing] = useState(false);
  // The form for a map the person makes.
  const [making, setMaking] = useState(false);
  const [name, setName] = useState('');
  const [km, setKm] = useState(300);
  const [days, setDays] = useState(21);
  const [look, setLook] = useState<JourneyTheme>('plains');
  const closeSheet = () => {
    setChoosing(false);
    setMaking(false);
  };

  const running = (journeys.data ?? []).filter((j) => j.status === 'active');
  const ended = (journeys.data ?? []).filter((j) => j.status === 'ended');

  return (
    <View style={[styles.screen, { backgroundColor: p.bg, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => goBackOr(router, SOCIAL_HOME)} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={p.text} />
        </Pressable>
        <View style={styles.iconBtn} />
      </View>
      <Text numberOfLines={2} style={[SOCIAL_TYPE.display, styles.heading, { color: p.text }]}>Journeys</Text>

      <StepsBanner />

      {me.needsJoin ? (
        <View style={styles.gutter}>
          <JoinPanel />
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={[styles.heroIcon, { backgroundColor: p.accentSoft }]}>
                <Ionicons name="map-outline" size={22} color={p.accent} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.heroTitle, { color: p.text }]}>Walk a route together</Text>
                <Text style={[styles.hint, { color: p.muted }]}>Pick a map and invite friends. Your steps move you along the route, and whoever gets furthest leads.</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapSelection();
                setChoosing(true);
              }}
              style={[styles.startBtn, { backgroundColor: p.accent }]}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.startText}>Start a journey</Text>
            </Pressable>
          </View>

          <StepsCard />

          {invites.data && invites.data.length > 0 ? (
            <View style={styles.block}>
              <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>Invitations</Text>
              {invites.data.map((invite) => (
                <View key={invite.id} style={[styles.card, { borderBottomColor: p.border }]}>
                  <View style={styles.row}>
                    <SocialAvatar handle={invite.from.handle} hasAvatar={invite.from.has_avatar} size={42} />
                    <View style={styles.flex}>
                      <Text style={[styles.cardTitle, { color: p.text }]}>{invite.title}</Text>
                      <Text numberOfLines={1} style={[styles.hint, { color: p.muted }]}>
                        {invite.from.display_name || `@${invite.from.handle}`} · {invite.total_km} km · {invite.days} days · {invite.member_count} on it
                      </Text>
                    </View>
                  </View>
                  <View style={styles.row}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={answer.isPending}
                      onPress={() => {
                        tapConfirm();
                        answer.mutate({ id: invite.id, accept: true }, { onSuccess: () => router.push(socialJourneyHref(invite.challenge_id)) });
                      }}
                      style={[styles.btn, { backgroundColor: p.accent }]}>
                      <Text style={styles.btnText}>Join journey</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={answer.isPending} onPress={() => answer.mutate({ id: invite.id, accept: false })} style={[styles.btn, { borderColor: p.border, borderWidth: 1 }]}>
                      <Text style={[styles.btnText, { color: p.text }]}>Decline</Text>
                    </Pressable>
                  </View>
                  {answer.isError ? <Text style={[styles.hint, { color: p.red }]}>{(answer.error as Error).message}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.block}>
            <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>On the road</Text>
            {journeys.isPending ? <ActivityIndicator color={p.accent} style={{ marginVertical: 20 }} /> : null}
            {journeys.isError ? <Text style={[styles.note, { color: p.muted }]}>Could not load your journeys. Try again in a moment.</Text> : null}
            {journeys.data && running.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: p.card, borderColor: p.border }]}>
                <Ionicons name="trail-sign-outline" size={28} color={p.muted} />
                <Text style={[styles.cardTitle, { color: p.text }]}>No journey yet</Text>
                <Text style={[styles.hint, { color: p.muted, textAlign: 'center' }]}>Start one and invite up to nine friends.</Text>
              </View>
            ) : null}
            {running.map((journey) => (
              <JourneyRow key={journey.id} journey={journey} onOpen={() => router.push(socialJourneyHref(journey.id))} />
            ))}
          </View>

          {ended.length > 0 ? (
            <View style={styles.block}>
              <Text style={[SOCIAL_TYPE.title, { color: p.text }]}>Finished</Text>
              {ended.map((journey) => (
                <JourneyRow key={journey.id} journey={journey} onOpen={() => router.push(socialJourneyHref(journey.id))} />
              ))}
            </View>
          ) : null}

        </ScrollView>
      )}

      <StepsPermissionOverlay />

      <BottomSheet visible={choosing} onClose={closeSheet}>
        <View style={styles.sheet}>
          {making ? (
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheet}>
              <View style={styles.row}>
                <Pressable accessibilityRole="button" accessibilityLabel="Back to the maps" hitSlop={8} onPress={() => setMaking(false)}>
                  <Ionicons name="chevron-back" size={20} color={p.text} />
                </Pressable>
                <Text style={[styles.cardTitle, { color: p.text }]}>Make your own map</Text>
              </View>
              {/* The map as it will look, with the chosen look. It changes as the look changes. */}
              <View style={styles.preview}>
                <JourneyMap mapKey="custom" theme={look} members={NO_MEMBERS} width={previewWidth} still />
              </View>
              <TextInput value={name} onChangeText={setName} maxLength={40} placeholder="Name, e.g. Home to the office run" placeholderTextColor={p.muted} accessibilityLabel="Map name" style={[styles.input, { color: p.text, borderColor: p.border, backgroundColor: p.input }]} />
              <Text style={[styles.label, { color: p.text }]}>Look</Text>
              <View style={styles.chips}>
                {(Object.keys(THEMES) as JourneyTheme[]).map((key) => (
                  <Pressable key={key} accessibilityRole="button" onPress={() => { tapSelection(); setLook(key); }} style={[styles.chip, { borderColor: look === key ? p.accent : p.border, backgroundColor: look === key ? p.accentSoft : p.surface }]}>
                    <View style={[styles.dot, { backgroundColor: THEMES[key].grass[0] }]} />
                    <Text style={[styles.chipText, { color: look === key ? p.accent : p.text }]}>{LOOK_LABEL[key]}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.wheels}>
                <View style={styles.wheelCol}>
                  <Text style={[styles.label, { color: p.text }]}>Route length</Text>
                  <NumberWheel compact value={km} minValue={1} maxValue={2000} suffix=" km" onChange={setKm} />
                </View>
                <View style={styles.wheelCol}>
                  <Text style={[styles.label, { color: p.text }]}>Days</Text>
                  <NumberWheel compact value={days} minValue={3} maxValue={90} suffix=" days" onChange={setDays} />
                </View>
              </View>
              <Text style={[styles.hint, { color: p.muted }]}>Walk about 7,000 steps a day to keep the pace: {Math.round(km / Math.ceil(days * 0.7) * 10) / 10} km of route a day.</Text>
              {start.isError ? <Text style={[styles.hint, { color: p.red }]}>{(start.error as Error).message}</Text> : null}
              <Pressable
                accessibilityRole="button"
                disabled={name.trim().length < 3 || start.isPending}
                onPress={() => {
                  tapConfirm();
                  start.mutate({ title: name.trim(), totalKm: km, days, theme: look }, { onSuccess: (journey) => { closeSheet(); setName(''); router.push(socialJourneyHref(journey.id)); } });
                }}
                style={[styles.btn, { backgroundColor: p.accent, flex: 0 }, name.trim().length < 3 && { opacity: 0.5 }]}>
                {start.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Start this journey</Text>}
              </Pressable>
            </ScrollView>
          ) : (
            <>
          <Text style={[styles.cardTitle, { color: p.text }]}>Choose a map</Text>
          {maps.isPending ? <ActivityIndicator color={p.accent} /> : null}
          {(maps.data ?? []).map((map) => {
            const colors = THEMES[(map.theme in THEMES ? map.theme : 'plains') as JourneyTheme];
            return (
              <Pressable
                key={map.key}
                accessibilityRole="button"
                disabled={start.isPending}
                onPress={() => {
                  tapConfirm();
                  start.mutate(map.key, {
                    onSuccess: (journey) => {
                      setChoosing(false);
                      router.push(socialJourneyHref(journey.id));
                    },
                  });
                }}
                style={[styles.mapCard, { borderColor: p.border, backgroundColor: p.card }]}>
                <View style={[styles.swatch, { backgroundColor: colors.skyTop }]}>
                  <View style={[styles.swatchLand, { backgroundColor: colors.grass[0] }]} />
                  <Ionicons name={THEME_ICON[map.theme] ?? 'map-outline'} size={22} color="#FFFFFF" />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.cardTitle, { color: p.text }]}>{map.title}</Text>
                  <Text numberOfLines={1} style={[styles.hint, { color: p.muted }]}>{map.tagline}</Text>
                  <Text style={[styles.hint, { color: p.accent, fontWeight: '700' }]}>{map.total_km} km · {map.days} days</Text>
                </View>
                {start.isPending && start.variables === map.key ? <ActivityIndicator color={p.accent} /> : <Ionicons name="chevron-forward" size={16} color={p.muted} />}
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" onPress={() => setMaking(true)} style={[styles.mapCard, { borderColor: p.accent, backgroundColor: p.surface, borderStyle: 'dashed' }]}>
            <View style={[styles.swatch, { backgroundColor: p.accentSoft }]}>
              <Ionicons name="create-outline" size={24} color={p.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: p.text }]}>Make your own map</Text>
              <Text style={[styles.hint, { color: p.muted }]}>Name it, set the length, the days and the look</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={p.muted} />
          </Pressable>
          {start.isError ? <Text style={[styles.hint, { color: p.red }]}>{(start.error as Error).message}</Text> : null}
          <Pressable accessibilityRole="button" onPress={closeSheet} style={[styles.btn, { borderColor: p.border, borderWidth: 1, flex: 0 }]}>
            <Text style={[styles.btnText, { color: p.text }]}>Cancel</Text>
          </Pressable>
            </>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

function JourneyRow({ journey, onOpen }: { journey: { title: string; theme?: string; total_km: number; my_km: number; my_percent: number; days_left: number; member_count: number; finished: boolean; status: string }; onOpen: () => void }) {
  const p = usePalette();
  const pct = Math.round(journey.my_percent);
  const look = THEMES[(journey.theme && journey.theme in THEMES ? journey.theme : 'plains') as JourneyTheme];
  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={[styles.card, { borderBottomColor: p.border }]}>
      <View style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: look.skyTop }]}>
          <View style={[styles.thumbLand, { backgroundColor: look.grass[0] }]} />
          <Ionicons name={journey.finished ? 'trophy' : (THEME_ICON[journey.theme ?? 'plains'] ?? 'map-outline')} size={20} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: p.text }]}>{journey.title}</Text>
          <Text style={[styles.hint, { color: p.muted }]}>
            <Text style={[styles.kmStrong, { color: p.text }]}>{journey.my_km} km</Text> of {journey.total_km} km · {pct}%
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={p.muted} />
      </View>
      <View style={[styles.track, { backgroundColor: p.surface }]}>
        <View style={[styles.fill, { backgroundColor: journey.finished ? '#10B981' : p.accent, width: `${Math.max(2, Math.min(100, journey.my_percent))}%` }]} />
      </View>
      <View style={styles.journeyMetaRow}>
        <Text style={[styles.hint, { color: p.muted }]}>
          {journey.member_count} {journey.member_count === 1 ? 'walker' : 'walkers'} · {journey.status === 'ended' ? 'ended' : `${journey.days_left} ${journey.days_left === 1 ? 'day' : 'days'} left`}
        </Text>
        {journey.finished ? (
          <View style={[styles.finisherPill, { backgroundColor: p.accentSoft }]}>
            <Ionicons name="checkmark-circle" size={12} color={p.accent} />
            <Text style={[styles.finisherText, { color: p.accent }]}>Completed</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { paddingHorizontal: SOCIAL_SPACE.edge, paddingBottom: SOCIAL_SPACE.inner },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  spacer: { width: 40, height: 40 },
  title: { fontSize: 18, fontWeight: '800' },
  gutter: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  hero: { gap: 14, paddingBottom: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  startBtn: { height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  startText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  thumb: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbLand: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 20 },
  kmStrong: { fontWeight: '800' },
  heroIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 15, fontWeight: '800' },
  block: { gap: 10 },
  section: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  card: { borderBottomWidth: SOCIAL_RULE, paddingVertical: 16, gap: 12 },
  cardTitle: { fontSize: 15.5, fontWeight: '800' },
  hint: { fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
  note: { fontSize: 13, textAlign: 'center', marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  journeyIconBox: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  journeyMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  finisherPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  finisherText: { fontSize: 11, fontWeight: '800' },
  empty: { borderWidth: 1, borderRadius: 18, padding: 24, alignItems: 'center', gap: 6 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  btn: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24, borderWidth: 1.5 },
  newText: { fontSize: 15, fontWeight: '800' },
  sheet: { gap: 12 },
  mapCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 10 },
  swatch: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  input: { height: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 },
  label: { fontSize: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '700' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  stepper: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { width: 26, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  formScroll: { maxHeight: 640 },
  preview: { alignItems: 'center' },
  wheels: { flexDirection: 'row', gap: 12 },
  wheelCol: { flex: 1, gap: 6 },
  swatchLand: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 22 },
});
