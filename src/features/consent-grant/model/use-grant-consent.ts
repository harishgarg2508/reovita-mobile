import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ConsentType } from '@entities/consent';
import { api, queryKeys } from '@shared/api';

export const CONSENT_VERSION = 'v1.0';

export function useGrantConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (type: ConsentType) => {
      const { data } = await api.post('/v1/consents', { type, version: CONSENT_VERSION });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consent.root });
    },
  });
}
