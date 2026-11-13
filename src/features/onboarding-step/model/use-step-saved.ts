import { useQuery } from '@tanstack/react-query';

import { api } from '@shared/api';

import type { OnboardingStepNumber } from './step-href';

// The values already saved for one onboarding step, from GET /v1/onboarding/steps/{step}.
export function useStepSaved(step: OnboardingStepNumber, enabled = true) {
  return useQuery({
    queryKey: ['onboarding', 'step', step] as const,
    enabled,
    queryFn: async (): Promise<Record<string, unknown>> => {
      const { data } = await api.get<Record<string, unknown>>(`/v1/onboarding/steps/${step}`);
      // The saved values sit under "data" in the envelope; a flat body is used as it is.
      const inner = (data as { data?: unknown }).data;
      return inner && typeof inner === 'object' ? (inner as Record<string, unknown>) : data;
    },
    // Fetched each time the step opens, so the form always starts from what the server holds.
    staleTime: 0,
  });
}
