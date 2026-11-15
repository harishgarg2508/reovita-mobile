import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { API_URL } from '@shared/config/environment';
import { useEventStream } from '@shared/lib';

import { interactionJobSettled, type InteractionAlertState } from './interaction-alert.slice';

// What the job stream sends: counts only, never a medicine name.
interface JobEvent {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  result?: { findings?: number; has_major_or_contra?: boolean } | null;
}

// Follows the interaction check that a step 2 save queued (GET /v1/jobs/{id}/events). Mounted once at the app root, so the
// check is still followed after the user has left step 2. When it ends, the pending job is cleared; a finished check also
// sets the in-memory alert flag, and the interaction results are read again.
export function useInteractionJobFollower(): void {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const jobId = useSelector((state: { interactionAlert: InteractionAlertState }) => state.interactionAlert.pendingJobId);

  const onEvent = useCallback(
    (event: JobEvent) => {
      if (event.id !== jobId) return;
      if (event.status === 'done') {
        dispatch(interactionJobSettled({ hasMajorOrContra: event.result?.has_major_or_contra === true }));
        void queryClient.invalidateQueries({ queryKey: ['interactions'] });
      } else if (event.status === 'failed') {
        dispatch(interactionJobSettled(undefined));
      }
    },
    [dispatch, jobId, queryClient],
  );

  // A null url keeps the stream closed, so it is open only while a check is pending.
  useEventStream<JobEvent>(jobId ? `${API_URL}/v1/jobs/${jobId}/events` : null, 'job', onEvent);
}
