import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@shared/api';

// POST /v1/auth/deactivate. The account keeps its data, but no request can use it until it is recovered
// by signing in again and choosing Recover. Cached data is cleared here so nothing stays on screen.
export function useDeactivateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await api.post('/v1/auth/deactivate');
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
