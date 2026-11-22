import { useLocalSearchParams } from 'expo-router';

import { JourneyScreen } from '@features/social';

export default function JourneyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <JourneyScreen id={String(id ?? '')} />;
}
