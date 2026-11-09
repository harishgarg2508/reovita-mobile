import { useInfiniteQuery } from '@tanstack/react-query';

import { api, queryKeys } from '@shared/api';

export interface ReportListItem {
  id: string;
  created_at: string;
}

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
