import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, queryKeys } from '@shared/api';

// DELETE /v1/health/reports/{id}. Removes the report, its values and its files. This cannot be undone.
export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      await api.delete(`/v1/health/reports/${reportId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.report.root });
      void queryClient.invalidateQueries({ queryKey: ['records'] });
    },
  });
}
