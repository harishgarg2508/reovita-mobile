import { Tabs } from 'expo-router';

import { SocialTabBar } from '@features/social';

// The four tabs of Social: Home, Search, Move and Profile. The dock is the tab bar, drawn once here, so it stays in place and only its indicator slides when
// a tab is chosen. The tab screens stay mounted, so the feed is where it was when the person comes back to it. Every other Social screen (pods, journeys,
// activity, a person's page, compose, settings) opens in the stack above these tabs, without the dock.
export default function SocialTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <SocialTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="move" options={{ title: 'Move' }} />
      <Tabs.Screen name="me" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
