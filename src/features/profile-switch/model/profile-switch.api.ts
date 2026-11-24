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
  // A child account this account manages (opened from here).
  linked: boolean;
  // The parent account, seen from a child account: shown, but it can not be opened from here.
  view_only: boolean;
  // The family member's own Google name, for the family view.
  display_name?: string | null;
}

// The account holder's email with the middle hidden (a•••@gmail.com): the account the first confirmation step must use.
export async function fetchHolder(): Promise<{ masked_email: string | null; login_hint: string | null }> {
  const { data } = await api.get<{ masked_email: string | null; login_hint: string | null }>('/v1/subjects/holder');
  return data;
}

export async function fetchHolderEmail(): Promise<string | null> {
  return (await fetchHolder()).masked_email;
}

export async function fetchAccountProfiles(): Promise<AccountProfile[]> {
  const { data } = await api.get<{ items: AccountProfile[] }>('/v1/subjects');
  return data.items;
}

// Links a child account by the Google sign-in of that child, with the name this account gives it. The server checks the recent sign-in first.
export async function linkAccountProfile(id_token: string, nickname: string): Promise<AccountProfile> {
  const { data } = await api.post<AccountProfile>('/v1/subjects/link', { id_token, nickname });
  return data;
}

// Stops managing a linked child account. The child keeps its own sign-in, profile and data.
export async function unlinkAccountProfile(subject_id: string): Promise<void> {
  await api.delete(`/v1/subjects/linked/${subject_id}`);
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
  // The holder confirms with their own Google account: on the web the window opens on that account (the email is sent to Google only for this step).
  const holder = await fetchHolder();
  const id_token = await getGoogleFirebaseIdToken({ confirmAs: holder.login_hint });
  if (!id_token) return false;
  const { data } = await api.post<{ data: { access_token: string } }>(
    '/v1/auth/reauth',
    { id_token },
  );
  setAccessToken(data.data.access_token);
  return true;
}
