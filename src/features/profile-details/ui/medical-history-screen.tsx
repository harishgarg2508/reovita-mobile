import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MedicalHistoryCalendar, MedicalHistoryList } from '@entities/medical-history';
import { usePalette, type Palette } from '@shared/ui/theme';

// The full medical history: the entries as a list or on a calendar. Entries load only while this screen is open.
export function MedicalHistoryScreen() {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [view, setView] = useState<'list' | 'calendar'>('list');

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={p.text} />
        </Pressable>
        <Text style={styles.title}>Medical history</Text>
      </View>

      <View style={styles.toggle}>
        <Pressable accessibilityRole="button" onPress={() => setView('list')} style={[styles.toggleBtn, view === 'list' && styles.toggleOn]}>
          <Ionicons name="list-outline" size={16} color={view === 'list' ? '#FFFFFF' : '#1F6F3F'} />
          <Text style={[styles.toggleText, view === 'list' && styles.toggleTextOn]}>List</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setView('calendar')} style={[styles.toggleBtn, view === 'calendar' && styles.toggleOn]}>
          <Ionicons name="calendar-outline" size={16} color={view === 'calendar' ? '#FFFFFF' : '#1F6F3F'} />
          <Text style={[styles.toggleText, view === 'calendar' && styles.toggleTextOn]}>Calendar</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Medical history entries</Text>
        {view === 'list' ? <MedicalHistoryList /> : <MedicalHistoryCalendar />}
      </View>
    </ScrollView>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.bg },
    container: { paddingHorizontal: 18, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 26, fontWeight: '800', color: p.textStrong },
    card: { backgroundColor: p.card, borderRadius: 20, borderWidth: 1, borderColor: p.border, padding: 16, gap: 10 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: p.textStrong },
    toggle: { flexDirection: 'row', gap: 8, backgroundColor: p.card, borderRadius: 16, borderWidth: 1, borderColor: p.border, padding: 4 },
    toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 12 },
    toggleOn: { backgroundColor: '#1F6F3F' },
    toggleText: { fontSize: 14, fontWeight: '700', color: '#1F6F3F' },
    toggleTextOn: { color: '#FFFFFF' },
  });
}
