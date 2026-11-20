import { useLocalSearchParams } from 'expo-router';

import { ProfileScreen } from '@features/social';

export default function ProfileRoute() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  return <ProfileScreen handle={String(handle ?? '')} />;
}
