import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { SocialStream } from '@features/social';
import { ScreenEnter } from '@shared/ui/screen-enter';

// The social screens draw their own headers. The live stream of social notifications is opened here, once for the whole section.
// Every screen opens with an animation: a phone's stack slides it in; the web build has no stack animation of its own, so each screen is wrapped in ScreenEnter there.
export default function SocialLayout() {
  return (
    <>
      <SocialStream />
      <Stack
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        screenLayout={({ children }) => (Platform.OS === 'web' ? <ScreenEnter>{children}</ScreenEnter> : children)}
      />
    </>
  );
}
