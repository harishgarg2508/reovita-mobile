import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapConfirm, tapSelection } from '@shared/lib';
import { AnimatedDock, type DockItem } from '@shared/ui/bottom-dock';
import { useMyHandle, useSocialUnread } from '@entities/social';

import { SOCIAL_HOME, socialProfileHref, socialRoute } from '../model/routes';

// The icon of a dock item: the outline when closed, the filled one when its screen is open.
function iconFor(name: keyof typeof Ionicons.glyphMap, filled: keyof typeof Ionicons.glyphMap): DockItem['renderIcon'] {
  return function DockIcon(color, focused) {
    return <Ionicons name={focused ? filled : name} size={22} color={color} />;
  };
}

export type SocialDockItem = 'home' | 'search' | 'kudos' | 'profile';

// Height the dock takes at the bottom of a screen, so a list can leave room under its last item.
export const SOCIAL_DOCK_SPACE = 96;

// The bottom dock of Social: Home, Search, [Post], Kudos, Profile. It is the same dock as the main tabs (the same shared dock, so the same
// look, crest, sliding indicator and button animation), with Post as the centre button. Switching between Home, Search, Kudos and Profile
// replaces the screen instead of stacking a new one, so Back always leaves Social. Post opens the composer on top. It is not shown to a person
// who has not created a social account yet: there is nothing to go to.
export function SocialDock({ active }: { active?: SocialDockItem }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMyHandle();
  // The unread counts for the Kudos badge. They are kept live by the social stream (see SocialStream), which the Social layout opens once.
  const unread = useSocialUnread(me.joined);
  if (!me.joined) return null;
  const handle = me.data?.handle ?? '';

  const go = (item: SocialDockItem) => {
    if (item === active) return;
    tapSelection();
    if (item === 'home') router.replace(SOCIAL_HOME);
    else if (item === 'search') router.replace(socialRoute('/social/search'));
    else if (item === 'kudos') router.replace(socialRoute('/social/kudos'));
    else router.replace(socialProfileHref(handle));
  };

  const left: DockItem[] = [
    { key: 'home', label: 'Home', renderIcon: iconFor('home-outline', 'home'), focused: active === 'home', onPress: () => go('home') },
    { key: 'search', label: 'Search', renderIcon: iconFor('search-outline', 'search'), focused: active === 'search', onPress: () => go('search') },
  ];
  const right: DockItem[] = [
    { key: 'kudos', label: 'Kudos', renderIcon: iconFor('heart-outline', 'heart'), focused: active === 'kudos', badge: unread.data?.kudos ?? 0, onPress: () => go('kudos') },
    { key: 'profile', label: 'Profile', renderIcon: iconFor('person-outline', 'person'), focused: active === 'profile', onPress: () => go('profile') },
  ];
  // The slot of the active item: 0 and 1 left of the centre button, 2 and 3 right of it. None active (another person's page): no indicator.
  const order: SocialDockItem[] = ['home', 'search', 'kudos', 'profile'];
  const activeIndex = active ? order.indexOf(active) : -1;

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
