import { api, setAccessToken } from '@shared/api';
import { getGoogleFirebaseIdToken } from '@shared/lib/google-firebase-token';

// One person an account manages: the account's own profile or a family profile.
export interface AccountProfile {
  subject_id: string;
  codename: string;
  role: 'owner' | 'member';
  // Set for a family profile. The account's own profile has none: the app calls it "You".
  nickname: string | null;
  is_active: boolean;
  profile_complete: boolean;
}

export async function fetchAccountProfiles(): Promise<AccountProfile[]> {
  const { data } = await api.get<{ items: AccountProfile[] }>('/v1/subjects');
  return data.items;
}

export async function addAccountProfile(
  nickname: string,
): Promise<AccountProfile> {
  const { data } = await api.post<AccountProfile>('/v1/subjects', { nickname });
  return data;
}

// Switches the profile in use. The new access token replaces the one in memory, and the server moves the sign-in to the profile.
export async function activateAccountProfile(
  subject_id: string,
): Promise<void> {
  const { data } = await api.post<{ data: { access_token: string } }>(
    `/v1/subjects/${subject_id}/activate`,
  );
  setAccessToken(data.data.access_token);
}

// Signs the account holder in again with Google (a new Firebase ID token) and tells the server. Adding or deleting a family profile
// is allowed for 5 minutes after this. Returns false when the person closes the Google account chooser.
export async function reauthenticateAccountHolder(): Promise<boolean> {
  const id_token = await getGoogleFirebaseIdToken();
  if (!id_token) return false;
  const { data } = await api.post<{ data: { access_token: string } }>(
    '/v1/auth/reauth',
    { id_token },
  );
  setAccessToken(data.data.access_token);
  return true;
}
