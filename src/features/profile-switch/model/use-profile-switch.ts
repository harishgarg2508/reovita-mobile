import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';

import { consentFlowReset } from '@entities/consent';
import { onboardingDraftsReset } from '@entities/onboarding';

import { isApiError } from '@shared/api';

import { getGoogleIdTokenForLink, lastGoogleSignInErrorCode } from '@shared/lib/google-firebase-token';

import {
  activateAccountProfile,
  fetchAccountProfiles,
  fetchHolderEmail,
  linkAccountProfile,
  reauthenticateAccountHolder,
  unlinkAccountProfile,
} from './profile-switch.api';
import { startFreshTabs, TABS_GENERATION_KEY } from './tabs-generation';

export const ACCOUNT_PROFILES_KEY = ['account', 'profiles'] as const;

// The profiles of the signed-in account, the one in use marked. With family profiles off on the server this is the account's own profile.
export function useAccountProfiles() {
  return useQuery({
    queryKey: ACCOUNT_PROFILES_KEY,
    queryFn: fetchAccountProfiles,
    staleTime: 0,
  });
}

// Switches to another profile. Everything on screen belongs to the profile in use, so what was loaded for the last one is dropped,
// and the dashboard opens for the new one.
export function useSwitchProfile() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: activateAccountProfile,
    onSuccess: () => {
      // The dashboard opens first, for whichever profile is now in use, and whichever tab the switch was made from. Navigating first means a slow
      // or failed refresh below can not keep the person on the old screen.
      startFreshTabs(queryClient);
      router.navigate('/(app)/(tabs)/dashboard');
      // The saved onboarding and consent progress belongs to the profile it was made for. The new profile starts with its own.
      dispatch(consentFlowReset());
      dispatch(onboardingDraftsReset());
      // Everything shown for the previous profile is forgotten, so the new profile asks the server for its own data.
      // The profile list is kept (it is refetched, not removed), so the dock and the family view follow the profile now in use.
      void (async () => {
        await queryClient.cancelQueries();
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== ACCOUNT_PROFILES_KEY[0] && query.queryKey[0] !== TABS_GENERATION_KEY[0] });
        await queryClient.invalidateQueries({ queryKey: ACCOUNT_PROFILES_KEY });
      })();
    },
  });
}

export type AddProfileFailure =
  | 'confirm_again'
  | 'cancelled'
  | 'not_available'
  | 'premium'
  | 'limit'
  | 'wrong_account'
  | 'popup_blocked'
  | 'failed';

export const ADD_PROFILE_FAILURE_TEXT: Record<AddProfileFailure, string> = {
  confirm_again: 'Confirm again to continue. It has been a few minutes since you confirmed it is you.',
  cancelled: 'Google sign-in was closed, so the profile was not added. Try again and pick your account.',
  not_available: 'Family profiles are not available yet.',
  premium: 'Family profiles are part of Premium.',
  limit: 'This account already has the most profiles it can hold.',
  wrong_account: 'That is not the Google account you use for Reovita. Pick the account shown above.',
  popup_blocked: 'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
  failed: 'Could not add the profile. Please try again.',
};

// The codes behind the last failure, shown under the message so the cause can be read on the screen.
let lastApiError = '';
export function lastFailureDetail(): string {
  return [lastGoogleSignInErrorCode(), lastApiError].filter(Boolean).join(' · ');
}

export function failureOf(error: unknown): AddProfileFailure {
  const data = (error as { response?: { data?: { error?: string } } } | null)?.response?.data;
  lastApiError = data?.error ?? (error as { code?: string } | null)?.code ?? (error as Error | null)?.message?.slice(0, 60) ?? '';
  if (isApiError(error, 'feature_disabled')) return 'not_available';
  if (isApiError(error, 'premium_required')) return 'premium';
  if (isApiError(error, 'subject_limit_reached')) return 'limit';
  if (isApiError(error, 'reauth_account_mismatch')) return 'wrong_account';
  if (isApiError(error, 'reauth_required')) return 'confirm_again';
  if ((error as { code?: string } | null)?.code === 'auth/popup-blocked') return 'popup_blocked';
  return 'failed';
}

// Adds a family profile by linking the Google account of the person being added. The account holder signs in again first (the server wants that in the
// last 5 minutes); then the new person's Google account is chosen and linked, under the name given. The new person keeps its own sign-in, profile,
// consents and data. Returns why it did not finish, or null when the profile was added.
// Step 1 of adding a family profile: the account holder confirms it is them, with their OWN Google account. The server wants that in the last
// 5 minutes. Resolves to true when it is confirmed, false when the chooser was closed.
// The account holder's masked email, for the first confirmation step.
export function useHolderEmail() {
  return useQuery({ queryKey: ['account', 'holder-email'] as const, queryFn: fetchHolderEmail, staleTime: 0 });
}

export function useConfirmAccountHolder() {
  return useMutation({
    mutationFn: async (): Promise<boolean> => reauthenticateAccountHolder(),
  });
}

// Step 2: the family member's Google account is chosen and linked, under the name given. It runs from its own tap, so the browser lets its Google
// window open (a window opened after a network call would be blocked on the web). The new person keeps its own sign-in, profile, consents and data.
// Returns why it did not finish, or null when the profile was added.
export function useLinkChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nickname: string): Promise<AddProfileFailure | null> => {
      try {
        const childToken = await getGoogleIdTokenForLink();
        if (!childToken) return 'cancelled';
        await linkAccountProfile(childToken, nickname);
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

// Stops managing a linked child account. The account holder signs in again first, as for adding one.
export function useUnlinkProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subject_id: string): Promise<boolean> => {
      if (!(await reauthenticateAccountHolder())) return false;
      await unlinkAccountProfile(subject_id);
      return true;
    },
    onSuccess: (done) => {
      if (done) void queryClient.invalidateQueries({ queryKey: ACCOUNT_PROFILES_KEY });
    },
  });
}

// Whether the profile in use is a family member's. A family view shows the health details only: Social and the other social features are not shown.
export function useIsFamilyView(): boolean {
  const profiles = useAccountProfiles();
  const active = profiles.data?.find((profile) => profile.is_active);
  return active !== undefined && active.role === 'member';
}

// The profile in use, from the list: its nickname (the name the family gave it) and codename.
export function useActiveProfile() {
  const profiles = useAccountProfiles();
  return profiles.data?.find((profile) => profile.is_active);
}

// The account's own profile: the one to switch back to from a family view.
export function useOwnProfile() {
  const profiles = useAccountProfiles();
  return profiles.data?.find((profile) => profile.role === 'owner' && !profile.view_only && !profile.linked);
}

