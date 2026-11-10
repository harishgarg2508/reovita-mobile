import { Redirect, useRouter } from 'expo-router';

import { useAppDispatch, useAppSelector } from '@app-root/store';
import { selectIsSignedIn, selectSessionStatus, sessionReady } from '@entities/session';
import { LoginScreen, useGoogleSignIn } from '@features/auth';
import { isApiError } from '@shared/api';
import { View } from 'react-native';

export default function LoginRoute() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const signIn = useGoogleSignIn();
  const signedIn = useAppSelector(selectIsSignedIn);
  const sessionStatus = useAppSelector(selectSessionStatus);

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
    <LoginScreen
      onSignIn={() => runSignIn(false)}
      onRecover={() => runSignIn(true)}
      showRecover={signIn.isError && isApiError(signIn.error, 'account_deactivated')}
      pending={signIn.isPending}
      errorMessage={signIn.isError ? signIn.error.message : null}
    />
  );
}
