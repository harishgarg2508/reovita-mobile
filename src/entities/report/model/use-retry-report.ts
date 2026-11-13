import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, queryKeys } from '@shared/api';

// POST /v1/health/reports/{id}/retry. Runs OCR again on the stored file of a failed or needs-retake report.
// No new upload is needed. Returns the report queued again (status UPLOADED).
export function useRetryReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string): Promise<{ report_id: string; status: string }> => {
      const { data } = await api.post<{ report_id: string; status: string }>(`/v1/health/reports/${reportId}/retry`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.report.root });
    },
  });
}
