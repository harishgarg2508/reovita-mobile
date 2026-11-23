import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';
import { Disclaimer } from '@shared/ui/disclaimer';

import type { MealScanResult } from '../model/food-scan.types';

const FIT_LABELS: Record<MealScanResult['fit'], string> = { light: 'A light meal', balanced: 'A balanced meal', heavy: 'A hearty meal' };
const CONFIDENCE_LABELS: Record<MealScanResult['confidence'], string> = { low: 'Rough estimate', medium: 'Good estimate', high: 'Clear photo' };

// The answer of Scan My Meal: the dish, an estimate of its calories and protein, carbohydrate and fat, what is on the plate, how it sits in the day, and a
// few small tips. The amounts are estimates from a photo, and the note and the disclaimer say so.
// thumb is the small photo of the meal, shown at the right of the dish name.
export function MealResultView({ result, thumb }: { result: MealScanResult; thumb?: ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={styles.head}>
          <Text style={[styles.dish, { color: p.text }]}>{result.dish_name}</Text>
          <View style={[styles.chip, { backgroundColor: p.accentSoft }]}>
            <Text style={[styles.chipText, { color: p.accent }]}>{CONFIDENCE_LABELS[result.confidence]}</Text>
          </View>
        </View>
        {thumb ? <View style={styles.thumb}>{thumb}</View> : null}
      </View>

      <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
        <View style={styles.calRow}>
          <Text style={[styles.calValue, { color: p.text }]}>{result.total.calories}</Text>
          <Text style={[styles.calUnit, { color: p.muted }]}>kcal, about</Text>
        </View>
        <View style={styles.macros}>
          <Macro label="Protein" value={result.total.protein_g} />
          <Macro label="Carbs" value={result.total.carbs_g} />
          <Macro label="Fat" value={result.total.fat_g} />
        </View>
        {typeof result.share_of_day_pct === 'number' ? (
          <View style={styles.share}>
            <View style={[styles.track, { backgroundColor: p.border }]}>
              <View style={[styles.fill, { backgroundColor: p.accent, width: `${Math.min(100, Math.max(2, result.share_of_day_pct))}%` }]} />
            </View>
            <Text style={[styles.shareText, { color: p.muted }]}>About {result.share_of_day_pct}% of a day&apos;s calories for your goal</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
        <Text style={[styles.section, { color: p.text }]}>On the plate</Text>
        {result.items.map((item, index) => (
          <View key={`${item.food}-${index}`} style={[styles.itemRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border }]}>
            <View style={styles.itemText}>
              <Text style={[styles.itemName, { color: p.text }]}>{item.food}</Text>
              <Text style={[styles.itemHint, { color: p.muted }]}>{item.portion}</Text>
            </View>
            <Text style={[styles.itemCal, { color: p.text }]}>{item.calories} kcal</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
        <Text style={[styles.section, { color: p.text }]}>{FIT_LABELS[result.fit]}</Text>
        {result.fit_note ? <Text style={[styles.body, { color: p.muted }]}>{result.fit_note}</Text> : null}
        {result.tips.map((tip) => (
          <Text key={tip} style={[styles.body, { color: p.text }]}>
            • {tip}
          </Text>
        ))}
      </View>

      <Text style={[styles.note, { color: p.muted }]}>{result.estimate_note}</Text>
      <Disclaimer />
    </View>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  const p = usePalette();
  return (
    <View style={styles.macro}>
      <Text style={[styles.macroValue, { color: p.text }]}>{value} g</Text>
      <Text style={[styles.macroLabel, { color: p.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  // The name and its chip on the left, the small photo on the right, 16 apart.
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  head: { flex: 1, minWidth: 0, gap: 8, alignItems: 'flex-start' },
  thumb: { width: 84, height: 84, borderRadius: 18, overflow: 'hidden' },
  dish: { fontSize: 22, fontWeight: '800' },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center' },
  chipText: { fontSize: 12, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  calRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  calValue: { fontSize: 44, fontWeight: '800' },
  calUnit: { fontSize: 14 },
  macros: { flexDirection: 'row', justifyContent: 'space-between' },
  macro: { alignItems: 'center', flex: 1 },
  macroValue: { fontSize: 17, fontWeight: '800' },
  macroLabel: { fontSize: 12 },
  share: { gap: 6 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  shareText: { fontSize: 12.5 },
  section: { fontSize: 16, fontWeight: '800' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  itemText: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14.5, fontWeight: '700' },
  itemHint: { fontSize: 12.5 },
  itemCal: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 12.5, lineHeight: 18 },
});
