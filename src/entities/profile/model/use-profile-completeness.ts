import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchOnboardingStatus } from './profile.api';

// Onboarding progress. Drives the route gate and the progress bar.
export function useProfileCompleteness() {
  return useQuery({
    queryKey: queryKeys.profile.onboardingStatus(),
    queryFn: fetchOnboardingStatus,
  });
}
