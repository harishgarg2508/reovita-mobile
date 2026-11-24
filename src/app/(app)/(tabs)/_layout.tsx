import { Tabs } from 'expo-router';

import { FamilySwitchBackDock, useActiveProfile } from '@features/profile-switch';
import { BottomDock } from '@shared/ui';

/**
 * Reovita App Shell Tab Navigator.
 * Matches the floating bottom dock design from Figma:
 * - Home (dashboard)
 * - Insights (medications & biomarkers)
 * - [Center Sprout FAB: Upload Report]
 * - Records
 * - Profile (settings & consents)
 */
export default function TabsLayout() {
  // A family view has no main dock: a bar with the way back to your own health takes its place.
  // The dock shows for the account's own profile only: the profile in use is read from the list, and a family member's view has none.
  const active = useActiveProfile();
  const familyView = active?.role === 'member';
  return (
    <Tabs
      tabBar={(props) => (familyView ? <FamilySwitchBackDock /> : <BottomDock {...props} />)}
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
        name="records"
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
