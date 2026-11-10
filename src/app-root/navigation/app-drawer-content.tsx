import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
  type DrawerContentComponentProps,
} from 'expo-router/drawer';
import { StyleSheet, View } from 'react-native';

import { useSignOut } from '@app-root/bootstrap/use-sign-out';

// Side menu for every signed-in screen. Sign out lives here so it is one tap away everywhere.
export function AppDrawerContent(props: DrawerContentComponentProps) {
  const signOut = useSignOut();

  return (
    <DrawerContentScrollView {...props}>
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
