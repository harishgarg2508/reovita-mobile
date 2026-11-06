import { useQuery } from '@tanstack/react-query';

import { isApiError, queryKeys } from '@shared/api';

import { fetchOnboardingStatus } from './profile.api';

// Onboarding progress. Drives the route gate and the progress bar.
// A 428 means the profile is incomplete, which is an answer, not a failure, so it is not retried.
export function useProfileCompleteness() {
  return useQuery({
    queryKey: queryKeys.profile.onboardingStatus(),
    queryFn: fetchOnboardingStatus,
    retry: (failureCount, error) => !(isApiError(error) && error.status === 428) && failureCount < 3,
  });
}
