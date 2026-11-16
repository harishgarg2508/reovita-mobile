import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { fmt, place, SCALES } from '../model/reading-labels';
import type { BriefingColors } from './briefing-theme';
import { StatusChip } from './metric-tile';

// A round dial: a ring that is open at the bottom, like a speedometer, 270 degrees long. The ring fills from the lower left,
// clockwise, up to where today's value sits, in a green to red gradient, and a dot marks the end. The value and its name are
// centred inside the ring, and the band's name sits under it.
const SIZE = 132;
const CENTER = SIZE / 2;
const RADIUS = 52;
const STROKE = 11;
const START_DEG = 135; // lower left; angles run clockwise from the right, as the screen draws them
const SWEEP_DEG = 270;
// The ring is open at the bottom, so the picture does not need the full height.
const HEIGHT = CENTER + RADIUS * Math.sin((45 * Math.PI) / 180) + STROKE / 2 + 2;

function point(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CENTER + RADIUS * Math.cos(rad), y: CENTER + RADIUS * Math.sin(rad) };
}

// An arc along the ring from `from` to `to`, as fractions (0 to 1) of the 270 degrees.
function arc(from: number, to: number): string {
  const a = START_DEG + SWEEP_DEG * from;
  const b = START_DEG + SWEEP_DEG * to;
  const start = point(a);
  const end = point(b);
  const large = b - a > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function AqiGauge({ aqi, colors }: { aqi: number; colors: BriefingColors }) {
  const placed = place(SCALES.aqi, aqi);
  // A little of the ring is always filled, so a very low value still shows.
  const filled = Math.max(0.04, Math.min(placed.position, 0.999));
  const dot = point(START_DEG + SWEEP_DEG * filled);
  const track = colors.dark ? '#1E3427' : '#EAF2E6';

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Air quality index ${fmt.aqi(aqi)}, ${placed.band.label}`}>
      <View style={styles.dial}>
        <Svg width={SIZE} height={HEIGHT} viewBox={`0 0 ${SIZE} ${HEIGHT}`}>
          <Defs>
            <LinearGradient id="aqiRing" x1="0" y1="0.9" x2="1" y2="0.9">
              <Stop offset="0" stopColor="#2E9E5B" />
              <Stop offset="0.35" stopColor="#9CCB3B" />
              <Stop offset="0.6" stopColor="#F2B731" />
              <Stop offset="0.8" stopColor="#F07F2B" />
              <Stop offset="1" stopColor="#D6334A" />
            </LinearGradient>
          </Defs>
          <Path d={arc(0, 1)} stroke={track} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
          <Path d={arc(0, filled)} stroke="url(#aqiRing)" strokeWidth={STROKE} strokeLinecap="round" fill="none" />
          <Circle cx={dot.x} cy={dot.y} r={3.2} fill="#FFFFFF" opacity={0.95} />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.value, { color: colors.text }]}>{fmt.aqi(aqi)}</Text>
          <Text style={[styles.unit, { color: colors.muted }]}>US AQI</Text>
        </View>
      </View>
      <StatusChip label={placed.band.short ?? placed.band.label} tone={placed.band.tone} colors={colors} dot />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, width: SIZE },
  dial: { width: SIZE, height: HEIGHT },
  // The value and its name are centred on the middle of the ring.
  center: { position: 'absolute', left: 0, right: 0, top: CENTER - 27, alignItems: 'center', gap: 1 },
  value: { fontSize: 36, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5 },
  unit: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
});
