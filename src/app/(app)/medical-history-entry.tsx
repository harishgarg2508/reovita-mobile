import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { MedicalHistoryEntryScreen } from '@entities/medical-history';

// Add or edit one medical history entry. ?id=<entry> edits it; ?date=YYYY-MM-DD adds on that date.
// Each time the page is opened it starts afresh: the counter changes on every focus, so the form mounts again and does not keep values from an earlier visit.
export default function MedicalHistoryEntryRoute() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const [visit, setVisit] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setVisit((count) => count + 1);
    }, []),
  );
  return <MedicalHistoryEntryScreen key={`visit-${visit}`} entryId={id} initialDate={date} />;
}
