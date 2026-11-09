import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ConfirmReportResult, Observation } from '@entities/report';
import { api, queryKeys } from '@shared/api';

export interface ConfirmReportInput {
  reportId: string;
  observations: Observation[];
}

export function useConfirmReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, observations }: ConfirmReportInput): Promise<ConfirmReportResult> => {
      const { data } = await api.post<ConfirmReportResult>(`/v1/health/reports/${reportId}/confirm`, {
        observations,
      });
      return data;
    },
    onSuccess: (result, { reportId }) => {
      // Kept for the report's detail view, so it never has to fetch the observations again.
      queryClient.setQueryData(queryKeys.report.confirmed(reportId), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.report.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.home.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.score.root });
      queryClient.removeQueries({ queryKey: queryKeys.report.observations(reportId) });
    },
  });
}
