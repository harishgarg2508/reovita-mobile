import { svgDataUri } from '@shared/lib';
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
import { usePalette } from '@shared/ui/theme/palette';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
type TabRoute = BottomTabBarProps['state']['routes'][number];

const CREST_SVG = `<svg viewBox="0 0 104 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M 0 20 C 24 20 30 3 52 3 C 74 3 80 20 104 20 L 104 28 L 0 28 Z" fill="#FFFDF9" />
  <path d="M 0 20 C 24 20 30 3 52 3 C 74 3 80 20 104 20" stroke="#E8E1D6" stroke-width="1.2" fill="none" />
</svg>`;
const CREST_SVG_DARK = `<svg viewBox="0 0 104 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M 0 20 C 24 20 30 3 52 3 C 74 3 80 20 104 20 L 104 28 L 0 28 Z" fill="#142038" />
  <path d="M 0 20 C 24 20 30 3 52 3 C 74 3 80 20 104 20" stroke="#233252" stroke-width="1.2" fill="none" />
</svg>`;

const CREST_URI = svgDataUri(CREST_SVG);
const CREST_URI_DARK = svgDataUri(CREST_SVG_DARK);

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
  records: {
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
  records: 2,
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

// One item of a dock.
export interface DockItem {
  key: string;
  label: string;
  accessibilityLabel?: string;
  renderIcon: (color: string, focused: boolean) => React.ReactNode;
  focused: boolean;
  onPress: () => void;
  // A number shown in a small red heart badge above the icon (new kudos, for example). Nothing when it is 0 or missing.
  badge?: number;
  // A plain action and not a tab: drawn in the quiet purple of the QR item, with no lift and no focus colour.
  plain?: boolean;
}

/**
 * Animated individual tab item with subtle lift & spring scale pop on select.
 */
function AnimatedTabItem({ item }: { item: DockItem }) {
  const isFocused = item.focused;
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
  const accentColor = usePalette().accent;
  const color = isFocused ? accentColor : dark ? '#9DAAC0' : '#7F8A9B';

  if (item.plain) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={item.accessibilityLabel ?? item.label} onPress={item.onPress} style={styles.uploadItem}>
        {item.renderIcon('#8D96A5', false)}
        <Text style={styles.uploadLabel}>{item.label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={item.accessibilityLabel ?? item.label}
      onPress={item.onPress}
      style={styles.tabBtn}>
      <Animated.View
        style={[
          styles.tabIconWrap,
          {
            transform: [{ translateY: liftAnim }, { scale: scaleAnim }],
          },
        ]}>
        {item.renderIcon(color, isFocused)}
        {item.badge && item.badge > 0 ? (
          <View accessibilityLabel={`${item.badge} new`} style={styles.badge}>
            <Ionicons name="heart" size={10} color="#FFFFFF" />
            <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
          </View>
        ) : null}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color },
          isFocused ? styles.tabLabelActive : null,
        ]}>
        {item.label}
      </Text>
      <View style={styles.indicatorSpacer} />
    </Pressable>
  );
}

/**
 * Reovita Floating Bottom Dock, drawn from a list of items. The main tab bar and the social dock both use it, so they share one look and
 * one set of animations:
 * - Fluid sliding & stretching active underline indicator that shifts horizontally across the four slots
 * - Active tab icon spring lift and bounce
 * - Center FAB: green circle with a white icon and spring press response, on the crest that swells above the dock
 * - Two items on each side of the centre button. `activeIndex` is the slot of the active item (0 and 1 left, 2 and 3 right), or -1 for none.
 */
export function AnimatedDock({
  left,
  right,
  activeIndex,
  centerLabel,
  centerIcon,
  onCenterPress,
  bottomInset = 0,
}: {
  left: DockItem[];
  right: DockItem[];
  activeIndex: number;
  centerLabel: string;
  centerIcon: React.ReactNode;
  onCenterPress: () => void;
  bottomInset?: number;
}) {
  const dockScheme = useResolvedScheme();
  const dockAccent = usePalette().accent;
  const dockDark = dockScheme === 'dark';
  // Lift the dock above the phone's bottom bar or gesture area. Take the larger of the given inset and the live one.
  const liveInsets = useSafeAreaInsets();
  const bottom = Math.max(bottomInset, liveInsets.bottom);
  const [dockWidth, setDockWidth] = useState(INITIAL_DOCK_WIDTH);
  const slot = Math.max(activeIndex, 0);

  // Sliding active indicator values held in state per React 19 guidelines
  const [indicatorX] = useState(() => new Animated.Value(getTabCenterX(slot, INITIAL_DOCK_WIDTH) - INDICATOR_WIDTH / 2));
  const [indicatorScaleX] = useState(() => new Animated.Value(1));
  const isInitialMountRef = useRef(true);

  // Center FAB tactile spring scale
  const [fabScale] = useState(() => new Animated.Value(1));

  // Fluid sliding animation whenever active tab or dock width changes
  useEffect(() => {
    const targetX = getTabCenterX(slot, dockWidth) - INDICATOR_WIDTH / 2;

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
  }, [slot, dockWidth, indicatorX, indicatorScaleX]);

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

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockWrap,
        {
          bottom: Math.max(bottom, 12) + 4,
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
              backgroundColor: dockAccent,
              opacity: activeIndex < 0 ? 0 : 1,
              transform: [
                { translateX: indicatorX },
                { scaleX: indicatorScaleX },
              ],
            },
          ]}
        />

        {/* Left side */}
        <View style={styles.halfTabs}>
          {left.map((item) => (
            <AnimatedTabItem key={item.key} item={item} />
          ))}
        </View>

        {/* Center spacing for the floating action button */}
        <View style={styles.centerSpace} />

        {/* Right side */}
        <View style={styles.halfTabs}>
          {right.map((item) => (
            <AnimatedTabItem key={item.key} item={item} />
          ))}
        </View>
      </View>

      {/* Center Floating Action Button */}
      <Animated.View
        style={[
          styles.fabWrap,
          {
            transform: [{ scale: fabScale }],
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={centerLabel}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          onPress={onCenterPress}
          style={styles.fabBtn}>
          {centerIcon}
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * The main tab bar: Home, QR, [centre upload button], Records, Profile.
 */
export function BottomDock({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const router = useRouter();
  // Determine active logical tab index (0: Home, 1: QR slot, 2: Records, 3: Profile)
  const activeRouteName = state.routes[state.index]?.name ?? 'dashboard';
  const activeLogicalIndex = TAB_INDEX_MAP[activeRouteName] ?? 0;

  // Find routes by name to ensure stable placement regardless of route order
  const entryFor = (name: string): DockItem | null => {
    const route = state.routes.find((r: TabRoute) => r.name === name);
    if (!route) return null;
    const isFocused = state.routes[state.index]?.key === route.key;
    const meta = TAB_META[route.name] ?? {
      label: route.name,
      renderIcon: (color: string) => <Ionicons name="ellipse" size={18} color={color} />,
    };
    return {
      key: route.key,
      label: meta.label,
      renderIcon: meta.renderIcon,
      focused: isFocused,
      onPress: () => {
        const event = emitter.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          tapSelection();
          navigateToTab(route.key);
        }
      },
    };
  };

  // The QR scan pushes the scan screen: it is not a tab.
  const qr: DockItem = {
    key: 'qr',
    label: 'QR',
    accessibilityLabel: 'Scan a QR code',
    renderIcon: () => <Ionicons name="qr-code-outline" size={21} color="#8D96A5" />,
    focused: false,
    plain: true,
    onPress: () => {
      tapConfirm();
      router.push('/(app)/scan');
    },
  };

  return (
    <AnimatedDock
      left={[entryFor('dashboard'), qr].filter((i): i is DockItem => Boolean(i))}
      right={[entryFor('records'), entryFor('settings')].filter((i): i is DockItem => Boolean(i))}
      activeIndex={activeLogicalIndex}
      centerLabel="Upload a report"
      centerIcon={<Ionicons name="cloud-upload-outline" size={30} color="#FFFFFF" />}
      // The centre button uploads a report.
      onCenterPress={() => {
        tapConfirm();
        router.push('/(app)/reports/upload');
      }}
      bottomInset={insets.bottom}
    />
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
    backgroundColor: '#142038',
    borderColor: '#233252',
    shadowColor: '#000',
    shadowOpacity: 0.4,
  },
  dockSurface: {
    width: '100%',
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E8E1D6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    shadowColor: '#0F1B2D',
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
    backgroundColor: '#1B5E9E',
    zIndex: 5,
  },
  // The red badge above an icon, like a new-likes badge: a small heart and the number.
  badge: { position: 'absolute', top: -20, left: -4, minWidth: 34, height: 22, borderRadius: 8, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#FF3040' },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  uploadItem: { alignItems: 'center', justifyContent: 'center', gap: 3, flex: 1, height: '100%' },
  uploadLabel: { fontSize: 11, color: '#8D96A5', fontWeight: '500' },
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
    backgroundColor: '#F2745B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F2745B',
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
