import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MedicalHistoryCalendar, MedicalHistoryList } from '@entities/medical-history';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { usePalette, type Palette } from '@shared/ui/theme';
import { useScrollToTopOnFocus } from '@shared/lib';

// The health log: the visits, medicines and reports the person keeps, as a list or on a calendar. Entries load only while this screen is open.
export function MedicalHistoryScreen() {
  // Back at the top each time the screen is opened again.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnFocus(scrollRef);
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <ScrollView ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={p.text} />
        </Pressable>
        <Text style={[styles.title, styles.flex]}>Health log</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="What the health log is for" hitSlop={10} onPress={() => setInfoOpen(true)}>
          <Ionicons name="information-circle-outline" size={24} color={p.muted} />
        </Pressable>
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
        <Text style={styles.cardTitle}>Health log entries</Text>
        {view === 'list' ? <MedicalHistoryList /> : <MedicalHistoryCalendar />}
      </View>

      <BottomSheet visible={infoOpen} onClose={() => setInfoOpen(false)}>
        <View style={styles.info}>
          <Text style={styles.infoTitle}>What the health log is for</Text>
          <Text style={styles.infoBody}>
            Keep a record of the things that happen to your health: a doctor visit, a procedure or an injury, the medicines you take, and the reports or prescriptions that go with them.
          </Text>
          <Text style={styles.infoHead}>How to use it</Text>
          <Text style={styles.infoBody}>1. Tap Add health log entry.</Text>
          <Text style={styles.infoBody}>2. Give it a title and the date, and add any medicines and files.</Text>
          <Text style={styles.infoBody}>3. Switch between List and Calendar to find an entry. Tap an entry to edit it.</Text>
          <Text style={styles.infoNote}>This is your own record. It does not give medical advice, and the entries are not shared unless you choose to.</Text>
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: p.bg },
    container: { paddingHorizontal: 18, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 26, fontFamily: 'Poppins_600SemiBold', color: p.textStrong },
    flex: { flex: 1 },
    info: { gap: 10, paddingBottom: 8 },
    infoTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: p.textStrong },
    infoHead: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: p.textStrong, marginTop: 6 },
    infoBody: { fontSize: 14, lineHeight: 21, color: p.text },
    infoNote: { fontSize: 12.5, lineHeight: 18, color: p.muted, marginTop: 6 },
    card: { backgroundColor: p.card, borderRadius: 20, borderWidth: 1, borderColor: p.border, padding: 16, gap: 10 },
    cardTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: p.textStrong },
    toggle: { flexDirection: 'row', gap: 8, backgroundColor: p.card, borderRadius: 16, borderWidth: 1, borderColor: p.border, padding: 4 },
    toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 12 },
    toggleOn: { backgroundColor: '#1F6F3F' },
    toggleText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#1F6F3F' },
    toggleTextOn: { color: '#FFFFFF' },
  });
}
