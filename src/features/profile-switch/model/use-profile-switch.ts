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
  | 'cancelled'
  | 'not_available'
  | 'premium'
  | 'limit'
  | 'wrong_account'
  | 'popup_blocked'
  | 'failed';

export const ADD_PROFILE_FAILURE_TEXT: Record<AddProfileFailure, string> = {
  cancelled: 'Google sign-in was closed, so the profile was not added. Try again and pick your account.',
  not_available: 'Family profiles are not available yet.',
  premium: 'Family profiles are part of Premium.',
  limit: 'This account already has the most profiles it can hold.',
  wrong_account: 'That is not the Google account you are signed in with. Pick the same account to confirm.',
  popup_blocked: 'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
  failed: 'Could not add the profile. Please try again.',
};

function failureOf(error: unknown): AddProfileFailure {
  if (isApiError(error, 'feature_disabled')) return 'not_available';
  if (isApiError(error, 'premium_required')) return 'premium';
  if (isApiError(error, 'subject_limit_reached')) return 'limit';
  if (isApiError(error, 'reauth_account_mismatch')) return 'wrong_account';
  if ((error as { code?: string } | null)?.code === 'auth/popup-blocked') return 'popup_blocked';
  return 'failed';
}

// Adds a family profile. The server wants the account holder to have signed in again in the last 5 minutes. The Google window has to open
// straight from the person's tap (a browser blocks a window opened after a network call), so the sign-in comes first, then the request.
// Returns why it did not finish, or null when the profile was added.
export function useAddProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nickname: string): Promise<AddProfileFailure | null> => {
      try {
        if (!(await reauthenticateAccountHolder())) return 'cancelled';
        await addAccountProfile(nickname);
        return null;
      } catch (error) {
        return failureOf(error);
      }
    },
    onSuccess: (failure) => {
      if (failure === null) void queryClient.invalidateQueries({ queryKey: ACCOUNT_PROFILES_KEY });
    },
  });
}
