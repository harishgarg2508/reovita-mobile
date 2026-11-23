import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';
import { Disclaimer } from '@shared/ui/disclaimer';

import type { FridgeScanResult } from '../model/food-scan.types';

// The answer of Scan My Fridge: the food that was seen, what to eat first, a few simple meals made from it (and the few things each one still needs),
// and a hint or two for the next shop. The model cannot know allergies, so the note and the disclaimer say to check for yourself.
// thumb is the small photo of the fridge, shown at the right of the first title.
export function FridgeResultView({ result, thumb }: { result: FridgeScanResult; thumb?: ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.section, styles.titleText, { color: p.text }]}>What I can see</Text>
          {thumb ? <View style={styles.thumb}>{thumb}</View> : null}
        </View>
        <View style={styles.chips}>
          {result.ingredients.map((item, index) => (
            <View key={`${item.name}-${index}`} style={[styles.chip, { backgroundColor: p.accentSoft }]}>
              <Text style={[styles.chipText, { color: p.accent }]}>{item.name}</Text>
              {item.note ? <Text style={[styles.chipNote, { color: p.muted }]}>{item.note}</Text> : null}
            </View>
          ))}
        </View>
        {result.use_soon.length > 0 ? <Text style={[styles.body, { color: p.muted }]}>Eat these first: {result.use_soon.join(', ')}.</Text> : null}
      </View>

      <Text style={[styles.heading, { color: p.text }]}>Meals you can make</Text>
      {result.meal_ideas.length === 0 ? <Text style={[styles.body, { color: p.muted }]}>No meal ideas this time. Try another photo with more of the shelf in view.</Text> : null}
      {result.meal_ideas.map((idea, index) => (
        <View key={`${idea.name}-${index}`} style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={styles.ideaTop}>
            <Text style={[styles.ideaName, { color: p.text }]}>{idea.name}</Text>
            {idea.minutes ? <Text style={[styles.minutes, { color: p.muted }]}>{idea.minutes} min</Text> : null}
          </View>
          {idea.why ? <Text style={[styles.body, { color: p.muted }]}>{idea.why}</Text> : null}
          {idea.uses.length > 0 ? <Text style={[styles.body, { color: p.text }]}>From your fridge: {idea.uses.join(', ')}</Text> : null}
          {idea.also_need.length > 0 ? <Text style={[styles.body, { color: p.muted }]}>Also needs: {idea.also_need.join(', ')}</Text> : null}
        </View>
      ))}

      {result.shopping_hints.length > 0 ? (
        <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
          <Text style={[styles.section, { color: p.text }]}>For your next shop</Text>
          {result.shopping_hints.map((hint) => (
            <Text key={hint} style={[styles.body, { color: p.text }]}>
              • {hint}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={[styles.note, { color: p.muted }]}>I cannot know about allergies, so check every food yourself before you cook.</Text>
      <Disclaimer />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  titleText: { flex: 1 },
  thumb: { width: 72, height: 72, borderRadius: 16, overflow: 'hidden' },
  wrap: { gap: 12 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  section: { fontSize: 16, fontWeight: '800' },
  heading: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // A chip is as wide as its words but never wider than the card: a long note wraps onto a second line inside it.
  chip: { maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  chipNote: { fontSize: 12, flexShrink: 1 },
  ideaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ideaName: { flex: 1, fontSize: 16, fontWeight: '800' },
  minutes: { fontSize: 12.5, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 12.5, lineHeight: 18 },
});
