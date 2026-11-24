import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryKeys } from '@shared/api';
import { useHome } from '@entities/home';
import { useProfileCompleteness, type OnboardingStepKey } from '@entities/profile';
import { stepHref, type OnboardingStepNumber } from '@features/onboarding-step';
import { bmi, useProfileStepSaved } from '@features/profile-details';
import { SOCIAL_HOME } from '@features/social';
import { SCORE_ZONES } from '@entities/score';
import { ScoreGauge } from './score-gauge';
import { useNotificationStream, useUnreadCount } from '@entities/notification';
import { useMyHandle, useSocialUnread } from '@entities/social';
import { USE_NATIVE_DRIVER } from '@shared/lib';
import { ProgressBar } from '@shared/ui/progress-bar';
import { Skeleton } from '@shared/ui/skeleton';
import { Gap, Rule, ThemeToggle, Type, useResolvedScheme } from '@shared/ui/theme';
import { PremiumBadge, useSubscription } from '@entities/subscription';

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
  bg: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E8E6EF',
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


interface ToolCardProps {
  p: Palette;
  icon: keyof typeof Ionicons.glyphMap;
  // An icon from the Material Community set, used when Ionicons has no matching glyph (it takes the place of `icon`).
  mciIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  badge?: { text: string; bg: string; color: string };
  subtitle: string;
  right?: React.ReactNode;
  // true: no chevron at the right edge (the row shows only what `right` holds).
  noChevron?: boolean;
  onPress: () => void;
  label?: string;
}

function ToolCard({ p, icon, mciIcon, iconBg, iconColor, title, badge, subtitle, right, noChevron, onPress, label }: ToolCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolCard,
        {
          backgroundColor: p.card,
          borderColor: p.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}>
      {/* Left Icon Tile */}
      <View style={[styles.toolIconTile, { backgroundColor: iconBg }]}>
        {mciIcon ? <MaterialCommunityIcons name={mciIcon} size={26} color={iconColor} /> : <Ionicons name={icon} size={24} color={iconColor} />}
      </View>

      {/* Center Details */}
      <View style={styles.toolContent}>
        <View style={styles.toolTitleRow}>
          <Text style={[styles.toolTitle, { color: p.text }]}>{title}</Text>
          {badge ? (
            <View style={[styles.toolBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.toolBadgeText, { color: badge.color }]}>{badge.text}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={[styles.toolSubtitle, { color: p.muted }]}>
          {subtitle}
        </Text>
      </View>

      {/* Right Element + Chevron */}
      <View style={styles.toolRightRow}>
        {right}
        {noChevron ? null : <Ionicons name="chevron-forward" size={18} color={p.muted} />}
      </View>
    </Pressable>
  );
}

// The count shown on a row: nothing for none, the number up to 9, then 10+, 20+, 30+ and so on in steps of ten.
function countLabel(count: number): string {
  return count < 10 ? String(count) : `${Math.floor(count / 10) * 10}+`;
}

function BmiToolCard({ p, scheme }: { p: Palette; scheme: 'light' | 'dark' }) {
  const router = useRouter();
  const basics = useProfileStepSaved(1);
  const d = basics.data ?? {};
  const value = bmi(d.height_cm, d.weight_kg);
  const numeric = value !== null ? Number(value) : null;

  let badgeText = 'HEALTHY';
  let badgeBg = scheme === 'dark' ? '#0F3522' : '#DCFCE7';
  let badgeColor = scheme === 'dark' ? '#4ADE80' : '#15803D';
  let subtitle = 'Healthy weight range';

  if (numeric === null) {
    badgeText = 'SET UP';
    badgeBg = scheme === 'dark' ? '#13344F' : '#E0F2FE';
    badgeColor = scheme === 'dark' ? '#38BDF8' : '#0369A1';
    subtitle = 'Add height and weight';
  } else if (numeric < 18.5) {
    badgeText = 'BELOW';
    badgeBg = scheme === 'dark' ? '#443209' : '#FEF3C7';
    badgeColor = scheme === 'dark' ? '#FBBF24' : '#B45309';
    subtitle = 'Below healthy range';
  } else if (numeric < 25) {
    badgeText = 'HEALTHY';
    badgeBg = scheme === 'dark' ? '#0F3522' : '#DCFCE7';
    badgeColor = scheme === 'dark' ? '#4ADE80' : '#15803D';
    subtitle = 'Healthy weight range';
  } else if (numeric < 30) {
    badgeText = 'ABOVE';
    badgeBg = scheme === 'dark' ? '#3D1E0C' : '#FED7AA';
    badgeColor = scheme === 'dark' ? '#FB923C' : '#C2410C';
    subtitle = 'Above healthy range';
  } else {
    badgeText = 'HIGH';
    badgeBg = scheme === 'dark' ? '#3D1822' : '#FEE2E2';
    badgeColor = scheme === 'dark' ? '#FB7185' : '#B91C1C';
    subtitle = 'Well above healthy range';
  }

  return (
    <ToolCard
      p={p}
      icon="accessibility-outline"
      iconBg={scheme === 'dark' ? '#0D2E1C' : '#E6F9F0'}
      iconColor={scheme === 'dark' ? '#34D399' : '#059669'}
      title="BMI"
      badge={{ text: badgeText, bg: badgeBg, color: badgeColor }}
      subtitle={subtitle}
      right={numeric !== null ? <Text style={[styles.toolBigValue, { color: p.text }]}>{value}</Text> : null}
      onPress={() => router.push({ pathname: '/onboarding/step-1', params: { edit: 'true' } })}
      label="Body mass index. Open basic details"
    />
  );
}

// One small speedometer for a score part (lifestyle, conditions or reports), with its icon and name under the dial.
function PartGauge({ p, label, icon, score, runId }: { p: Palette; label: string; icon: keyof typeof Ionicons.glyphMap; score: number | null; runId: number }) {
  return (
    <View style={styles.partGaugeCell}>
      <ScoreGauge p={p} score={score} runId={runId} size="small" />
      <View style={styles.partGaugeLabel}>
        <Ionicons name={icon} size={14} color={score === null ? p.muted : p.text} />
        <Text style={[styles.partRingLabel, { color: p.muted }]}>{label}</Text>
      </View>
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
  if (score >= 70) return 'Normal';
  if (score >= 40) return 'Watch';
  return 'Critical';
}

function partStatusColor(score: number | null, p: Palette): string {
  if (score === null) return p.purple;
  if (score >= 70) return '#1F7A3E';
  if (score >= 40) return '#B26A00';
  return p.red;
}

// Dashboard: header, the most urgent card first, then the health score, briefing and reports.
// `greeting` is drawn at the left of the header. It is passed in from the route, so the name of the person is read in one place only (the app-shell widget).
export function DashboardHome({ onToggleTheme, greeting }: { onToggleTheme: (origin?: { x: number; y: number }) => void; greeting?: React.ReactNode }) {
  const router = useRouter();
  // A free account sees a lock on each Premium card, and tapping it opens the plan screen. While the plan is still loading nothing shows locked.
  const plan = useSubscription();
  const openPremium = (route: string) => router.push((plan.locked ? '/(app)/subscription' : route) as never);
  const insets = useSafeAreaInsets();
  const home = useHome();
  const queryClient = useQueryClient();
  // The first unfinished onboarding step, from the status endpoint. The profile card opens it.
  const nextStep = useProfileCompleteness().data?.next_step ?? null;
  const STEP_OF: Record<OnboardingStepKey, OnboardingStepNumber> = { basics: 1, history: 2, lifestyle: 3, reports: 4 };
  const unread = useUnreadCount().data ?? 0;
  // The notices of Social (kudos, comments, friend requests, invitations), shown on the Social row. Asked for only when there is a Social account.
  const socialMe = useMyHandle();
  const socialUnread = useSocialUnread(socialMe.joined).data;
  const socialNew = (socialUnread?.unread ?? 0) + (socialUnread?.requests ?? 0);
  useNotificationStream();
  const scheme = useResolvedScheme();
  const p = scheme === 'dark' ? DARK : LIGHT;
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  // Coming back to Home always starts at the top.
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  // Each time Home comes into view, the dials sweep in again from empty.
  const [runId, setRunId] = useState(0);
  // Each time Home comes into view the data is asked for again. The server works the score out from what is saved at that moment,
  // so a report added or deleted, or a step changed, since the last visit shows in the score right away. A request that is already
  // running (the first load) is left alone rather than restarted.
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setRunId((n) => n + 1);
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.root }, { cancelRefetch: false });
      void queryClient.invalidateQueries({ queryKey: queryKeys.score.root }, { cancelRefetch: false });
    }, [queryClient]),
  );

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
  // A score exists, but no lab report has added its part yet.
  const partialScore = !!data?.health_score && data?.health_score_parts?.reports == null;

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: p.bg, paddingTop: Math.max(insets.top, 20) + 8, paddingBottom: Math.max(insets.bottom, 20) + 110 },
      ]}>
      <View style={styles.header}>
        {greeting}
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
          <Text style={[Type.label, { color: p.muted }]}>Health score</Text>
          <View style={styles.heroActions}>
            {/* Opens the score history: the trend graph and every saved score. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Score history"
              onPress={() => router.push('/(app)/health-score')}
              hitSlop={8}
              style={styles.historyLink}>
              <Text style={[Type.label, { color: BRAND_GREEN }]}>History</Text>
              <Ionicons name="chevron-forward" size={14} color={BRAND_GREEN} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="How is the score calculated" onPress={() => setScoreInfoOpen(true)} hitSlop={8}>
              <Ionicons name="information-circle-outline" size={22} color={p.muted} />
            </Pressable>
          </View>
        </View>
        <View style={styles.heroBody}>
          <View style={styles.heroText}>
            {/* Without lab results the score covers only lifestyle and conditions, so it is not called "healthy". */}
            <Text style={[styles.heroTitle, { color: p.text }]}>
              {partialScore ? 'Partial score' : heroTitle(data?.health_score ? Number(data.health_score) : null)}
            </Text>
            <Text style={[styles.heroSub, { color: p.muted }]}>
              {partialScore
                ? 'Based on your lifestyle and conditions only. Add a lab report to complete it.'
                : data?.health_score
                  ? heroSubtitle(Number(data.health_score))
                  : (data?.unlock_lines[0] ?? 'Add your details to see your score.')}
            </Text>
          </View>
          <ScoreGauge p={p} score={data?.health_score ? Number(data.health_score) : null} runId={runId} size="large" />
        </View>
      </View>

      {/* The three parts: each card shows its dial and status, and opens the step that adds its information. */}
      <View style={[styles.partsGrid, { borderColor: p.border }]}>
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
              style={styles.partCard}>
              <PartGauge p={p} label={part.label} icon={part.icon} score={score} runId={runId} />
              <View style={styles.partFooter}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[styles.partStatus, { color: partStatusColor(score, p) }]}>
                  {partStatus(score)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={p.muted} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.toolsList}>
        <Text style={[styles.sectionTitle, { color: p.text }]}>Metrics & Tools</Text>

        {/* BMI Card */}
        <BmiToolCard p={p} scheme={scheme} />

        {/* Vitals Card */}
        <ToolCard
          p={p}
          icon="pulse-outline"
          mciIcon="heart-pulse"
          iconBg={scheme === 'dark' ? '#351219' : '#FEE2E2'}
          iconColor={scheme === 'dark' ? '#FB7185' : '#E11D48'}
          title="Vitals"
          subtitle="Blood pressure and weight"
          onPress={() => router.push('/(app)/measurements')}
        />

        {/* Medication check */}
        <ToolCard
          p={p}
          icon="medical-outline"
          mciIcon="pill"
          iconBg={scheme === 'dark' ? '#0E283E' : '#E0F2FE'}
          iconColor={scheme === 'dark' ? '#38BDF8' : '#0284C7'}
          title="Medication check"
          subtitle="Medicine interactions"
          onPress={() => router.push('/(app)/medication-interactions')}
        />

        {/* Social */}
        <ToolCard
          p={p}
          icon="people-outline"
          iconBg={scheme === 'dark' ? '#27153D' : '#F3E8FF'}
          iconColor={scheme === 'dark' ? '#C084FC' : '#9333EA'}
          title="Social"
          subtitle="Share and cheer others on"
          right={
            // The notification count of Social, before the chevron, only when there is something new.
            socialNew > 0 ? (
              <View accessibilityLabel={`${socialNew} new`} style={[styles.toolCountPill, { backgroundColor: p.red }]}>
                <Text style={[styles.toolCountText, { color: '#FFFFFF' }]}>{countLabel(socialNew)}</Text>
              </View>
            ) : null
          }
          onPress={() => router.push(SOCIAL_HOME)}
        />

        {/* Recent reports */}
        <ToolCard
          p={p}
          icon="document-text-outline"
          iconBg={scheme === 'dark' ? '#0B2E28' : '#CCFBF1'}
          iconColor={scheme === 'dark' ? '#2DD4BF' : '#0D9488'}
          title="Recent reports"
          subtitle="Your uploaded reports"
          right={
            (data?.reports_count ?? 0) > 0 ? (
              <View style={[styles.toolCountPill, { backgroundColor: scheme === 'dark' ? '#1F1D33' : '#F1F5F9' }]}>
                <Text style={[styles.toolCountText, { color: scheme === 'dark' ? '#A9A3C8' : '#475569' }]}>{countLabel(data?.reports_count ?? 0)}</Text>
              </View>
            ) : null
          }
          onPress={() => router.push('/(app)/reports/list')}
        />

        {/* Health log: a free feature, the events, medicines and reports the person keeps. */}
        <ToolCard
          p={p}
          icon="journal-outline"
          iconBg={scheme === 'dark' ? '#14213D' : '#E0E7FF'}
          iconColor={scheme === 'dark' ? '#818CF8' : '#4F46E5'}
          title="Health log"
          subtitle="Visits, medicines and reports"
          onPress={() => router.push('/(app)/medical-history')}
        />

        {/* Scan my meal */}
        <ToolCard
          p={p}
          icon="restaurant-outline"
          iconBg={scheme === 'dark' ? '#362608' : '#FEF3C7'}
          iconColor={scheme === 'dark' ? '#FBBF24' : '#D97706'}
          title="Scan my meal"
          subtitle="Calories and protein"
          right={plan.locked ? <PremiumBadge /> : null}
          onPress={() => openPremium('/(app)/meal-scan')}
        />

        {/* Scan my fridge */}
        <ToolCard
          p={p}
          icon="nutrition-outline"
          iconBg={scheme === 'dark' ? '#0F2C1F' : '#DCFCE7'}
          iconColor={scheme === 'dark' ? '#34D399' : '#16A34A'}
          title="Scan my fridge"
          subtitle="Simple meals to cook"
          right={plan.locked ? <PremiumBadge /> : null}
          onPress={() => openPremium('/(app)/fridge-scan')}
        />

        {/* Dietary guidance */}
        <ToolCard
          p={p}
          icon="leaf-outline"
          mciIcon="bowl-mix-outline"
          iconBg={scheme === 'dark' ? '#1E2C0C' : '#ECFCCB'}
          iconColor={scheme === 'dark' ? '#A3E635' : '#65A30D'}
          title="Dietary guidance"
          subtitle="A one-day plan for your goal"
          right={plan.locked ? <PremiumBadge /> : null}
          onPress={() => openPremium('/(app)/dietary-guidance')}
        />

        {/* Daily briefing */}
        <ToolCard
          p={p}
          icon="partly-sunny-outline"
          iconBg={scheme === 'dark' ? '#362608' : '#FEF3C7'}
          iconColor={scheme === 'dark' ? '#FBBF24' : '#D97706'}
          title="Daily briefing"
          subtitle="Air, UV and heat today"
          right={plan.locked ? <PremiumBadge /> : null}
          onPress={() => openPremium('/(app)/briefings')}
        />
      </View>

      <Modal visible={scoreInfoOpen} animationType="fade" transparent onRequestClose={() => setScoreInfoOpen(false)}>
        <Pressable style={styles.infoBackdrop} onPress={() => setScoreInfoOpen(false)}>
          <Pressable style={[styles.infoSheet, { backgroundColor: p.card, borderColor: p.border, maxHeight: '85%' }]} onPress={() => undefined}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.infoBody}>
            <Text style={[styles.cardTitle, { color: p.text }]}>How your score is calculated</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              Your score is shown as an indicator, Normal, Watch or Critical, from the three parts below. A part only counts once you have
              added its information. Until a lab report is added, the score is labelled Partial, because it covers only lifestyle and conditions.
            </Text>
            <Text style={[styles.infoHead, { color: p.text }]}>Lifestyle</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              Smoking lowers this part the most, then no exercise, high stress and too little sleep. Mostly sitting, a lot of sleep and having
              stopped smoking lower it a little.
            </Text>
            <Text style={[styles.infoHead, { color: p.text }]}>Medical history</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              Each condition you have lowers this part. Heart and kidney disease lower it the most, then diabetes and high blood pressure,
              then thyroid conditions. Family history and medications are saved, but they do not change the score yet.
            </Text>
            <Text style={[styles.infoHead, { color: p.text }]}>Lab reports</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              Each result counts by its indicator: Normal counts the most, then Watch, then High or Low, then Critical. Results are grouped
              (blood count, cardiovascular, metabolic, inflammatory, thyroid, kidney, and other), and each group is averaged. Results older
              than a year count half, and results older than two years are not counted.
            </Text>
            <Text style={[styles.infoHead, { color: p.text }]}>Note</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              This weighting is provisional and is being reviewed by a clinician. It is not a diagnosis.
            </Text>
            <Text style={[styles.infoHead, { color: p.text }]}>Total</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              The average of the parts you have, shown as one of these indicators:
            </Text>
            {/* The same three bands and colours as the dial and the history graph. */}
            <View style={styles.legend}>
              {[...SCORE_ZONES].reverse().map((zone) => (
                <View key={zone.word} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: zone.color }]} />
                  <Text style={[styles.cardText, { color: p.muted }]}>
                    <Text style={{ color: zone.color, fontWeight: '800' }}>{zone.word}</Text>
                    {zone.word === 'Normal' ? ': you are on track' : zone.word === 'Watch' ? ': worth some attention' : ': needs attention soon'}
                  </Text>
                </View>
              ))}
            </View>
            </ScrollView>
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
  // One even gap between every card.
  container: { paddingHorizontal: Gap.edge, gap: Gap.inner + 4, flexGrow: 1 },
  block: { gap: 2, marginBottom: -Gap.inner },
  list: { borderTopWidth: Rule },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: Rule },
  listIcon: { width: 28, alignItems: 'center' },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  rowBadgeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
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
  hero: { borderRadius: 24, borderWidth: Rule, padding: 20, gap: 14, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  heroPillText: { fontSize: 13, fontWeight: '700' },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  historyPillText: { fontSize: 12.5, fontWeight: '700' },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroText: { flex: 1, gap: 8 },
  heroTitle: { ...Type.title, fontSize: 24, lineHeight: 30 },
  heroSub: { ...Type.small },
  viewBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1.5 },
  viewBtnText: { fontSize: 13, fontWeight: '700' },
  partsGrid: { flexDirection: 'row', borderTopWidth: Rule, borderBottomWidth: Rule, paddingVertical: 14 },
  partCard: { flex: 1, alignItems: 'center', gap: 6 },
  // Status text and arrow on one centred line.
  partFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' },
  partStatus: { ...Type.label, flexShrink: 1 },
  infoBackdrop: { flex: 1, backgroundColor: 'rgba(15, 12, 24, 0.45)', justifyContent: 'center', padding: 20, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as object) : {}), },
  infoSheet: { borderRadius: 22, borderWidth: 1, padding: 20, gap: 8, flexShrink: 1 },
  infoBody: { gap: 8, paddingBottom: 4 },
  legend: { gap: 6, marginTop: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  infoHead: { fontSize: 14, fontWeight: '700', marginTop: 6 },
  infoClose: { marginTop: 12, height: 46, borderRadius: 16, backgroundColor: '#1F6F3F', alignItems: 'center', justifyContent: 'center' },
  infoCloseText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  partGaugeCell: { alignItems: 'center', gap: 8 },
  partGaugeLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partRingLabel: { ...Type.label },
  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  recentLabel: { fontSize: 14, fontWeight: '600' },
  card: { padding: 18, borderRadius: 22, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardText: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  iconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scoreTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreValue: { fontSize: 44, fontWeight: '800', letterSpacing: 2 },
  // Rotating the whole SVG (not a group inside it) starts the arc at the top. Works on web too.
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  premiumHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  premiumTitle: { fontSize: 15, fontWeight: '800' },
  premiumHint: { fontSize: 12.5 },
  retry: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 18, height: 40, borderRadius: 20, backgroundColor: '#1F6F3F', justifyContent: 'center' },
  retryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: 10, marginBottom: 4 },
  toolsList: { gap: 12 },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  toolIconTile: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolContent: {
    flex: 1,
    gap: 2,
  },
  toolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  toolSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  toolRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  toolBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toolBigValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginRight: 2,
  },
  toolLogBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 2,
  },
  toolLogBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  toolIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  toolCountPill: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  toolCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 2,
  },
  avatarDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
