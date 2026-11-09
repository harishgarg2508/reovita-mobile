import { USE_NATIVE_DRIVER } from '@shared/lib';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

/**
 * Reovita Health Score Card.
 * Exact recreation of Screen 2 (Home Dashboard) with pulsing heartbeat animation:
 * - Health Score number (92 / 100) with green up-trend arrow
 * - "↑ +5% from last week" trend indicator
 * - Lime green circular gauge ring with pulsing black heart
 * - "Your health is getting better!" status pill with green check badge
 */
// Shows the server score. When there is none yet, shows an empty state with the unlock hint.
export function HealthScoreCard({ score, unlockLine }: { score: string | null; unlockLine?: string }) {
  const hasScore = score !== null;

  // Heartbeat pulsing animation
  const [heartScale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.18,
          duration: 350,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 350,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(heartScale, {
          toValue: 1.1,
          duration: 250,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 850,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [heartScale]);

  return (
    <View style={styles.card}>
      <Text style={styles.headerTitle}>Health Score</Text>

      <View style={styles.contentRow}>
        {/* Left Side: Score & Trend */}
        <View style={styles.scoreCol}>
          <View style={styles.scoreNumberRow}>
            <Text style={styles.scoreValue}>{hasScore ? score : '--'}</Text>
            {hasScore ? <Text style={styles.scoreDenominator}>/100</Text> : null}
          </View>

          {!hasScore && unlockLine ? <Text style={styles.unlockText}>{unlockLine}</Text> : null}
        </View>

        {/* Right Side: Circular Gauge Ring with Pulsing Heart */}
        <View style={styles.gaugeContainer}>
          {/* Lime circular track */}
          <View style={styles.gaugeOuterRing}>
            <View style={styles.gaugeInnerHole}>
              {/* Pulsing Black Heart */}
              <Animated.Text
                style={[
                  styles.heartSymbol,
                  { transform: [{ scale: heartScale }] },
                ]}>
                ♥
              </Animated.Text>
            </View>
          </View>
        </View>
      </View>

      {/* Wellness status: only shown once a score exists */}
      {hasScore ? (
        <View style={styles.statusPill}>
          <View style={styles.statusCheckCircle}>
            <Text style={styles.statusCheckMark}>✓</Text>
          </View>
          <Text style={styles.statusText}>Your health is getting better!</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#ECEAEF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scoreCol: {
    justifyContent: 'center',
    flex: 1,
    paddingRight: 12,
  },
  scoreNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 6,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#171717',
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  upArrow: {
    fontSize: 22,
    fontWeight: '800',
    color: '#84CC16',
  },
  scoreDenominator: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E929A',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendGreenText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#65A30D',
  },
  gaugeContainer: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeOuterRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 9,
    borderColor: '#D4FF3F',
    borderBottomColor: '#F0F9DB',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  gaugeInnerHole: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  heartSymbol: {
    fontSize: 32,
    color: '#171717',
    lineHeight: 34,
  },
  unlockText: {
    width: '100%',
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#60646C',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF9D5',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  statusCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#65A30D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCheckMark: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#365314',
  },
});
