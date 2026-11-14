import { useInfiniteQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchScoreHistoryPage } from './score.api';

// The saved health scores, loaded a page at a time. Pages come newest first.
export function useScoreHistory() {
  return useInfiniteQuery({
    queryKey: queryKeys.score.history(),
    queryFn: ({ pageParam }) => fetchScoreHistoryPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.page + 1 : undefined),
  });
}
