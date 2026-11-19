import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
  type DrawerContentComponentProps,
} from 'expo-router/drawer';
import { StyleSheet, View } from 'react-native';

import { useSignOut } from '@app-root/bootstrap/use-sign-out';
import { useCurrentSubject } from '@entities/subject';
import { ProfileSwitcher } from '@shared/ui/profile-switcher';

// Side menu for every signed-in screen. Sign out lives here so it is one tap away everywhere.
export function AppDrawerContent(props: DrawerContentComponentProps) {
  const signOut = useSignOut();
  // The profiles of this account. Until family profiles exist on the server, the list is the person's own profile only.
  const subject = useCurrentSubject();
  const codename = subject.data?.codename;

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.switcher}>
        {codename ? <ProfileSwitcher profiles={[{ id: 'me', label: codename, hint: 'You' }]} activeId="me" onSelect={() => undefined} /> : null}
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
