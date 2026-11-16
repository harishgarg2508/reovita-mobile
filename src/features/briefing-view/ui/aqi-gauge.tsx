import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { fmt, place, SCALES } from '../model/reading-labels';
import type { BriefingColors } from './briefing-theme';
import { StatusChip } from './metric-tile';

// The five US AQI bands, one colour each, drawn as equal parts of a half circle.
const BAND_COLORS = ['#2E9E5B', '#E0C22B', '#E8742B', '#D6334A', '#8E3A9D'];

const W = 148;
const H = 90;
const R = 58;
const STROKE = 14;
const CX = W / 2;
const CY = 76;

// A point on the half circle: position 0 is the left end, 1 the right end.
function at(position: number) {
  const angle = Math.PI * (1 - position);
  return { x: CX + R * Math.cos(angle), y: CY - R * Math.sin(angle) };
}

function arc(from: number, to: number): string {
  const a = at(from);
  const b = at(to);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

// The air quality dial: a half circle in the five AQI colours, a marker where today's value sits, the value inside, and
// the band's name under it.
export function AqiGauge({ aqi, colors }: { aqi: number; colors: BriefingColors }) {
  const placed = place(SCALES.aqi, aqi);
  const marker = at(placed.position);
  const n = BAND_COLORS.length;

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Air quality index ${fmt.aqi(aqi)}, ${placed.band.label}`}>
      <View style={styles.dial}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {BAND_COLORS.map((color, i) => (
            <Path key={color} d={arc(i / n + 0.008, (i + 1) / n - 0.008)} stroke={color} strokeWidth={STROKE} fill="none" strokeLinecap="butt" />
          ))}
          <Circle cx={marker.x} cy={marker.y} r={8.5} fill={colors.card} stroke={colors.text} strokeWidth={3} />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.value, { color: colors.text }]}>{fmt.aqi(aqi)}</Text>
          <Text style={[styles.unit, { color: colors.muted }]}>US AQI</Text>
        </View>
      </View>
      <StatusChip label={placed.band.label} tone={placed.band.tone} colors={colors} dot />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, width: W },
  dial: { width: W, height: H },
  center: { position: 'absolute', left: 0, right: 0, top: 26, alignItems: 'center' },
  value: { fontSize: 36, fontWeight: '800', lineHeight: 40 },
  unit: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
});
