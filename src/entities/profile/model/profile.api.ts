import { api } from '@shared/api';

import type { OnboardingStatus } from './profile.types';

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const { data } = await api.get<OnboardingStatus>('/v1/onboarding/status');
  return data;
}
