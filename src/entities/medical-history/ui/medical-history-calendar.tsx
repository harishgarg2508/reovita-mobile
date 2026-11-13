import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette, type Palette } from '@shared/ui/theme';

import { entryStamp, type MedicalHistoryEntry } from '../model/medical-history.api';
import { useMedicalHistories } from '../model/use-medical-histories';
import { MedicalHistoryForm } from './medical-history-form';

// Sunday-first, like a standard calendar. Each day shows its first entry as a small label.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Month view of the medical history. Tap any date to add an entry for that day.
// Only mounted on the full medical history screen, so the entries are loaded there and nowhere else.
export function MedicalHistoryCalendar() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const { list } = useMedicalHistories();
  const entries = list.data ?? [];

  const todayIso = toIso(new Date());
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [formDate, setFormDate] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, MedicalHistoryEntry[]>();
    for (const entry of entries) {
      const bucket = map.get(entry.occurred_on) ?? [];
      bucket.push(entry);
      map.set(entry.occurred_on, bucket);
    }
    return map;
  }, [entries]);

  const cells = useMemo(() => buildCells(month), [month]);
  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const shown = selected ? byDay.get(selected) ?? [] : [];

  function goToday() {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(todayIso);
  }

  function tapDay(iso: string) {
    setSelected(iso);
    setFormDate(iso);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth(addMonths(month, -1))} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonth(addMonths(month, 1))} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={p.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Go to today" onPress={goToday} hitSlop={8} style={styles.todayBtn}>
          <Text style={styles.todayText}>Today</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, i) => {
          if (!cell) return <View key={`empty-${i}`} style={styles.cell} />;
          const dayEntries = byDay.get(cell.iso) ?? [];
          const isToday = cell.iso === todayIso;
          const isSelected = selected === cell.iso;
          return (
            <Pressable
              key={cell.iso}
              accessibilityRole="button"
              accessibilityLabel={`Add an entry for day ${cell.day}`}
              onPress={() => tapDay(cell.iso)}
              style={[styles.cell, isSelected && styles.cellSelected]}>
              <View style={[styles.dayCircle, isToday && styles.dayCircleToday]}>
                <Text style={[styles.dayText, isToday && styles.dayTextToday]}>{cell.day}</Text>
              </View>
              {dayEntries.length > 0 ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {dayEntries[0].title}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sub}>{selected ? formatLong(selected) : 'Tap a date to add an entry'}</Text>
      {shown.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <Text style={styles.entryTitle}>{entry.title}</Text>
          <Text style={styles.entryLine}>{entryStamp(entry)}</Text>
          {entry.medicines.map((m, i) => (
            <Text key={`${m.name}-${i}`} style={styles.entryLine}>
              {m.name}
              {m.dose ? ` · ${m.dose}` : ''}
            </Text>
          ))}
        </View>
      ))}

      {formDate ? <MedicalHistoryForm initialDate={formDate} onClose={() => setFormDate(null)} /> : null}
    </View>
  );
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildCells(month: Date): ({ iso: string; day: number } | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // Sunday-first: getDay() is already 0 for Sunday.
  const lead = first.getDay();
  const cells: ({ iso: string; day: number } | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ iso, day });
  }
  return cells;
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function formatLong(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    wrap: { gap: 10, marginTop: 4 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    monthLabel: { flex: 1, fontSize: 15, fontWeight: '800', color: p.textStrong, textAlign: 'center' },
    todayBtn: { paddingHorizontal: 10, paddingVertical: 4 },
    todayText: { fontSize: 13, fontWeight: '700', color: p.accent },
    weekRow: { flexDirection: 'row' },
    weekday: { flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: '700', color: p.muted },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: '14.2857%', minHeight: 62, alignItems: 'center', paddingTop: 4, gap: 3, borderRadius: 10 },
    cellSelected: { backgroundColor: p.accentSoft },
    dayCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    dayCircleToday: { backgroundColor: p.accent },
    dayText: { fontSize: 13, color: p.textStrong },
    dayTextToday: { color: '#FFFFFF', fontWeight: '700' },
    chip: { maxWidth: '96%', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6, backgroundColor: p.redSoft },
    chipText: { fontSize: 9.5, fontWeight: '700', color: p.red },
    sub: { fontSize: 13, fontWeight: '700', color: p.muted, marginTop: 4 },
    entry: { gap: 3, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: p.border, backgroundColor: p.card },
    entryTitle: { fontSize: 14, fontWeight: '700', color: p.textStrong },
    entryLine: { fontSize: 13, color: p.text },
  });
}
