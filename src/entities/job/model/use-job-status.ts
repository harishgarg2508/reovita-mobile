import { useCallback, useEffect, useState } from 'react';

import { API_URL } from '@shared/config/environment';
import { useEventStream } from '@shared/lib';

import { fetchJob } from './job.api';
import type { JobView } from './job.types';

// What the job stream sends: the id, the status, and the result or the error code (ids and counts only, never health values).
interface JobEvent {
  id: string;
  status: JobView['status'];
  result: JobView['result'];
  error_code: string | null;
}

// If the stream says nothing for this long (a proxy that holds events back, say), the job is read once so the screen is not left waiting.
const SILENCE_MS = 15_000;

// Follows a job on the server's event stream (GET /v1/jobs/:id/events): the status arrives when the job starts and each time it changes, so there
// is no asking again and again. The stream is open only until the job is done or failed. Every operation that takes longer than two seconds is a job.
export function useJobStatus(jobId: string | undefined): { data: JobView | undefined; isError: boolean } {
  const [latest, setLatest] = useState<{ id: string; view: JobView } | null>(null);

  const onEvent = useCallback((event: JobEvent) => {
    setLatest({ id: event.id, view: { id: event.id, type: '', status: event.status, result: event.result ?? null, error_code: event.error_code ?? null } });
  }, []);

  // Only the answer for the job being followed counts.
  const view = latest && latest.id === jobId ? latest.view : undefined;
  const finished = view?.status === 'done' || view?.status === 'failed';
  useEventStream<JobEvent>(jobId && !finished ? `${API_URL}/v1/jobs/${jobId}/events` : null, 'job', onEvent);

  // The one read after silence.
  useEffect(() => {
    if (!jobId || view) return;
    const timer = setTimeout(() => {
      fetchJob(jobId)
        .then((job) => setLatest((current) => (current?.id === jobId ? current : { id: jobId, view: job })))
        .catch(() => undefined);
    }, SILENCE_MS);
    return () => clearTimeout(timer);
  }, [jobId, view]);

  return { data: view, isError: false };
}
