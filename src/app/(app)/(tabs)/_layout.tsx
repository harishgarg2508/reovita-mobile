import { Tabs } from 'expo-router';

import {
  TabHomeIcon,
  TabInsightsIcon,
  TabProfileIcon,
  TabReportsIcon,
} from '@shared/ui';

/**
 * Reovita App Shell Tab Navigator.
 * Matches Screen 2 from the Reovita Design System:
 * - Home (dashboard)
 * - Reports (timeline)
 * - Insights (medications & biomarkers)
 * - Profile (settings & consents)
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7545ED',
        tabBarInactiveTintColor: '#8E929A',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#ECEAF0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabHomeIcon color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <TabReportsIcon color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <TabInsightsIcon color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabProfileIcon color={color} size={20} />,
        }}
      />
    </Tabs>
  );
}
