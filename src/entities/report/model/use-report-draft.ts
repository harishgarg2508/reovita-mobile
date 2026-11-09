import { useQuery } from '@tanstack/react-query';

import { isApiError, queryKeys } from '@shared/api';

import { fetchReportObservations } from './report.api';

// Observations are fetched once, when the report is ready (see useReportStatus). Nothing polls.
export function useReportDraft(reportId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.report.observations(reportId),
    queryFn: () => fetchReportObservations(reportId),
    enabled: reportId.length > 0 && (options?.enabled ?? true),
    // 409 report_processing means the report is still being read. Retry a bounded number of times, then stop.
    retry: (failureCount, error) => isApiError(error) && error.status === 409 && failureCount < 40,
    retryDelay: 3000,
  });
}
