import { useQuery } from '@tanstack/react-query';

import { api } from '@shared/api';

export type ProfileStepNumber = 1 | 2 | 3;

// The values saved for one onboarding step (GET /v1/onboarding/steps/{step}). Refetched when the
// profile tab comes back into focus, so an edit made in the onboarding step shows up straight away.
export function useProfileStepSaved(step: ProfileStepNumber) {
  return useQuery({
    queryKey: ['onboarding', 'step', step] as const,
    queryFn: async (): Promise<Record<string, unknown>> => {
      const { data } = await api.get<Record<string, unknown>>(`/v1/onboarding/steps/${step}`);
      // The saved values sit under "data" in the envelope; a flat body is used as it is.
      const inner = (data as { data?: unknown }).data;
      return inner && typeof inner === 'object' ? (inner as Record<string, unknown>) : data;
    },
    staleTime: 0,
  });
}
