import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchReportObservations } from './report.api';

// Observations are fetched once, when the report is ready (see useReportStatus). Nothing polls.
export function useReportDraft(reportId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.report.observations(reportId),
    queryFn: () => fetchReportObservations(reportId),
    enabled: reportId.length > 0 && (options?.enabled ?? true),
    // No retries: a 409 report_processing is answered by the event stream, which asks again once the report is ready.
    retry: false,
  });
}
