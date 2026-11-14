import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createMedicalHistory,
  deleteMedicalHistory,
  fetchMedicalHistories,
  type CreateMedicalHistoryInput,
} from './medical-history.api';

// The subject's medical history entries, newest first.
export function useMedicalHistories() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['medical-histories'] as const,
    queryFn: fetchMedicalHistories,
    staleTime: 0,
  });
  const add = useMutation({
    mutationFn: (input: CreateMedicalHistoryInput) => createMedicalHistory(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['medical-histories'] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteMedicalHistory(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['medical-histories'] }),
  });
  return { list, add, remove };
}
