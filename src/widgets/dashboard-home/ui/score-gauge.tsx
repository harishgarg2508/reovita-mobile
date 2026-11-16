import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { SCORE_ZONES } from '@entities/score';

// Only these two colours are needed, so any theme palette fits.
interface GaugeColors {
  text: string;
  muted: string;
}

// A speedometer for a score from 0 to 100. It shows no numbers on purpose: the needle and the colours are the message. The dial is a half circle in three coloured zones, the same bands as the headline
// (below 40 needs attention, 40 to 69 keep improving, 70 and above good), and a needle points at the score. Reading it needs no
// explanation: the needle in the green is healthy, in the amber is one to work on, in the red needs attention.
const ZONES = SCORE_ZONES;

const SIZES = {
  large: { width: 132, height: 78, radius: 54, stroke: 13, needle: 3.2, hub: 6 },
  small: { width: 78, height: 48, radius: 31, stroke: 8, needle: 2.4, hub: 4 },
};

// Animates a 0..1 value from 0 up to the target. It runs again each time runId changes (each time Home is opened), so the
// needle sweeps in whenever the screen is shown, and eases to a new value when the score changes.
function useAnimatedFraction(target: number, runId: number): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
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

// A point on the dial. Score 0 is the left end, 100 the right end, 50 the top.
function point(cx: number, cy: number, r: number, score: number) {
  const angle = Math.PI * (1 - score / 100);
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const a = point(cx, cy, r, from);
  const b = point(cx, cy, r, to);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

// The word for a score, the same bands as the dial: Normal, Watch or Critical. Null when there is no score yet.
export function bandLabel(score: number | null): string | null {
  if (score === null) return null;
  return (ZONES.find((z) => score <= z.to) ?? ZONES[ZONES.length - 1]).word;
}

export function ScoreGauge({ p, score, runId, size }: { p: GaugeColors; score: number | null; runId: number; size: 'large' | 'small' }) {
  const d = SIZES[size];
  const target = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const shown = useAnimatedFraction(target, runId);
  const cx = d.width / 2;
  const cy = d.height - d.hub - 2;
  const tip = point(cx, cy, d.radius - d.stroke / 2 - 1, shown * 100);
  const activeZone = score === null ? -1 : ZONES.findIndex((z) => score <= z.to);

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={score === null ? 'Health gauge: no score yet' : `Health gauge: ${bandLabel(score)}`}>
      <Svg width={d.width} height={d.height} viewBox={`0 0 ${d.width} ${d.height}`}>
        {ZONES.map((z, i) => (
          <Path
            key={z.from}
            // A small gap between zones, so each one reads as its own band.
            d={arc(cx, cy, d.radius, z.from + (i === 0 ? 0 : 0.9), z.to - (i === ZONES.length - 1 ? 0 : 0.9))}
            stroke={z.color}
            strokeWidth={d.stroke}
            strokeOpacity={i === activeZone ? 1 : 0.32}
            fill="none"
          />
        ))}
        {score !== null ? (
          <>
            <Line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke={p.text} strokeWidth={d.needle} strokeLinecap="round" />
            <Circle cx={cx} cy={cy} r={d.hub} fill={p.text} />
          </>
        ) : (
          <Circle cx={cx} cy={cy} r={d.hub} fill={p.muted} />
        )}
      </Svg>
      {size === 'large' ? (
        <Text style={[styles.word, { color: score === null ? p.muted : ZONES[Math.max(activeZone, 0)].color }]}>{bandLabel(score) ?? 'No score yet'}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4 },
  word: { fontSize: 15, fontWeight: '800' },
});
