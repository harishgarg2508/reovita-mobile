import { useQuery } from '@tanstack/react-query';

import { api } from '@shared/api';

import type { InteractionCheck } from './interaction-finding.types';

// The interaction check for the signed-in user's active medicines.
export function useInteractions() {
  return useQuery({
    queryKey: ['interactions'] as const,
    queryFn: async (): Promise<InteractionCheck> => {
      const { data } = await api.get<InteractionCheck>('/v1/interactions');
      return data;
    },
  });
}
