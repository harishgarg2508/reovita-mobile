import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHome } from '@entities/home';
import { useReportList } from '@entities/report';
import { useProfileCompleteness, type OnboardingStepKey } from '@entities/profile';
import { stepHref, type OnboardingStepNumber } from '@features/onboarding-step';
import { ProfileBmiCard } from '@features/profile-details';
import { useNotificationStream, useUnreadCount } from '@entities/notification';
import { USE_NATIVE_DRIVER } from '@shared/lib';
import { ReovitaLeafLogo } from '@shared/ui';
import { ProgressBar } from '@shared/ui/progress-bar';
import { Skeleton } from '@shared/ui/skeleton';
import { ThemeToggle, useResolvedScheme } from '@shared/ui/theme';

// Colours for the two themes, taken from the dashboard designs.
const DARK = {
  bg: '#0B0A12',
  card: '#16142A',
  border: '#2B2846',
  text: '#FFFFFF',
  muted: '#A9A3C8',
  iconBg: '#22203A',
  purple: '#1F6F3F',
  lime: '#D4FF3F',
  red: '#E34255',
  redSoft: '#2E1624',
  redBorder: '#5A2440',
  track: '#2B2846',
};
const LIGHT = {
  bg: '#F7F6FD',
  card: '#FFFFFF',
  border: '#ECEAF5',
  text: '#14121C',
  muted: '#6E6A82',
  iconBg: '#E6F2EA',
  purple: '#1F6F3F',
  lime: '#B8F000',
  red: '#E34255',
  redSoft: '#FDEEF0',
  redBorder: '#F9CBD2',
  track: '#EEECF6',
};
type Palette = typeof DARK;

function Card({ p, children, style }: { p: Palette; children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }, style]}>{children}</View>;
}

function IconBox({ p, name, color }: { p: Palette; name: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={[styles.iconBox, { backgroundColor: p.iconBg }]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

// The score ring. Filled in proportion to the score, empty when there is no score yet.
// Ring colour from the score: red below 40, amber from 40 to 69, green from 70. No score uses the palette accent.
function scoreColor(score: number | null, p: Palette): string {
  if (score === null) return p.lime;
  if (score < 40) return p.red;
  if (score < 70) return '#B26A00';
  return '#1F7A3E';
}

// Animates a 0..1 fill from 0 up to the target. It runs again each time runId changes (each time Home is opened),
// so the arc sweeps in whenever the screen is shown, and eases to a new value when the score changes.
function useAnimatedFraction(target: number, runId: number): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const value = new Animated.Value(0);
    const id = value.addListener(({ value: v }) => setShown(v));
    Animated.timing(value, { toValue: target, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => {
      value.stopAnimation();
      value.removeListener(id);
    };
  }, [target, runId]);
  return shown;
}

function ScoreRing({ p, score, runId }: { p: Palette; score: number | null; runId: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const fraction = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const shown = useAnimatedFraction(fraction, runId);
  return (
    <View style={styles.ringWrap}>
      <View style={styles.ringRotate}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx="60" cy="60" r={radius} stroke={p.track} strokeWidth={10} fill="none" />
          <Circle
            cx="60"
            cy="60"
            r={radius}
            stroke={scoreColor(score, p)}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * shown} ${circumference}`}
          />
        </Svg>
      </View>
      <View style={styles.ringCenter}>
        <Ionicons name="heart" size={34} color={p.text} />
      </View>
    </View>
  );
}

// One radial chart for a score part (lifestyle, conditions or reports). No number: the arc shows how high it is.
function PartRing({
  p,
  label,
  icon,
  score,
  runId,
}: {
  p: Palette;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  score: number | null;
  runId: number;
}) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const fraction = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const shown = useAnimatedFraction(fraction, runId);
  return (
    <View style={styles.partRingCell}>
      <View style={styles.partRingBox}>
        <Svg width={72} height={72} viewBox="0 0 72 72">
          <Circle cx="36" cy="36" r={radius} stroke={p.track} strokeWidth={7} fill="none" />
          <Circle
            cx="36"
            cy="36"
            r={radius}
            stroke={scoreColor(score, p)}
            strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            transform="rotate(-90 36 36)"
            strokeDasharray={`${circumference * shown} ${circumference}`}
          />
        </Svg>
        <View style={styles.partRingIcon}>
          <Ionicons name={icon} size={18} color={score === null ? p.muted : p.text} />
        </View>
      </View>
      <Text style={[styles.partRingLabel, { color: p.muted }]}>{label}</Text>
    </View>
  );
}

// Pulses the critical banner's icon, so the warning is noticed.
function PulseDot({ color }: { color: string }) {
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={[styles.alertIcon, { backgroundColor: color, transform: [{ scale: pulse }] }]}>
      <Ionicons name="alert" size={26} color="#FFFFFF" />
    </Animated.View>
  );
}

const BRAND_GREEN = "#1F6F3F";

// The three part cards. Each opens the step that adds its information (reports open the upload screen).
const PART_CARDS: { key: 'lifestyle' | 'conditions' | 'reports'; label: string; icon: keyof typeof Ionicons.glyphMap; route: '/onboarding/step-3' | '/onboarding/step-2' | '/(app)/reports/upload' }[] = [
  { key: 'lifestyle', label: 'Lifestyle', icon: 'leaf-outline', route: '/onboarding/step-3' },
  { key: 'conditions', label: 'Conditions', icon: 'medkit-outline', route: '/onboarding/step-2' },
  { key: 'reports', label: 'Reports', icon: 'flask-outline', route: '/(app)/reports/upload' },
];

// The headline follows the score band: 70 and above is good, 40 to 69 needs some care, below 40 needs attention.
function heroTitle(score: number | null): string {
  if (score === null) return "Let's get started";
  if (score >= 70) return 'Good Health!';
  if (score >= 40) return 'Keep Improving';
  return 'Needs Attention';
}

function heroSubtitle(score: number): string {
  if (score >= 70) return "Keep going, you're on the right track.";
  if (score >= 40) return 'A few steps will lift your score.';
  return 'Review your lifestyle and reports with your doctor.';
}

function partStatus(score: number | null): string {
  if (score === null) return 'Add info';
  if (score >= 70) return 'On track';
  if (score >= 40) return 'Needs care';
  return 'Needs attention';
}

function partStatusColor(score: number | null, p: Palette): string {
  if (score === null) return p.purple;
  if (score >= 70) return '#1F7A3E';
  if (score >= 40) return '#B26A00';
  return p.red;
}

// Dashboard: header, the most urgent card first, then the health score, briefing and reports.
export function DashboardHome({ onToggleTheme }: { onToggleTheme: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const home = useHome();
  // The first unfinished onboarding step, from the status endpoint. The profile card opens it.
  const nextStep = useProfileCompleteness().data?.next_step ?? null;
  const STEP_OF: Record<OnboardingStepKey, OnboardingStepNumber> = { basics: 1, history: 2, lifestyle: 3, reports: 4 };
  const unread = useUnreadCount().data ?? 0;
  // The newest reports: the dashboard shows the top three.
  const reportPages = useReportList();
  const recentItems = reportPages.data?.pages.flatMap((page) => page.items) ?? [];
  useNotificationStream();
  const scheme = useResolvedScheme();
  const p = scheme === 'dark' ? DARK : LIGHT;
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  // Coming back to Home always starts at the top.
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  // Each time Home comes into view, the rings animate again from empty.
  const [runId, setRunId] = useState(0);
  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setRunId((n) => n + 1);
  }, []));

  if (home.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: p.bg, paddingTop: insets.top + 20 }]}>
        <Skeleton height={44} style={{ width: '60%' }} />
        <Skeleton height={96} />
        <Skeleton height={180} />
        <Skeleton height={110} />
      </View>
    );
  }

  // The home request failed: show the reason and a retry, not an empty dashboard.
  if (home.isError) {
    return (
      <View style={[styles.container, { backgroundColor: p.bg, paddingTop: insets.top + 20 }]}>
        <Card p={p}>
          <Text style={[styles.cardTitle, { color: p.text }]}>We could not load your home</Text>
          <Text style={[styles.cardText, { color: p.muted }]}>Check your connection and try again.</Text>
          <Pressable accessibilityRole="button" onPress={() => void home.refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </Card>
      </View>
    );
  }

  const data = home.data;

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8, paddingBottom: Math.max(insets.bottom, 20) + 110 },
      ]}>
      <View style={styles.header}>
        <View>
          <ReovitaLeafLogo size={32} showWordmark showTagline={false} layout="horizontal" />
          <Text style={[styles.tagline, { color: p.muted }]}>Your Health, Our DNA</Text>
        </View>
        <View style={styles.headerActions}>
          <ThemeToggle scheme={scheme} onToggle={onToggleTheme} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push('/(app)/notifications')}
            style={[styles.bellBtn, { backgroundColor: p.card, borderColor: p.border }]}>
            <Ionicons name="notifications-outline" size={20} color={p.text} />
            {unread > 0 ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        </View>
      </View>

      {data?.critical_banner ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            data?.critical_report_id
              ? router.push({ pathname: '/(app)/reports/interpretation/[id]', params: { id: data.critical_report_id } })
              : router.push('/(app)/notifications')
          }
          style={[styles.alert, { backgroundColor: p.redSoft, borderColor: p.redBorder }]}>
          <PulseDot color={p.red} />
          <View style={styles.flex}>
            <Text style={[styles.alertTitle, { color: p.red }]}>Contact your doctor now!</Text>
            <Text style={[styles.alertText, { color: p.muted }]}>Critical findings in your report.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={p.red} />
        </Pressable>
      ) : null}

      {data && data.percent < 60 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(nextStep ? stepHref(STEP_OF[nextStep]) : '/(app)/reports/upload')}
          style={[styles.profile, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={styles.rowTop}>
            <Text style={[styles.cardTitle, styles.flex, { color: p.text }]}>Complete your profile</Text>
            <Ionicons name="chevron-forward" size={20} color={p.purple} />
          </View>
          <ProgressBar percent={data.percent} />
          <Text style={[styles.cardText, { color: p.muted }]}>{data.percent}% complete</Text>
        </Pressable>
      ) : null}

      {/* Hero: the health score, with a short message and the details button. */}
      <View style={[styles.hero, { backgroundColor: p.card, borderColor: p.border }]}>
        <View style={styles.heroTop}>
          <View style={[styles.heroPill, { backgroundColor: p.iconBg }]}>
            <Ionicons name="pulse" size={16} color={BRAND_GREEN} />
            <Text style={[styles.heroPillText, { color: BRAND_GREEN }]}>Health Score</Text>
          </View>
          <View style={styles.heroActions}>
            {/* Opens the score history: the trend graph and every saved score. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Score history"
              onPress={() => router.push('/(app)/health-score')}
              hitSlop={8}
              style={[styles.historyPill, { borderColor: p.border }]}>
              <Ionicons name="stats-chart" size={14} color={BRAND_GREEN} />
              <Text style={[styles.historyPillText, { color: BRAND_GREEN }]}>History</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="How is the score calculated" onPress={() => setScoreInfoOpen(true)} hitSlop={8}>
              <Ionicons name="information-circle-outline" size={22} color={p.muted} />
            </Pressable>
          </View>
        </View>
        <View style={styles.heroBody}>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: p.text }]}>{heroTitle(data?.health_score ? Number(data.health_score) : null)}</Text>
            <Text style={[styles.heroSub, { color: p.muted }]}>
              {data?.health_score ? heroSubtitle(Number(data.health_score)) : (data?.unlock_lines[0] ?? 'Add your details to see your score.')}
            </Text>
          </View>
          <ScoreRing p={p} score={data?.health_score ? Number(data.health_score) : null} runId={runId} />
        </View>
      </View>

      {/* The three parts: each card shows its ring and status, and opens the step that adds its information. */}
      <View style={styles.partsGrid}>
        {PART_CARDS.map((part) => {
          const score = data?.health_score_parts?.[part.key] ?? null;
          return (
            <Pressable
              key={part.key}
              accessibilityRole="button"
              onPress={() =>
                router.push(
                  part.route === '/(app)/reports/upload'
                    ? part.route
                    : { pathname: part.route, params: { edit: 'true' } },
                )
              }
              style={[styles.partCard, { backgroundColor: p.card, borderColor: p.border }]}>
              <PartRing p={p} label={part.label} icon={part.icon} score={score} runId={runId} />
              <View style={styles.partFooter}>
                <Text style={[styles.partStatus, { color: partStatusColor(score, p) }]}>{partStatus(score)}</Text>
                <Ionicons name="chevron-forward" size={16} color={p.muted} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <ProfileBmiCard />

      <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/briefings')}>
        <Card p={p}>
          <View style={styles.rowTop}>
            <IconBox p={p} name="partly-sunny-outline" color={p.lime} />
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: p.text }]}>Daily briefing</Text>
              <Text style={[styles.cardText, { color: p.muted }]}>Air quality, UV and heat for today.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={p.purple} />
          </View>
        </Card>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/measurements')}>
        <Card p={p}>
          <View style={styles.rowTop}>
            <IconBox p={p} name="heart-outline" color={p.lime} />
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: p.text }]}>Vitals</Text>
              <Text style={[styles.cardText, { color: p.muted }]}>Log your blood pressure and weight.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={p.purple} />
          </View>
        </Card>
      </Pressable>

      <Card p={p}>
        <View style={styles.rowTop}>
          <IconBox p={p} name="flask-outline" color={p.lime} />
          <Text style={[styles.cardTitle, styles.flex, { color: p.text }]}>Recent reports</Text>
        </View>
        {recentItems.length === 0 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/reports/upload')}>
            <Text style={[styles.cardText, { color: p.muted }]}>Upload a lab report to see its flags here.</Text>
          </Pressable>
        ) : (
          <View style={styles.recentList}>
            {recentItems.slice(0, 2).map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/(app)/reports/[id]', params: { id: item.id } })}
                style={[styles.recentRow, { borderColor: p.border }]}>
                <Text style={[styles.recentLabel, { color: p.text }]}>Report</Text>
                <Text style={[styles.cardText, { color: p.muted, marginTop: 0 }]}>{formatReportDate(item.created_at)}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/reports/list')}
              style={[styles.recentRow, { borderColor: p.border }]}>
              <Text style={[styles.recentLabel, { color: p.purple }]}>More</Text>
              <Ionicons name="chevron-forward" size={18} color={p.purple} />
            </Pressable>
          </View>
        )}
      </Card>
      <Modal visible={scoreInfoOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setScoreInfoOpen(false)}>
        <Pressable style={styles.infoBackdrop} onPress={() => setScoreInfoOpen(false)}>
          <Pressable style={[styles.infoSheet, { backgroundColor: p.card, borderColor: p.border }]} onPress={() => undefined}>
            <Text style={[styles.cardTitle, { color: p.text }]}>How your score is calculated</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              Your score is the average of three parts. A part only counts once you have added its information.
            </Text>
            <Text style={[styles.infoHead, { color: p.text }]}>Lifestyle (starts at 100)</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              Current smoker -5, former smoker -2. No exercise -3. High stress (4 or 5) -3. Poor sleep (1 or 2) -3.
            </Text>
            <Text style={[styles.infoHead, { color: p.text }]}>Medical history (starts at 100)</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              Diabetes -10, hypertension -10, heart disease -15, kidney disease -15, thyroid -5. Each condition you have is subtracted.
            </Text>
            <Text style={[styles.infoHead, { color: p.text }]}>Lab reports</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              Each result scores by its status: normal 100, watch 70, high or low 40, critical 10. Results older than 12 months count half, and results older than 24 months are not counted.
            </Text>
            <Text style={[styles.infoHead, { color: p.text }]}>Total</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              The average of the parts you have. Above 70 is green, 40 to 69 is amber, and below 40 is red.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setScoreInfoOpen(false)} style={styles.infoClose}>
              <Text style={styles.infoCloseText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16, flexGrow: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  tagline: { fontSize: 13, fontStyle: 'italic', marginTop: 2, marginLeft: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#84CC16',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  alertIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 16, fontWeight: '700' },
  alertText: { fontSize: 13, marginTop: 2 },
  profile: { padding: 16, borderRadius: 20, borderWidth: 1, gap: 8 },
  partsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  hero: { borderRadius: 24, borderWidth: 1, padding: 18, gap: 12, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  heroPillText: { fontSize: 13, fontWeight: '700' },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  historyPillText: { fontSize: 12.5, fontWeight: '700' },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroText: { flex: 1, gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroSub: { fontSize: 13, lineHeight: 18 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1.5 },
  viewBtnText: { fontSize: 13, fontWeight: '700' },
  partsGrid: { flexDirection: 'row', gap: 10 },
  partCard: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 12, alignItems: 'center', gap: 6 },
  partFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partStatus: { fontSize: 12, fontWeight: '700' },
  infoBackdrop: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', padding: 20 },
  infoSheet: { borderRadius: 22, borderWidth: 1, padding: 20, gap: 8 },
  infoHead: { fontSize: 14, fontWeight: '700', marginTop: 6 },
  infoClose: { marginTop: 12, height: 46, borderRadius: 16, backgroundColor: '#1F6F3F', alignItems: 'center', justifyContent: 'center' },
  infoCloseText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  partRingCell: { alignItems: 'center', gap: 8 },
  partRingBox: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  partRingIcon: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  partRingLabel: { fontSize: 12.5, fontWeight: '600' },
  recentList: { gap: 8, marginTop: 4 },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  recentLabel: { fontSize: 14, fontWeight: '600' },
  card: { padding: 18, borderRadius: 22, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardText: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scoreTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreValue: { fontSize: 44, fontWeight: '800', letterSpacing: 2 },
  ringWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  // Rotating the whole SVG (not a group inside it) starts the arc at the top. Works on web too.
  ringRotate: { transform: [{ rotate: '-90deg' }] },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  retry: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 18, height: 40, borderRadius: 20, backgroundColor: '#1F6F3F', justifyContent: 'center' },
  retryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

function formatReportDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
