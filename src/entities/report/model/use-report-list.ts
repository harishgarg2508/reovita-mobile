import { useInfiniteQuery } from '@tanstack/react-query';

import { api, queryKeys } from '@shared/api';

export type ReportType = 'blood_report' | 'prescription' | 'scan' | 'other';

export interface ReportListItem {
  id: string;
  created_at: string;
  report_type?: ReportType;
  /** The name the person gave when the type is other. */
  type_label?: string | null;
}

// The words shown for a report in a list: its type, or the name given for "other".
export function reportTypeLabel(item: Pick<ReportListItem, 'report_type' | 'type_label'>): string {
  switch (item.report_type) {
    case 'prescription':
      return 'Prescription';
    case 'scan':
      return 'Scan or imaging';
    case 'other':
      return item.type_label?.trim() || 'Other document';
    default:
      return 'Lab report';
  }
}

// Only a lab report is read as lab results and reviewed. The other types are summarised, so they open on their summary.
export const isDocumentReport = (item: Pick<ReportListItem, 'report_type'>): boolean =>
  item.report_type !== undefined && item.report_type !== 'blood_report';

export interface ReportListPage {
  page: number;
  limit: number;
  has_more: boolean;
  items: ReportListItem[];
}

// GET /v1/health/reports: 10 reports per page. Only id and created_at are returned.
export async function fetchReportListPage(page: number): Promise<ReportListPage> {
  const { data } = await api.get<ReportListPage>('/v1/health/reports', { params: { page, limit: 10 } });
  return data;
}

// The signed-in subject's reports, loaded page by page.
export function useReportList() {
  return useInfiniteQuery({
    queryKey: queryKeys.report.list(),
    queryFn: ({ pageParam }) => fetchReportListPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.page + 1 : undefined),
  });
}
