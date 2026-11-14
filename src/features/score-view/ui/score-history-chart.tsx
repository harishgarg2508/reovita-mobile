import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { HealthScoreEntry } from '@entities/score';
import type { Palette } from '@shared/ui/theme';

const HEIGHT = 190;
const PAD = { top: 14, right: 14, bottom: 8, left: 34 };

// The lowest and highest grid line: the scores' range widened to whole tens, and at least 20 points tall
// so a flat history is not drawn as a wild zig-zag.
function scale(values: number[]): { min: number; max: number } {
  let min = Math.floor(Math.min(...values) / 10) * 10;
  let max = Math.ceil(Math.max(...values) / 10) * 10;
  if (max - min < 20) {
    min = Math.max(0, min - 10);
    max = Math.min(100, max + 10);
  }
  if (max - min < 20) min = Math.max(0, max - 20);
  return { min, max };
}

// Line graph of the total score over time, oldest on the left. Drawn with react-native-svg.
export function ScoreHistoryChart({ entries, p }: { entries: HealthScoreEntry[]; p: Palette }) {
  const [width, setWidth] = useState(0);
  const totals = entries.map((entry) => entry.total);
  const { min, max } = scale(totals);
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const x = (index: number) => PAD.left + (entries.length === 1 ? innerW / 2 : (index / (entries.length - 1)) * innerW);
  const y = (value: number) => PAD.top + (1 - (value - min) / (max - min)) * innerH;
  const line = totals.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  const gridValues = [max, (max + min) / 2, min];
  const last = entries.length - 1;

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="image"
      accessibilityLabel={`Health score graph. ${entries.length} scores, from ${totals[0]} to ${totals[last]}.`}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {gridValues.map((value) => (
            <Line key={value} x1={PAD.left} x2={width - PAD.right} y1={y(value)} y2={y(value)} stroke={p.border} strokeWidth={1} />
          ))}
          {entries.length > 1 ? <Path d={line} stroke={p.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
          {totals.map((value, index) => (
            <Circle
              key={index}
              cx={x(index)}
              cy={y(value)}
              r={index === last ? 5.5 : 3}
              fill={index === last ? p.accent : p.card}
              stroke={p.accent}
              strokeWidth={2}
            />
          ))}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
      {/* Grid labels sit over the left edge, in text so they follow the app font and theme. */}
      {width > 0
        ? gridValues.map((value) => (
            <Text key={value} style={[styles.gridLabel, { top: y(value) - 8, color: p.muted }]}>
              {Math.round(value)}
            </Text>
          ))
        : null}
      <View style={[styles.dates, { paddingLeft: PAD.left, paddingRight: PAD.right }]}>
        <Text style={[styles.date, { color: p.muted }]}>{shortDate(entries[0].created_at)}</Text>
        {entries.length > 1 ? <Text style={[styles.date, { color: p.muted }]}>{shortDate(entries[last].created_at)}</Text> : null}
      </View>
    </View>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  gridLabel: { position: 'absolute', left: 0, width: PAD.left - 8, textAlign: 'right', fontSize: 11 },
  dates: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontSize: 11 },
});
