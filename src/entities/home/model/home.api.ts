import { api } from '@shared/api';

import type { HomeSummary } from './home.types';

export async function fetchHome(): Promise<HomeSummary> {
  const { data } = await api.get<HomeSummary>('/v1/home');
  return data;
}
