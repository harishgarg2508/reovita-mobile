import { api } from '@shared/api';

export interface CurrentSubject {
  codename: string;
}

// GET /v1/auth/me: the signed-in subject's codename, shown as the QR code on the profile screen.
export async function fetchCurrentSubject(): Promise<CurrentSubject> {
  const { data } = await api.get<CurrentSubject>('/v1/auth/me');
  return data;
}
