import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { SCORE_ZONES, scoreZone, type HealthScoreEntry } from '@entities/score';
import type { Palette } from '@shared/ui/theme';

const HEIGHT = 190;
const PAD = { top: 10, right: 14, bottom: 8, left: 62 };

// Line graph of the health score over time, oldest on the left. It shows no numbers: three coloured bands, Critical, Watch
// and Normal, run behind the line, so where the line sits says how the user is doing. Drawn with react-native-svg.
export function ScoreHistoryChart({ entries, p }: { entries: HealthScoreEntry[]; p: Palette }) {
  const [width, setWidth] = useState(0);
  const totals = entries.map((entry) => entry.total);
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const x = (index: number) => PAD.left + (entries.length === 1 ? innerW / 2 : (index / (entries.length - 1)) * innerW);
  const y = (value: number) => PAD.top + (1 - Math.min(Math.max(value, 0), 100) / 100) * innerH;
  const line = totals.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  const last = entries.length - 1;

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="image"
      accessibilityLabel={`Health score graph. ${entries.length} scores, from ${scoreZone(totals[0]).word} to ${scoreZone(totals[last]).word}.`}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {SCORE_ZONES.map((zone) => (
            <Rect key={zone.word} x={PAD.left} y={y(zone.to)} width={innerW} height={y(zone.from) - y(zone.to)} fill={zone.color} fillOpacity={0.14} />
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
      {/* The zone names sit at the left edge, in text so they follow the app font. */}
      {width > 0
        ? SCORE_ZONES.map((zone) => (
            <Text key={zone.word} style={[styles.zoneLabel, { top: (y(zone.to) + y(zone.from)) / 2 - 8, color: zone.color }]}>
              {zone.word}
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
  zoneLabel: { position: 'absolute', left: 0, width: PAD.left - 8, textAlign: 'right', fontSize: 11, fontWeight: '700' },
  dates: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontSize: 11 },
});
