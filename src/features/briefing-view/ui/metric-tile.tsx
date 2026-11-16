import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ABOUT, place, SCALES, type ScaleName, type Tone } from '../model/reading-labels';
import type { BriefingColors } from './briefing-theme';

export type TileIcon = keyof typeof MaterialCommunityIcons.glyphMap;

// A soft pill with the band's name, for example "Moderate" or "Comfortable". A dot in front is optional.
export function StatusChip({ label, tone, colors, dot }: { label: string; tone: Tone; colors: BriefingColors; dot?: boolean }) {
  return (
    <View style={[styles.chip, { backgroundColor: `${colors.tone[tone]}2B` }]}>
      {dot ? <View style={[styles.chipDot, { backgroundColor: colors.tone[tone] }]} /> : null}
      <Text style={[styles.chipText, { color: colors.toneText[tone] }]}>{label}</Text>
    </View>
  );
}

interface Props {
  label: string;
  icon: TileIcon;
  value: string;
  scale: ScaleName;
  raw: number;
  colors: BriefingColors;
  // A full-width row instead of half of a pair.
  wide?: boolean;
  note?: string | null;
}

// One reading: its icon, name, value and the band it falls in. Tap it to read what the reading measures.
export function MetricTile({ label, icon, value, scale, raw, colors, wide, note }: Props) {
  const [open, setOpen] = useState(false);
  const band = place(SCALES[scale], raw).band;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${label}: ${value}, ${band.label}`}
      onPress={() => setOpen((v) => !v)}
      style={[styles.tile, wide ? styles.wide : styles.half, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <MaterialCommunityIcons name={icon} size={26} color={colors.accent} style={styles.icon} />
        <View style={styles.body}>
          <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
            {value}
          </Text>
          <StatusChip label={band.label} tone={band.tone} colors={colors} />
        </View>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.muted} />
      </View>
      {open ? (
        <View style={[styles.about, { borderTopColor: colors.border }]}>
          <Text style={[styles.aboutText, { color: colors.muted }]}>{ABOUT[scale]}</Text>
          {note ? <Text style={[styles.aboutText, { color: colors.muted }]}>{note}.</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 10 },
  half: { flexBasis: '47%', flexGrow: 1 },
  wide: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 30, textAlign: 'center' },
  body: { flex: 1, gap: 3, alignItems: 'flex-start' },
  label: { fontSize: 12.5 },
  value: { fontSize: 20, fontWeight: '800' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 2 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11.5, fontWeight: '700' },
  about: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 4 },
  aboutText: { fontSize: 12.5, lineHeight: 18 },
});
