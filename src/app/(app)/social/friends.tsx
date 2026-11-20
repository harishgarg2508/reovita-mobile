import { useLocalSearchParams } from 'expo-router';

import { FriendsScreen } from '@features/social';

export default function FriendsRoute() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  return <FriendsScreen handle={String(handle ?? '')} />;
}
