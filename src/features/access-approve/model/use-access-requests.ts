import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { api, isApiError } from '@shared/api';
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
    // The stream is the fast path; a held-back stream would leave the request unseen until it runs out, so the list is also checked
    // every 4 seconds while the app is open. It is a small request.
    refetchInterval: 4000,
    // A request that has already run out of time cannot be answered, so it is never offered.
    select: (list) => list.filter((request) => new Date(request.expires_at).getTime() > Date.now()),
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

  // The popup closes by itself when the request it shows runs out of time, instead of staying up for an answer that would be refused.
  const soonest = incoming.data?.length ? Math.min(...incoming.data.map((request) => new Date(request.expires_at).getTime())) : null;
  useEffect(() => {
    if (soonest === null) return;
    const timer = setTimeout(() => {
      queryClient.setQueryData<IncomingRequest[]>(KEY, (old) => (old ?? []).filter((request) => new Date(request.expires_at).getTime() > Date.now()));
    }, Math.max(soonest - Date.now(), 0) + 50);
    return () => clearTimeout(timer);
  }, [soonest, queryClient]);

  const removeIncoming = useCallback(
    (id: string) => {
      queryClient.setQueryData<IncomingRequest[]>(KEY, (old) => (old ?? []).filter((r) => r.id !== id));
    },
    [queryClient],
  );

  useEventStream<Partial<IncomingRequest> & { request_id?: string }>(`${API_URL}/v1/access-requests/stream`, 'request', addIncoming);
  // The server says "ready" each time the stream connects, including after a drop. A request made while the stream was down was never
  // pushed, so the pending list is loaded again then, and nothing is missed.
  useEventStream(`${API_URL}/v1/access-requests/stream`, 'ready', () => {
    void queryClient.invalidateQueries({ queryKey: KEY });
  });

  const decide = useMutation({
    mutationFn: async ({ id, allow }: { id: string; allow: boolean }) => {
      await api.post(`/v1/access-requests/${id}/decision`, { allow });
      return id;
    },
    onSuccess: (id) => removeIncoming(id),
    // The server refused the answer because the request is no longer waiting (it ran out of time, was answered, or is gone). There is
    // nothing left to answer, so the popup is simply closed. A network failure or a server error keeps it open, to try again.
    onError: (error, { id }) => {
      if (isApiError(error) && [400, 403, 404, 409].includes(error.status)) {
        removeIncoming(id);
        void queryClient.invalidateQueries({ queryKey: KEY });
      }
    },
  });

  return { incoming, decide };
}
