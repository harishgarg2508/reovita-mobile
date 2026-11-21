import { useLocalSearchParams } from 'expo-router';

import { PodScreen } from '@features/social';

export default function PodRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PodScreen id={String(id ?? '')} />;
}
