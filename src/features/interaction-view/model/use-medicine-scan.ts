import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { isApiError } from '@shared/api';
import { fetchMedicineScan, startMedicineScan, type MedicineScanPhoto, type MedicineScanResult } from '@entities/interaction-finding';
import { useJobStatus } from '@entities/job';

export type MedicineScanPhase = 'idle' | 'working' | 'done' | 'failed';

// Sends a photo of a medicine pack, follows the job, and reads the answer once. The answer is kept in this hook's state only: the server gives it one
// time and holds it in memory for ten minutes, and the app never writes it to the cache or to the device.
export function useMedicineScan() {
  const [jobId, setJobId] = useState<string | undefined>();
  const [result, setResult] = useState<MedicineScanResult | null>(null);
  const [readFailed, setReadFailed] = useState(false);
  const start = useMutation({ mutationFn: (photo: MedicineScanPhoto) => startMedicineScan(photo), onSuccess: (r) => setJobId(r.job_id) });
  const job = useJobStatus(jobId);

  const scanId = job.data?.status === 'done' ? String(job.data.result?.scan_id ?? '') || undefined : undefined;
  const readFor = useRef<string | null>(null);
  useEffect(() => {
    if (!scanId || readFor.current === scanId) return;
    readFor.current = scanId;
    fetchMedicineScan(scanId).then(setResult, () => setReadFailed(true));
  }, [scanId]);

  const failure: string | null = start.isError
    ? isApiError(start.error)
      ? start.error.code
      : 'medicine_scan_failed'
    : job.data?.status === 'failed'
      ? (job.data.error_code ?? 'medicine_scan_failed')
      : job.isError || readFailed
        ? 'medicine_scan_failed'
        : null;
  const phase: MedicineScanPhase = failure ? 'failed' : result ? 'done' : start.isPending || jobId ? 'working' : 'idle';

  return {
    phase,
    result,
    failure,
    scan: (photo: MedicineScanPhoto) => {
      setResult(null);
      setReadFailed(false);
      readFor.current = null;
      start.mutate(photo);
    },
    reset: () => {
      start.reset();
      setJobId(undefined);
      setResult(null);
      setReadFailed(false);
      readFor.current = null;
    },
  };
}
