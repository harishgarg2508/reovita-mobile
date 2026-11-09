import { USE_NATIVE_DRIVER } from '@shared/lib';
import type React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, type Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { tapConfirm, tapSelection } from '@shared/lib';
import { useResolvedScheme } from '@shared/ui/theme';

export type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
type TabRoute = BottomTabBarProps['state']['routes'][number];

const CREST_SVG = `<svg viewBox="0 0 104 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M 0 20 C 24 20 30 3 52 3 C 74 3 80 20 104 20 L 104 28 L 0 28 Z" fill="#FFFFFF" />
  <path d="M 0 20 C 24 20 30 3 52 3 C 74 3 80 20 104 20" stroke="#EDE8F5" stroke-width="1.2" fill="none" />
</svg>`;
const CREST_SVG_DARK = `<svg viewBox="0 0 104 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M 0 20 C 24 20 30 3 52 3 C 74 3 80 20 104 20 L 104 28 L 0 28 Z" fill="#16142A" />
  <path d="M 0 20 C 24 20 30 3 52 3 C 74 3 80 20 104 20" stroke="#2B2846" stroke-width="1.2" fill="none" />
</svg>`;

const CREST_URI = `data:image/svg+xml;utf8,${encodeURIComponent(CREST_SVG)}`;
const CREST_URI_DARK = `data:image/svg+xml;utf8,${encodeURIComponent(CREST_SVG_DARK)}`;

const INDICATOR_WIDTH = 26;
const INITIAL_DOCK_WIDTH = Dimensions.get('window').width - 28;

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

const TAB_INDEX_MAP: Record<string, number> = {
  dashboard: 0,
  medications: 1,
  timeline: 2,
  settings: 3,
};

/**
 * Calculates the exact center X position for tab at logical index (0..3) within dockSurface.
 */
function getTabCenterX(index: number, dockWidth: number): number {
  const paddingLeft = 6;
  const centerGap = 58;
  const availableWidth = Math.max(0, dockWidth - 12 - centerGap);
  const tabWidth = availableWidth / 4;

  if (index === 0) return paddingLeft + tabWidth * 0.5;
  if (index === 1) return paddingLeft + tabWidth * 1.5;
  if (index === 2) return paddingLeft + tabWidth * 2 + centerGap + tabWidth * 0.5;
  return paddingLeft + tabWidth * 2 + centerGap + tabWidth * 1.5;
}

/**
 * Animated individual tab item with subtle lift & spring scale pop on select.
 */
function AnimatedTabItem({
  route,
  isFocused,
  meta,
  onPress,
}: {
  route: TabRoute;
  isFocused: boolean;
  meta: TabMeta;
  onPress: () => void;
}) {
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [liftAnim] = useState(() => new Animated.Value(isFocused ? -2.5 : 0));

  useEffect(() => {
    if (isFocused) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 120,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.spring(liftAnim, {
          toValue: -2.5,
          friction: 6,
          tension: 80,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(liftAnim, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    }
  }, [isFocused, scaleAnim, liftAnim]);

  const scheme = useResolvedScheme();
  const dark = scheme === 'dark';
  const color = isFocused ? (dark ? '#A78BFA' : '#7545ED') : dark ? '#9A96B0' : '#8E8B99';

  return (
    <Pressable
      key={route.key}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={meta.label}
      onPress={onPress}
      style={styles.tabBtn}>
      <Animated.View
        style={[
          styles.tabIconWrap,
          {
            transform: [{ translateY: liftAnim }, { scale: scaleAnim }],
          },
        ]}>
        {meta.renderIcon(color, isFocused)}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color },
          isFocused ? styles.tabLabelActive : null,
        ]}>
        {meta.label}
      </Text>
      <View style={styles.indicatorSpacer} />
    </Pressable>
  );
}

/**
 * Reovita Floating Bottom Dock Navigation Bar.
 * Exact recreation of the Figma design with smooth shifting animations:
 * - Fluid sliding & stretching active underline indicator that shifts horizontally across tabs
 * - Active tab icon spring lift and bounce
 * - Center FAB: royal purple circle with white Reovita dual-leaf sprout emblem and spring press response
 * - Tabs: Home, Insights, [Center Sprout FAB], Records, Profile
 */
export function BottomDock({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const dockScheme = useResolvedScheme();
  const dockDark = dockScheme === 'dark';
  const router = useRouter();
  const [dockWidth, setDockWidth] = useState(INITIAL_DOCK_WIDTH);

  // Determine active logical tab index (0: Home, 1: Insights, 2: Records, 3: Profile)
  const activeRouteName = state.routes[state.index]?.name ?? 'dashboard';
  const activeLogicalIndex = TAB_INDEX_MAP[activeRouteName] ?? 0;

  // Sliding active indicator values held in state per React 19 guidelines
  const [indicatorX] = useState(
    () =>
      new Animated.Value(
        getTabCenterX(activeLogicalIndex, INITIAL_DOCK_WIDTH) - INDICATOR_WIDTH / 2
      )
  );
  const [indicatorScaleX] = useState(() => new Animated.Value(1));
  const isInitialMountRef = useRef(true);

  // Center FAB tactile spring scale
  const [fabScale] = useState(() => new Animated.Value(1));

  // Fluid sliding animation whenever active tab or dock width changes
  useEffect(() => {
    const targetX = getTabCenterX(activeLogicalIndex, dockWidth) - INDICATOR_WIDTH / 2;

    if (!isInitialMountRef.current) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(indicatorScaleX, {
            toValue: 1.35,
            duration: 110,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(indicatorScaleX, {
            toValue: 1,
            friction: 5,
            tension: 90,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.spring(indicatorX, {
          toValue: targetX,
          friction: 7,
          tension: 70,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    } else {
      isInitialMountRef.current = false;
      indicatorX.setValue(targetX);
    }
  }, [activeLogicalIndex, dockWidth, indicatorX, indicatorScaleX]);

  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 0.9,
      friction: 5,
      tension: 140,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

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
      <AnimatedTabItem
        key={route.key}
        route={route}
        isFocused={isFocused}
        meta={meta}
        onPress={onPress}
      />
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
      <View
        style={[styles.dockSurface, dockDark ? styles.dockSurfaceDark : null]}
        onLayout={(e) => setDockWidth(e.nativeEvent.layout.width)}>
        {/* Center Crest SVG that swells upward */}
        <View pointerEvents="none" style={styles.crestWrap}>
          <ExpoImage
            source={{ uri: dockDark ? CREST_URI_DARK : CREST_URI }}
            style={styles.crestSvg}
            contentFit="contain"
          />
        </View>

        {/* Sliding & Stretching Active Indicator Pill */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.slidingIndicator,
            {
              transform: [
                { translateX: indicatorX },
                { scaleX: indicatorScaleX },
              ],
            },
          ]}
        />

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
      <Animated.View
        style={[
          styles.fabWrap,
          {
            transform: [{ scale: fabScale }],
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upload medical report"
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          onPress={handleFabPress}
          style={styles.fabBtn}>
          <Image
            source={require('../../assets/images/reovita-sprout.png')}
            style={styles.fabIcon}
            resizeMode="contain"
          />
        </Pressable>
      </Animated.View>
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
  dockSurfaceDark: {
    backgroundColor: '#16142A',
    borderColor: '#2B2846',
    shadowColor: '#000',
    shadowOpacity: 0.4,
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
  slidingIndicator: {
    position: 'absolute',
    left: 0,
    bottom: 4,
    width: INDICATOR_WIDTH,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#7545ED',
    zIndex: 5,
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
  indicatorSpacer: {
    width: 26,
    height: 2.5,
    marginTop: 3,
  },
  fabWrap: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    zIndex: 10,
  },
  fabBtn: {
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
