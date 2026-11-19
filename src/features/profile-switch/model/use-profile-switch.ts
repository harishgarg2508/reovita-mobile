import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { isApiError } from '@shared/api';

import {
  activateAccountProfile,
  addAccountProfile,
  fetchAccountProfiles,
  reauthenticateAccountHolder,
} from './profile-switch.api';

export const ACCOUNT_PROFILES_KEY = ['account', 'profiles'] as const;

// The profiles of the signed-in account, the one in use marked. With family profiles off on the server this is the account's own profile.
export function useAccountProfiles() {
  return useQuery({
    queryKey: ACCOUNT_PROFILES_KEY,
    queryFn: fetchAccountProfiles,
    staleTime: 30_000,
  });
}

// Switches to another profile. Everything on screen belongs to the profile in use, so what was loaded for the last one is dropped,
// and the dashboard opens for the new one.
export function useSwitchProfile() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: activateAccountProfile,
    onSuccess: async () => {
      queryClient.clear();
      router.replace('/(app)/(tabs)/dashboard');
    },
  });
}

export type AddProfileFailure =
  'cancelled' | 'not_available' | 'limit' | 'wrong_account' | 'failed';

export const ADD_PROFILE_FAILURE_TEXT: Record<
  Exclude<AddProfileFailure, 'cancelled'>,
  string
> = {
  not_available: 'Family profiles are not available yet.',
  limit: 'This account already has the most profiles it can hold.',
  wrong_account:
    'That is not the Google account you are signed in with. Pick the same account to confirm.',
  failed: 'Could not add the profile. Please try again.',
};

// Adds a family profile. The server wants the account holder to have signed in again in the last 5 minutes, so the first try goes
// straight to the server, and only when it asks (reauth_required) does the person see the Google account chooser, after which the
// same request is sent once more. Returns why it did not finish, or null when the profile was added.
export function useAddProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nickname: string): Promise<AddProfileFailure | null> => {
      const run = async (): Promise<AddProfileFailure | null> => {
        await addAccountProfile(nickname);
        return null;
      };
      try {
        return await run();
      } catch (error) {
        if (isApiError(error, 'feature_disabled')) return 'not_available';
        if (isApiError(error, 'subject_limit_reached')) return 'limit';
        if (!isApiError(error, 'reauth_required')) return 'failed';
      }
      // Sign in again, then repeat the request.
      try {
        if (!(await reauthenticateAccountHolder())) return 'cancelled';
        return await run();
      } catch (error) {
        if (isApiError(error, 'reauth_account_mismatch'))
          return 'wrong_account';
        if (isApiError(error, 'feature_disabled')) return 'not_available';
        if (isApiError(error, 'subject_limit_reached')) return 'limit';
        return 'failed';
      }
    },
    onSuccess: (failure) => {
      if (failure === null)
        void queryClient.invalidateQueries({ queryKey: ACCOUNT_PROFILES_KEY });
    },
  });
}
