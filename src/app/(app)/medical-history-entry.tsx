import { useLocalSearchParams } from 'expo-router';

import { MedicalHistoryEntryScreen } from '@entities/medical-history';

// Add or edit one medical history entry. ?id=<entry> edits it; ?date=YYYY-MM-DD adds on that date.
export default function MedicalHistoryEntryRoute() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  return <MedicalHistoryEntryScreen entryId={id} initialDate={date} />;
}
