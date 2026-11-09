import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Observation } from '@entities/report';
import { api, queryKeys } from '@shared/api';

export interface ConfirmReportInput {
  reportId: string;
  observations: Observation[];
}

export function useConfirmReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, observations }: ConfirmReportInput): Promise<{ report_id: string; status: string }> => {
      const { data } = await api.post<{ report_id: string; status: string }>(`/v1/health/reports/${reportId}/confirm`, {
        observations,
      });
      return data;
    },
    onSuccess: (_result, { reportId, observations }) => {
      // The confirmed values are kept locally, so the final view never fetches the observations again.
      queryClient.setQueryData(queryKeys.report.confirmed(reportId), { observations });
      queryClient.invalidateQueries({ queryKey: queryKeys.report.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.home.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.score.root });
      queryClient.removeQueries({ queryKey: queryKeys.report.observations(reportId) });
    },
  });
}
