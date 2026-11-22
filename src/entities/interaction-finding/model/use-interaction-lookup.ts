import { useMutation } from '@tanstack/react-query';

import { api } from '@shared/api';

import type { InteractionCheck } from './interaction-finding.types';

// Two medicines picked from the drug name suggestions, by their ingredient ids. Nothing about the person is sent and nothing is saved.
export function useInteractionLookup() {
  return useMutation({
    // Without idsB, the first medicine is checked against the person's own active medicines.
    mutationFn: async (input: { idsA: string[]; idsB?: string[] }): Promise<InteractionCheck> => {
      const { data } = await api.post<InteractionCheck>('/v1/interactions/lookup', { ingredient_ids_a: input.idsA, ...(input.idsB ? { ingredient_ids_b: input.idsB } : {}) });
      return data;
    },
  });
}
