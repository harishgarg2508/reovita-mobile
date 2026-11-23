import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapConfirm, tapSelection, useKeyboardVisible } from '@shared/lib';
import { AnimatedDock, type BottomTabBarProps, type DockItem } from '@shared/ui/bottom-dock';
import { useMyHandle } from '@entities/social';

import { socialRoute } from '../model/routes';

// The icon of a dock item: the outline when closed, the filled one when its screen is open.
function iconFor(name: keyof typeof Ionicons.glyphMap, filled: keyof typeof Ionicons.glyphMap): DockItem['renderIcon'] {
  return function DockIcon(color, focused) {
    return <Ionicons name={focused ? filled : name} size={22} color={color} />;
  };
}

// Height the dock takes at the bottom of a screen, so a list can leave room under its last item.
export const SOCIAL_DOCK_SPACE = 96;

// The names of the tab screens, in the order of the dock: two left of the centre button, two right of it.
const TABS = ['index', 'search', 'move', 'me'] as const;

// The one bottom dock of Social: Home, Search, [Post], Move, Profile. It is the tab bar of the Social tabs (app/(app)/social/(tabs)), so it is drawn once, by
// the layout, and stays in place while the screens change under it. It is the same shared dock as the main tabs (the same look, crest, sliding indicator and
// button animation), with Post as the centre button. It is not shown to a person who has not created a social account yet, nor while the keyboard is open.
export function SocialTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  const keyboard = useKeyboardVisible();
  if (!me.joined || me.needsJoin || keyboard) return null;

  const activeName = state.routes[state.index]?.name ?? 'index';
  const go = (name: (typeof TABS)[number]) => {
    if (name === activeName) return;
    tapSelection();
    const route = state.routes.find((r: { name: string }) => r.name === name);
    if (!route) return;
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigateToTab(route.key);
  };

  const left: DockItem[] = [
    { key: 'home', label: 'Home', renderIcon: iconFor('home-outline', 'home'), focused: activeName === 'index', onPress: () => go('index') },
    { key: 'search', label: 'Search', renderIcon: iconFor('search-outline', 'search'), focused: activeName === 'search', onPress: () => go('search') },
  ];
  const right: DockItem[] = [
    { key: 'move', label: 'Move', renderIcon: iconFor('walk-outline', 'walk'), focused: activeName === 'move', onPress: () => go('move') },
    { key: 'profile', label: 'Profile', renderIcon: iconFor('person-outline', 'person'), focused: activeName === 'me', onPress: () => go('me') },
  ];
  const activeIndex = TABS.indexOf(activeName as (typeof TABS)[number]);

  return (
    <AnimatedDock
      left={left}
      right={right}
      activeIndex={activeIndex}
      centerLabel="New post"
      centerIcon={<Ionicons name="add" size={32} color="#FFFFFF" />}
      onCenterPress={() => {
        tapConfirm();
        router.push(socialRoute('/social/compose'));
      }}
      bottomInset={insets.bottom}
    />
  );
}
