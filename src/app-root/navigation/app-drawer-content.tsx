import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
  type DrawerContentComponentProps,
} from 'expo-router/drawer';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSignOut } from '@app-root/bootstrap/use-sign-out';
import { ProfileSwitcher, type SwitcherProfile } from '@shared/ui/profile-switcher';

// Sample profiles for the dropdown design. Not real data: switching is not connected to anything yet.
const SAMPLE_PROFILES: SwitcherProfile[] = [
  { id: 'me', label: 'VT-4762-AQ', hint: 'You' },
  { id: 'p2', label: 'VT-1830-KM', hint: 'Sample profile' },
];

// Side menu for every signed-in screen. Sign out lives here so it is one tap away everywhere.
export function AppDrawerContent(props: DrawerContentComponentProps) {
  const signOut = useSignOut();
  const [activeId, setActiveId] = useState('me');

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.switcher}>
        <ProfileSwitcher profiles={SAMPLE_PROFILES} activeId={activeId} onSelect={setActiveId} onAdd={() => undefined} />
      </View>
      <DrawerItemList {...props} />
      <View style={styles.divider} />
      <DrawerItem
        label="Sign out"
        onPress={() => {
          void signOut();
        }}
        labelStyle={styles.signOutLabel}
      />
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  switcher: { paddingHorizontal: 12, paddingBottom: 8 },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  signOutLabel: {
    color: '#E34255',
    fontWeight: '600',
  },
});
