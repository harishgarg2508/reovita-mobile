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

const KEY = ['access', 'incoming'] as const;

// Requests from people who scanned this subject's QR code and are waiting for an answer.
// The list is loaded once with a GET. After that the stream adds each new request to it, and a decision removes it,
// so the app does not fetch the list again.
export function useIncomingAccess() {
  const queryClient = useQueryClient();

  const incoming = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<IncomingRequest[]> => {
      const { data } = await api.get<IncomingRequest[]>('/v1/access-requests/incoming');
      return data;
    },
    // Loaded once: no refetch on focus, remount or a timer.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Accepts the current event shape ({ id, created_at, expires_at }) and the older one ({ request_id }). An event with no
  // id cannot be answered, so the list is loaded again instead of adding an entry without an id.
  const addIncoming = useCallback(
    (event: Partial<IncomingRequest> & { request_id?: string }) => {
      const id = event.id ?? event.request_id;
      if (!id) {
        void queryClient.invalidateQueries({ queryKey: KEY });
        return;
      }
      const request: IncomingRequest = {
        id,
        created_at: event.created_at ?? new Date().toISOString(),
        expires_at: event.expires_at ?? new Date(Date.now() + 60_000).toISOString(),
      };
      queryClient.setQueryData<IncomingRequest[]>(KEY, (old) => [request, ...(old ?? []).filter((r) => r.id !== id)]);
    },
    [queryClient],
  );

  const removeIncoming = useCallback(
    (id: string) => {
      queryClient.setQueryData<IncomingRequest[]>(KEY, (old) => (old ?? []).filter((r) => r.id !== id));
    },
    [queryClient],
  );

  useEventStream<Partial<IncomingRequest> & { request_id?: string }>(`${API_URL}/v1/access-requests/stream`, 'request', addIncoming);

  const decide = useMutation({
    mutationFn: async ({ id, allow }: { id: string; allow: boolean }) => {
      await api.post(`/v1/access-requests/${id}/decision`, { allow });
      return id;
    },
    onSuccess: (id) => removeIncoming(id),
  });

  return { incoming, decide };
}
