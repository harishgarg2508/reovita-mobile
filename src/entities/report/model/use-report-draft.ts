import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchReportObservations } from './report.api';

// While OCR is still running the draft is not ready, so poll every 2 seconds until it arrives.
export function useReportDraft(reportId: string) {
  return useQuery({
    queryKey: queryKeys.report.observations(reportId),
    queryFn: () => fetchReportObservations(reportId),
    enabled: reportId.length > 0,
    refetchInterval: (query) => (query.state.data ? false : 2000),
    retry: false,
  });
}
