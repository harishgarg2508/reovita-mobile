import type React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, type Tabs } from 'expo-router';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { tapConfirm, tapSelection } from '@shared/lib';

export type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
type TabRoute = BottomTabBarProps['state']['routes'][number];

const CREST_SVG = `<svg viewBox="0 0 104 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M 0 20 C 24 20 30 3 52 3 C 74 3 80 20 104 20 L 104 28 L 0 28 Z" fill="#FFFFFF" />
  <path d="M 0 20 C 24 20 30 3 52 3 C 74 3 80 20 104 20" stroke="#EDE8F5" stroke-width="1.2" fill="none" />
</svg>`;

const CREST_URI = `data:image/svg+xml;utf8,${encodeURIComponent(CREST_SVG)}`;

interface TabMeta {
  label: string;
  renderIcon: (color: string, focused: boolean) => React.ReactNode;
}

const TAB_META: Record<string, TabMeta> = {
  dashboard: {
    label: 'Home',
    renderIcon: (color) => <Ionicons name="home" size={22} color={color} />,
  },
  medications: {
    label: 'Insights',
    renderIcon: (color) => (
      <View style={styles.insightsIconWrap}>
        <View style={[styles.insightsBar, { height: 11, backgroundColor: color }]} />
        <View style={[styles.insightsBar, { height: 17, backgroundColor: color }]} />
        <View style={[styles.insightsBar, { height: 12, backgroundColor: color }]} />
      </View>
    ),
  },
  timeline: {
    label: 'Records',
    renderIcon: (color) => <Ionicons name="calendar-outline" size={21} color={color} />,
  },
  settings: {
    label: 'Profile',
    renderIcon: (color) => <Ionicons name="person-outline" size={21} color={color} />,
  },
};

/**
 * Reovita Floating Bottom Dock Navigation Bar.
 * Exact recreation of the Figma design:
 * - Floating rounded white pill dock with soft shadow and subtle border
 * - Curved center crest embracing the central purple action button
 * - Center FAB: royal purple circle (#7545ED) with white Reovita dual-leaf sprout emblem
 * - Tabs: Home, Insights, [Center Sprout FAB], Records, Profile
 * - Active tab: royal purple color (#7545ED) with matching purple underline pill
 * - Inactive tab: neutral grey (#8E8B99)
 */
export function BottomDock({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const router = useRouter();

  const handleFabPress = () => {
    tapConfirm();
    router.push('/(app)/reports/upload');
  };

  // Find routes by name to ensure stable placement regardless of route order
  const homeRoute = state.routes.find((r: TabRoute) => r.name === 'dashboard');
  const insightsRoute = state.routes.find((r: TabRoute) => r.name === 'medications');
  const recordsRoute = state.routes.find((r: TabRoute) => r.name === 'timeline');
  const profileRoute = state.routes.find((r: TabRoute) => r.name === 'settings');

  const leftRoutes = [homeRoute, insightsRoute].filter((r): r is TabRoute => Boolean(r));
  const rightRoutes = [recordsRoute, profileRoute].filter((r): r is TabRoute => Boolean(r));

  const renderTab = (route: TabRoute) => {
    const isFocused = state.routes[state.index]?.key === route.key;
    const meta = TAB_META[route.name] ?? {
      label: route.name,
      renderIcon: (color: string) => <Ionicons name="ellipse" size={18} color={color} />,
    };

    const color = isFocused ? '#7545ED' : '#8E8B99';

    const onPress = () => {
      const event = emitter.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        tapSelection();
        navigateToTab(route.key);
      }
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={meta.label}
        onPress={onPress}
        style={styles.tabBtn}>
        <View style={styles.tabIconWrap}>{meta.renderIcon(color, isFocused)}</View>
        <Text
          style={[
            styles.tabLabel,
            { color },
            isFocused ? styles.tabLabelActive : null,
          ]}>
          {meta.label}
        </Text>
        <View
          style={[
            styles.activeIndicator,
            { backgroundColor: isFocused ? '#7545ED' : 'transparent' },
          ]}
        />
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockWrap,
        {
          bottom: Math.max(insets.bottom, 12) + 4,
        },
      ]}>
      {/* Floating White Dock Surface */}
      <View style={styles.dockSurface}>
        {/* Center Crest SVG that swells upward */}
        <View pointerEvents="none" style={styles.crestWrap}>
          <ExpoImage
            source={{ uri: CREST_URI }}
            style={styles.crestSvg}
            contentFit="contain"
          />
        </View>

        {/* Left Tabs: Home, Insights */}
        <View style={styles.halfTabs}>
          {leftRoutes.map((route: TabRoute) => renderTab(route))}
        </View>

        {/* Center spacing for the floating action button */}
        <View style={styles.centerSpace} />

        {/* Right Tabs: Records, Profile */}
        <View style={styles.halfTabs}>
          {rightRoutes.map((route: TabRoute) => renderTab(route))}
        </View>
      </View>

      {/* Center Floating Action Button with White Dual-Leaf Sprout */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Upload medical report"
        onPress={handleFabPress}
        style={styles.fabBtn}>
        <Image
          source={require('../../assets/images/reovita-sprout.png')}
          style={styles.fabIcon}
          resizeMode="contain"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
    zIndex: 100,
  },
  dockSurface: {
    width: '100%',
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE8F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    shadowColor: '#1B152B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  crestWrap: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  crestSvg: {
    width: 104,
    height: 28,
  },
  halfTabs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
    zIndex: 2,
  },
  centerSpace: {
    width: 58,
    height: '100%',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 6,
    paddingBottom: 4,
  },
  tabIconWrap: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    fontFamily: 'Poppins_600SemiBold',
  },
  activeIndicator: {
    width: 26,
    height: 2.5,
    borderRadius: 2,
    marginTop: 3,
  },
  fabBtn: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#7545ED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7545ED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 10,
  },
  fabIcon: {
    width: 28,
    height: 26,
    tintColor: '#FFFFFF',
  },
  insightsIconWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    gap: 3,
    justifyContent: 'center',
    paddingBottom: 1,
  },
  insightsBar: {
    width: 2.8,
    borderRadius: 1.5,
  },
});
