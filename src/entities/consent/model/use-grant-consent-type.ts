import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, queryKeys } from '@shared/api';

import type { ConsentType } from './consent.types';

// Same legal text version as the onboarding consent screens.
export const CONSENT_TEXT_VERSION = 'v1.0';

// POST /v1/consents. Turns a permission back on from the profile, without the onboarding screens.
export function useGrantConsentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (type: ConsentType) => {
      await api.post('/v1/consents', { type, version: CONSENT_TEXT_VERSION });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consent.root });
    },
  });
}
