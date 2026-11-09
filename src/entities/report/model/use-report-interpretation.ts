import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchReportInterpretation } from './report.api';

export function useReportInterpretation(reportId: string) {
  return useQuery({
    queryKey: queryKeys.report.interpretation(reportId),
    queryFn: () => fetchReportInterpretation(reportId),
    enabled: reportId.length > 0,
    // 404 interpretation_not_found means the report is not confirmed yet. That is an answer, not a failure.
    retry: false,
  });
}
