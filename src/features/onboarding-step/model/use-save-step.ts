import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, queryKeys } from '@shared/api';

import type { BasicsInput, HistoryInput, LifestyleInput } from './onboarding.types';

export type StepInput =
  | { step: 1; body: BasicsInput }
  | { step: 2; body: HistoryInput }
  | { step: 3; body: LifestyleInput };

export function useSaveStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ step, body }: StepInput) => {
      const { data } = await api.post(`/v1/onboarding/steps/${step}`, body);
      return data;
    },
    onSuccess: () => {
      // The saved values of every step are read again, so the profile shows the update straight away.
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'step'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.home.root });
    },
  });
}
