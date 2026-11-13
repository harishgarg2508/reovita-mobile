import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { api } from '@shared/api';
import { API_URL } from '@shared/config/environment';
import { useEventStream } from '@shared/lib';

export interface IncomingRequest {
  id: string;
  created_at: string;
  expires_at: string;
}

// Requests from people who scanned this subject's QR code and are waiting for an answer.
// The stream tells the app when a new one arrives, so the prompt appears without a reload.
export function useIncomingAccess() {
  const queryClient = useQueryClient();
  const incoming = useQuery({
    queryKey: ['access', 'incoming'] as const,
    queryFn: async (): Promise<IncomingRequest[]> => {
      const { data } = await api.get<IncomingRequest[]>('/v1/access-requests/incoming');
      return data;
    },
    staleTime: 0,
    // The live stream delivers new requests at once. This poll is the fallback if the stream drops
    // (app in the background, a weak connection), so a request still shows within a few seconds.
    refetchInterval: 4000,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['access', 'incoming'] });
  }, [queryClient]);

  useEventStream(`${API_URL}/v1/access-requests/stream`, 'request', refresh);

  const decide = useMutation({
    mutationFn: async ({ id, allow }: { id: string; allow: boolean }) => {
      await api.post(`/v1/access-requests/${id}/decision`, { allow });
    },
    onSettled: () => refresh(),
  });

  return { incoming, decide };
}
