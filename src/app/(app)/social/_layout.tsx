import { Stack } from 'expo-router';

import { SocialStream } from '@features/social';

// The social screens draw their own headers. The live stream of social notifications is opened here, once for the whole section.
export default function SocialLayout() {
  return (
    <>
      <SocialStream />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
