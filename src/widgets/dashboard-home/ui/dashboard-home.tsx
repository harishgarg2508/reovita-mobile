import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHome } from '@entities/home';
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
function ScoreRing({ p, score }: { p: Palette; score: number | null }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const fraction = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <View style={styles.ringWrap}>
      <View style={styles.ringRotate}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx="60" cy="60" r={radius} stroke={p.track} strokeWidth={10} fill="none" />
          <Circle
            cx="60"
            cy="60"
            r={radius}
            stroke={p.lime}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
          />
        </Svg>
      </View>
      <View style={styles.ringCenter}>
        <Ionicons name="heart" size={34} color={p.text} />
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

// Dashboard: header, the most urgent card first, then the health score, briefing and reports.
export function DashboardHome({ onToggleTheme }: { onToggleTheme: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const home = useHome();
  const unread = useUnreadCount().data ?? 0;
  useNotificationStream();
  const scheme = useResolvedScheme();
  const p = scheme === 'dark' ? DARK : LIGHT;

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
          onPress={() => router.push('/(app)/reports/upload')}
          style={[styles.profile, { backgroundColor: p.card, borderColor: p.border }]}>
          <Text style={[styles.cardTitle, { color: p.text }]}>Complete your profile</Text>
          <ProgressBar percent={data.percent} />
          <Text style={[styles.cardText, { color: p.muted }]}>{data.percent}% complete</Text>
        </Pressable>
      ) : null}

      <Card p={p}>
        <View style={styles.scoreTop}>
          <IconBox p={p} name="pulse" color={p.lime} />
          <Text style={[styles.cardTitle, { color: p.text }]}>Health Score</Text>
        </View>
        <View style={styles.scoreBody}>
          <View style={styles.flex}>
            <Text style={[styles.scoreValue, { color: p.text }]}>{data?.health_score ?? '--'}</Text>
            <Text style={[styles.cardText, { color: p.muted }]}>
              {data?.health_score ? 'Your overall health score' : (data?.unlock_lines[0] ?? 'No data available')}
            </Text>
          </View>
          <ScoreRing p={p} score={data?.health_score ? Number(data.health_score) : null} />
        </View>
      </Card>

      <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/briefings')}>
        <Card p={p}>
          <View style={styles.rowTop}>
            <IconBox p={p} name="document-text-outline" color={p.purple} />
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: p.text }]}>Today&apos;s briefing</Text>
              <Text style={[styles.cardText, { color: p.muted }]}>
                {data?.briefing ?? 'Your daily environment briefing will appear here.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={p.purple} />
          </View>
        </Card>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/reports/upload')}>
        <Card p={p}>
          <View style={styles.rowTop}>
            <IconBox p={p} name="flask-outline" color={p.lime} />
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: p.text }]}>Recent reports</Text>
              <Text style={[styles.cardText, { color: p.muted }]}>
                {data && data.reports_count > 0
                  ? `${data.reports_count} report${data.reports_count === 1 ? '' : 's'} uploaded`
                  : 'Upload a lab report to see its flags here.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={p.purple} />
          </View>
        </Card>
      </Pressable>
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
