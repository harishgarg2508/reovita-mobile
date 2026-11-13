import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';

import { useAppDispatch, useAppSelector } from '@app-root/store';
import { selectIsSignedIn, selectSessionStatus, sessionReady } from '@entities/session';
import { LoginScreen, useGoogleSignIn } from '@features/auth';
import { isApiError } from '@shared/api';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';

export default function LoginRoute() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const signIn = useGoogleSignIn();
  const signedIn = useAppSelector(selectIsSignedIn);
  const sessionStatus = useAppSelector(selectSessionStatus);
  const palette = usePalette();
  const [recoverOpen, setRecoverOpen] = useState(false);

  // Wait for the session check so a signed-in user never sees the login screen.
  if (sessionStatus === 'loading') {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }
  if (signedIn) {
    return <Redirect href="/(app)/(tabs)/dashboard" />;
  }

  function runSignIn(reactivate: boolean) {
    signIn.mutate(
      { reactivate },
      {
        onSuccess: (session) => {
          if (!session) return; // user closed the account picker
          dispatch(sessionReady({ subjectId: session.codename, codename: session.codename }));
          router.replace('/(app)/(tabs)/dashboard');
        },
      },
    );
  }

  return (
    <>
    <LoginScreen
      onSignIn={() => runSignIn(false)}
      onRecover={() => setRecoverOpen(true)}
      showRecover={signIn.isError && isApiError(signIn.error, 'account_deactivated')}
      pending={signIn.isPending}
      errorMessage={signIn.isError ? signIn.error.message : null}
      />
      <Modal visible={recoverOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setRecoverOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.dialog, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.title, { color: palette.text }]}>Reactivate your account?</Text>
            <Text style={[styles.body, { color: palette.muted }]}>
              Your data was kept when the account was deactivated. Reactivating restores access to it.
            </Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={() => setRecoverOpen(false)} style={styles.cancel}>
                <Text style={[styles.cancelText, { color: palette.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setRecoverOpen(false);
                  runSignIn(true);
                }}
                style={styles.confirm}>
                <Text style={styles.confirmText}>Reactivate</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: 22, gap: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancel: { paddingHorizontal: 16, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  confirm: { paddingHorizontal: 18, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F6F3F' },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
