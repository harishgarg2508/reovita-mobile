import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';

import { useMedicalHistories } from '../model/use-medical-histories';
import { MedicalHistoryForm } from './medical-history-form';

// The add or edit page for one medical history entry. It opens as its own screen, not a dialog.
// With entryId it edits that entry; without it, it adds a new entry on initialDate (YYYY-MM-DD).
export function MedicalHistoryEntryScreen({ entryId, initialDate }: { entryId?: string; initialDate?: string }) {
  const router = useRouter();
  const p = usePalette();
  const { list } = useMedicalHistories();
  const back = () => router.back();

  if (!entryId) {
    // The key changes with the date, so opening the form for another day starts it empty instead of keeping the old values.
    const day = initialDate ?? todayIso();
    return <MedicalHistoryForm key={`add-${day}`} initialDate={day} onClose={back} />;
  }

  if (list.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={p.accent} />
      </View>
    );
  }

  const entry = list.data?.find((e) => e.id === entryId);
  if (!entry) {
    return (
      <View style={styles.center}>
        <Text style={[styles.message, { color: p.muted }]}>This entry could not be found.</Text>
      </View>
    );
  }

  return <MedicalHistoryForm key={`edit-${entry.id}`} entry={entry} initialDate={entry.occurred_on} onClose={back} />;
}

// Today's date in the device's local time, as YYYY-MM-DD.
function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { fontSize: 14, textAlign: 'center' },
});
