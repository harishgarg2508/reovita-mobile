import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import type { ConfirmReportResult } from './report.types';

// The result of confirming a report. useConfirmReport stores it in the query cache, and nothing fetches it.
// Used by the review and detail screens instead of calling the observations API again.
export function useConfirmedReport(reportId: string) {
  return useQuery<ConfirmReportResult>({
    queryKey: queryKeys.report.confirmed(reportId),
    queryFn: () => Promise.reject(new Error('Report not confirmed yet')),
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });
}
