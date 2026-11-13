import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createMeasurement, type CreateMeasurementInput } from '@entities/measurement';

// Saves one or more readings together (a blood pressure pair is two readings at the same time).
export function useCreateMeasurement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inputs: CreateMeasurementInput[]) => Promise.all(inputs.map((input) => createMeasurement(input))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['measurements'] });
    },
  });
}
