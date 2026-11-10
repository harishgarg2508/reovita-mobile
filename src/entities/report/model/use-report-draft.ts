import { useQuery } from '@tanstack/react-query';

import { isApiError, queryKeys } from '@shared/api';

import { fetchReportObservations } from './report.api';

// Observations are fetched once, when the report is ready (see useReportStatus). Nothing polls.
// Only report_processing (OCR still running) is retried. report_not_readable is final and shown to the user.
export function useReportDraft(reportId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.report.observations(reportId),
    queryFn: () => fetchReportObservations(reportId),
    enabled: reportId.length > 0 && (options?.enabled ?? true),
    retry: (failureCount, error) => isApiError(error, 'report_processing') && failureCount < 40,
    retryDelay: 3000,
  });
}
