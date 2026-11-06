import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchReportInterpretation } from './report.api';

export function useReportInterpretation(reportId: string) {
  return useQuery({
    queryKey: queryKeys.report.interpretation(reportId),
    queryFn: () => fetchReportInterpretation(reportId),
    enabled: reportId.length > 0,
  });
}
