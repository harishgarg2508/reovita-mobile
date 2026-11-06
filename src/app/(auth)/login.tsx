import { Redirect, useRouter } from 'expo-router';

import { useAppDispatch, useAppSelector } from '@app-root/store';
import { selectIsSignedIn, sessionReady } from '@entities/session';
import { LoginScreen, useGoogleSignIn } from '@features/auth';

export default function LoginRoute() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const signIn = useGoogleSignIn();
  const signedIn = useAppSelector(selectIsSignedIn);

  if (signedIn) {
    return <Redirect href="/(app)/(tabs)/dashboard" />;
  }

  function onSignIn() {
    signIn.mutate(undefined, {
      onSuccess: (session) => {
        dispatch(sessionReady({ subjectId: session.codename, codename: session.codename }));
        router.replace('/(app)/(tabs)/dashboard');
      },
    });
  }

  return (
    <LoginScreen
      onSignIn={onSignIn}
      pending={signIn.isPending}
      errorMessage={signIn.isError ? signIn.error.message : null}
    />
  );
}
