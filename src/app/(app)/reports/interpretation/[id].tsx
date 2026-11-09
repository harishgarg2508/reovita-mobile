import { useLocalSearchParams } from 'expo-router';

import { InterpretationScreen } from '@features/report-interpretation';

export default function InterpretationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InterpretationScreen reportId={id} />;
}
