import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { API_URL } from '@shared/config/environment';
import { useEventStream } from '@shared/lib';

import { fetchBriefingHistory, fetchTodaysBriefings } from './briefing-api';

// Today's cards and the saved table, kept current. The server pushes 'briefing' events over SSE (every 15 minutes
// and on connect); each push refreshes both queries, so the table updates without a reload.
export function useBriefingLive() {
  const queryClient = useQueryClient();
  const today = useQuery({
    queryKey: ['briefings', 'today'] as const,
    queryFn: fetchTodaysBriefings,
    staleTime: 0,
  });
  const history = useQuery({
    queryKey: ['briefings', 'history'] as const,
    queryFn: () => fetchBriefingHistory(30),
    staleTime: 0,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['briefings'] });
  }, [queryClient]);

  useEventStream(`${API_URL}/v1/briefings/stream`, 'briefing', refresh);
  useEventStream(`${API_URL}/v1/briefings/stream`, 'briefing_status', refresh);

  return { today, history, refresh };
}
