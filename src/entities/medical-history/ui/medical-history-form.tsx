import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isApiError } from '@shared/api';
import { usePalette, type Palette } from '@shared/ui/theme';

import { createMedicalHistory, updateMedicalHistory, type MedicalHistoryEntry } from '../model/medical-history.api';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// The form to add one medical history event: its title, the date, and the medicines taken for it.
// Opened from the calendar (with the tapped date filled in) or from the list view (today's date).
// The Cancel and Save actions sit in a bar pinned to the bottom of the dialog.
export function MedicalHistoryForm({
  initialDate,
  onClose,
  entry,
}: {
  initialDate: string;
  onClose: () => void;
  // When given, the form edits this entry instead of adding a new one.
  entry?: MedicalHistoryEntry;
}) {
  const p = usePalette();
  const styles = useMemo(() => makeStyles(p), [p]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(entry?.title ?? '');
  const [date, setDate] = useState(entry?.occurred_on ?? initialDate);
  const [medicines, setMedicines] = useState<{ name: string; dose: string }[]>(
    entry && entry.medicines.length > 0 ? entry.medicines.map((m) => ({ name: m.name, dose: m.dose ?? '' })) : [{ name: '', dose: '' }],
  );
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: createMedicalHistory,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['medical-histories'] }),
  });
  const update = useMutation({
    mutationFn: (input: Parameters<typeof createMedicalHistory>[0]) => updateMedicalHistory(entry!.id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['medical-histories'] }),
  });
  const mutation = entry ? update : add;

  function save() {
    setError(null);
    if (!title.trim()) return setError('Enter a title, for example Fever.');
    if (!DATE.test(date)) return setError('Enter the date as YYYY-MM-DD.');
    mutation.mutate(
      {
        title: title.trim(),
        occurred_on: date,
        medicines: medicines.filter((m) => m.name.trim()).map((m) => ({ name: m.name.trim(), dose: m.dose.trim() || null })),
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(isApiError(err) ? err.message : 'Could not save this entry. Try again.'),
      },
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.dialog}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.dialogContent}>
          <View style={styles.dialogHead}>
            <Text style={styles.dialogTitle}>{entry ? 'Edit medical history' : 'Add medical history'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Fever" placeholderTextColor={p.muted} style={styles.input} />
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput value={date} onChangeText={setDate} placeholder="2026-11-12" placeholderTextColor={p.muted} style={styles.input} />
            <Text style={styles.label}>Medicines</Text>
            {medicines.map((m, i) => (
              <View key={i} style={styles.medRow}>
                <TextInput
                  value={m.name}
                  onChangeText={(v) => setMedicines((all) => all.map((x, j) => (j === i ? { ...x, name: v } : x)))}
                  placeholder="Name"
                  placeholderTextColor={p.muted}
                  style={[styles.input, styles.flex]}
                />
                <TextInput
                  value={m.dose}
                  onChangeText={(v) => setMedicines((all) => all.map((x, j) => (j === i ? { ...x, dose: v } : x)))}
                  placeholder="Dose"
                  placeholderTextColor={p.muted}
                  style={[styles.input, styles.doseInput]}
                />
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={() => setMedicines((all) => [...all, { name: '', dose: '' }])} style={styles.linkBtn}>
              <Text style={styles.linkText}>+ Add another medicine</Text>
            </Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={mutation.isPending} onPress={save} style={styles.saveBtn}>
            <Text style={styles.saveText}>{mutation.isPending ? 'Saving...' : 'Save entry'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    dialog: { flex: 1, backgroundColor: p.bg },
    scroll: { flex: 1 },
    dialogContent: { padding: 18, gap: 14 },
    dialogHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dialogTitle: { fontSize: 22, fontWeight: '800', color: p.textStrong },
    closeText: { fontSize: 14, fontWeight: '700', color: p.accent },
    form: { backgroundColor: p.card, borderRadius: 16, borderWidth: 1, borderColor: p.border, padding: 14, gap: 8 },
    label: { fontSize: 12.5, color: p.muted },
    input: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, paddingHorizontal: 12, fontSize: 15, color: p.textStrong },
    medRow: { flexDirection: 'row', gap: 8 },
    flex: { flex: 1 },
    doseInput: { width: 96 },
    linkBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
    linkText: { fontSize: 13, fontWeight: '700', color: p.accent },
    error: { fontSize: 13, color: p.red },
    footer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: p.border,
      backgroundColor: p.card,
    },
    cancelBtn: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: p.border, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 15, fontWeight: '600', color: p.textStrong },
    saveBtn: { flex: 1, height: 46, borderRadius: 14, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    saveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  });
}
