import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentSubject } from '@entities/subject';
import { SubjectQr } from '@features/qr-view';
import { Skeleton } from '@shared/ui/skeleton';

// Profile tab: the subject's code as a QR code, and log out.
export function ProfilePanel({ onSignOut }: { onSignOut: () => void }) {
  const insets = useSafeAreaInsets();
  const subject = useCurrentSubject();

  return (
    // Bottom padding leaves room for the floating tab dock.
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Show this code to link your health records.</Text>

      {subject.isLoading ? <Skeleton height={230} /> : null}
      {subject.data ? <SubjectQr codename={subject.data.codename} /> : null}
      {subject.isError ? <Text style={styles.error}>Could not load your code. Reopen this tab to try again.</Text> : null}

      <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.logout}>
        <Ionicons name="log-out-outline" size={18} color="#C22F43" />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#171717',
  },
  subtitle: {
    fontSize: 14,
    color: '#60646C',
  },
  error: {
    fontSize: 13,
    color: '#C22F43',
  },
  spacer: {
    flex: 1,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FAD4D8',
    backgroundColor: '#FDEEF0',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C22F43',
  },
});
