import { Tabs } from 'expo-router';

import { BottomDock } from '@shared/ui';

/**
 * Reovita App Shell Tab Navigator.
 * Matches the floating bottom dock design from Figma:
 * - Home (dashboard)
 * - Insights (medications & biomarkers)
 * - [Center Sprout FAB: Upload Report]
 * - Records (timeline)
 * - Profile (settings & consents)
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomDock {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: 'Insights',
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Records',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
