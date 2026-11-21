import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';
import { Disclaimer } from '@shared/ui/disclaimer';

import type { DietaryChart } from '../model/dietary-chart.types';

// A dietary chart: the BMI band and the daily ranges worked out by the app, a one-day meal plan, what to have more and less of, daily habits, and what
// to improve. The disclaimer is rendered by the app, from one constant.
export function DietaryChartBody({ chart }: { chart: DietaryChart }) {
  const p = usePalette();
  const t = chart.targets;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.body, { color: p.text }]}>{chart.summary}</Text>

      <View style={[styles.targets, { backgroundColor: p.card, borderColor: p.border }]}>
        <Target label="Calories" value={`${t.calories_min}–${t.calories_max}`} />
        <Target label="Protein" value={`${t.protein_g_min}–${t.protein_g_max} g`} />
        <Target label="Water" value={`${t.water_litres_min}–${t.water_litres_max} L`} />
      </View>

      <Text style={[styles.heading, { color: p.text }]}>Your day</Text>
      {chart.meal_plan.map((slot) => (
        <View key={slot.slot} style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={styles.slotTop}>
            <Text style={[styles.slotName, { color: p.text }]}>{slot.slot}</Text>
            <Text style={[styles.slotTime, { color: p.muted }]}>{slot.time}</Text>
          </View>
          {slot.items.map((item, index) => (
            <Text key={`${item.food}-${index}`} style={[styles.body, { color: p.text }]}>
              • {item.food} <Text style={{ color: p.muted }}>· {item.portion}</Text>
            </Text>
          ))}
          {slot.note ? <Text style={[styles.note, { color: p.muted }]}>{slot.note}</Text> : null}
        </View>
      ))}

      <List title="Have more of" items={chart.eat_more} />
      <List title="Have less of" items={chart.limit} />
      <List title="Daily habits" items={chart.habits} />
      <List title="What you can improve" items={chart.improve} />

      {chart.weekly_tip ? (
        <View style={[styles.card, { backgroundColor: p.accentSoft, borderColor: p.accentSoft }]}>
          <Text style={[styles.slotName, { color: p.accent }]}>Try this week</Text>
          <Text style={[styles.body, { color: p.text }]}>{chart.weekly_tip}</Text>
        </View>
      ) : null}
      {chart.see_a_professional ? <Text style={[styles.note, { color: p.muted }]}>{chart.see_a_professional}</Text> : null}
      <Disclaimer />
    </View>
  );
}

function Target({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={styles.target}>
      <Text style={[styles.targetValue, { color: p.text }]}>{value}</Text>
      <Text style={[styles.note, { color: p.muted }]}>{label}</Text>
    </View>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  const p = usePalette();
  if (items.length === 0) return null;
  return (
    <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }]}>
      <Text style={[styles.slotName, { color: p.text }]}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={[styles.body, { color: p.text }]}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  body: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 12.5, lineHeight: 18 },
  heading: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  targets: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, paddingVertical: 14 },
  target: { flex: 1, alignItems: 'center', gap: 2 },
  targetValue: { fontSize: 16, fontWeight: '800' },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 6 },
  slotTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotName: { fontSize: 15, fontWeight: '800' },
  slotTime: { fontSize: 12.5 },
});
