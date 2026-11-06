import { api } from '@shared/api';

import type { Consent } from './consent.types';

export async function fetchConsents(): Promise<Consent[]> {
  const { data } = await api.get<Consent[]>('/v1/consents');
  return data;
}
