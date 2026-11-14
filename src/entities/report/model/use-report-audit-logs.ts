import { useInfiniteQuery } from '@tanstack/react-query';

import { api } from '@shared/api';

export interface ReportAuditLog {
  id: string;
  stage: string;
  event: string;
  status: 'ok' | 'info' | 'error';
  // Codes and counts only, as the server wrote them.
  detail: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface ReportAuditLogPage {
  page: number;
  limit: number;
  has_more: boolean;
  items: ReportAuditLog[];
}

// One page of the stage log of a report, newest first (GET /v1/health/reports/logs?report_id=).
export function useReportAuditLogs(reportId: string) {
  return useInfiniteQuery({
    queryKey: ['report', reportId, 'audit-logs'] as const,
    queryFn: async ({ pageParam }): Promise<ReportAuditLogPage> => {
      const { data } = await api.get<ReportAuditLogPage | ReportAuditLog[]>('/v1/health/reports/logs', {
        params: { report_id: reportId, page: pageParam, limit: 10 },
      });
      // Older servers return a bare list of the newest rows, with no paging. It is one page with nothing after it.
      if (Array.isArray(data)) {
        return { page: 1, limit: data.length, has_more: false, items: data };
      }
      // Anything else that is not a page is an error, not an empty list.
      if (!data || !Array.isArray(data.items)) {
        throw new Error('The server did not return a log page');
      }
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.page + 1 : undefined),
    enabled: !!reportId,
  });
}
