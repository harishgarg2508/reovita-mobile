import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, queryKeys } from '@shared/api';

// Same version string as the onboarding consents (see features/consent-grant).
export const LLM_CONSENT_VERSION = 'v1.0';

// POST /v1/consents for llm_processing. A report cannot be interpreted until this is granted.
export function useGrantLlmConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/v1/consents', { type: 'llm_processing', version: LLM_CONSENT_VERSION });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consent.root });
    },
  });
}
