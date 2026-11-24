import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchMedicalHistoryPage } from './medical-history.api';

// The subject's medical history, one page at a time: `limit` entries a page, newest first. "Show more" asks for the next page.
export const MEDICAL_HISTORY_PAGE_SIZE = 10;

export function useMedicalHistoryPages(limit: number = MEDICAL_HISTORY_PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: ['medical-histories', 'pages', limit] as const,
    queryFn: ({ pageParam }) => fetchMedicalHistoryPage(pageParam, limit),
    initialPageParam: 1,
    // A full page means there may be more; a short one is the last.
    getNextPageParam: (lastPage, allPages) => (lastPage.length === limit ? allPages.length + 1 : undefined),
    staleTime: 0,
  });
}
