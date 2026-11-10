import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, queryKeys } from '@shared/api';

import type { ConsentType } from './consent.types';

// POST /v1/consents/{type}/revoke. Stops the processing that the consent covers.
export function useRevokeConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (type: ConsentType) => {
      await api.post(`/v1/consents/${type}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consent.root });
    },
  });
}
