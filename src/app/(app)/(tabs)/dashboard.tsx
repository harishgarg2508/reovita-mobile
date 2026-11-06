import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHome } from '@entities/home';
import { themeModeSet } from '@entities/preferences';
import { useAppDispatch } from '@app-root/store';
import { Ionicons } from '@expo/vector-icons';
import { ReovitaLeafLogo } from '@shared/ui';
import { Skeleton } from '@shared/ui/skeleton';
import { ThemeToggle, useResolvedScheme } from '@shared/ui/theme';
import { Brand } from '@shared/ui/theme/tokens';
import { CompletenessBanner } from '@widgets/completeness-banner';
import { CriticalHealthBanner } from '@widgets/critical-health-banner';
import { HealthScoreCard } from '@widgets/health-score-card';
import { LatestBriefingCard } from '@widgets/latest-briefing-card';
import { ReportTimelineList } from '@widgets/report-timeline-list';

/**
 * Reovita Home Dashboard.
 * Exact recreation of Screen 2 from the Figma Design System:
 * - Top header with horizontal Reovita Leaf Logo & Notification Bell
 * - Animated bell wiggle on load to draw attention to unread alert
 * - Critical health alert card ("Contact your doctor now!")
 * - "Complete Your Profile" amber card
 * - Health Score 92/100 card with lime circular gauge & pulsing heart
 * - Daily Briefing card with "High" badge
 */
export default function DashboardRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const home = useHome();
  const scheme = useResolvedScheme();
  const dispatch = useAppDispatch();
  const pageBg = scheme === 'dark' ? '#0E0E12' : Brand.surface;

  // Bell shake animation on screen mount
  const [bellShake] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const shakeAnim = Animated.sequence([
      Animated.delay(400),
      Animated.timing(bellShake, { toValue: -12, duration: 80, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: 12, duration: 80, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: -8, duration: 80, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: 8, duration: 80, useNativeDriver: true }),
      Animated.timing(bellShake, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]);
    shakeAnim.start();
  }, [bellShake]);

  if (home.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: pageBg, paddingTop: insets.top + 20 }]}>
        <Skeleton height={28} style={{ width: '50%' }} />
        <Skeleton height={160} />
        <Skeleton height={96} />
      </View>
    );
  }

  const data = home.data;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          backgroundColor: pageBg,
          paddingTop: Math.max(insets.top, 20) + 8,
          paddingBottom: Math.max(insets.bottom, 20) + 96,
        },
      ]}>
      {/* Top Header Bar: Reovita Leaf Logo + Notification Bell */}
      <View style={styles.topHeader}>
        <ReovitaLeafLogo size={32} showWordmark showTagline={false} layout="horizontal" />

        <View style={styles.headerActions}>
          <ThemeToggle
            scheme={scheme}
            onToggle={() => dispatch(themeModeSet(scheme === 'dark' ? 'light' : 'dark'))}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push('/(app)/notifications')}
            style={styles.bellBtn}>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: bellShake.interpolate({
                      inputRange: [-15, 15],
                      outputRange: ['-15deg', '15deg'],
                    }),
                  },
                ],
              }}>
              <Ionicons name="notifications-outline" size={19} color="#171717" />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* Critical Findings banner: only when the server flags critical values */}
      {data?.critical_banner ? <CriticalHealthBanner /> : null}

      {/* Profile Incomplete Banner: shown only when the server asks for it */}
      {data?.banner === 'amber' ? <CompletenessBanner /> : null}

      {/* Health Score Card: real score, or the unlock hint until a report is confirmed */}
      <HealthScoreCard score={data?.health_score ?? null} unlockLine={data?.unlock_lines[0]} />

      {/* Latest Daily Briefing Card: only when the server has a briefing */}
      {data?.briefing ? <LatestBriefingCard briefing={data.briefing} /> : null}

      {/* Timeline of Reports */}
      {data?.recent_flags && data.recent_flags.length > 0 && (
        <ReportTimelineList flags={data.recent_flags} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 16,
    flexGrow: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: 4,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEAEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
});
