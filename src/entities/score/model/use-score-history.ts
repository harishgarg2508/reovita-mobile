import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchScoreHistory } from './score.api';

// The saved health scores over time, oldest first, for the trend graph.
export function useScoreHistory() {
  return useQuery({
    queryKey: queryKeys.score.history(),
    queryFn: fetchScoreHistory,
  });
}
