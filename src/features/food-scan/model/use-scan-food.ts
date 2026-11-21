import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { isApiError, queryKeys } from '@shared/api';
import { startFoodScan, type FoodScanKind, type ScanPhoto } from '@entities/food-scan';
import { useJobStatus } from '@entities/job';

export type ScanPhase = 'idle' | 'working' | 'done' | 'failed';

// Sends a photo to be scanned and follows the job until the answer is ready (every operation over two seconds is a job). phase says where it is;
// scanId is the id of the finished scan; failure is a code to explain (no_food_found, llm_unavailable, rate_limited, and so on).
export function useScanFood(kind: FoodScanKind) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | undefined>();
  const start = useMutation({
    mutationFn: (photo: ScanPhoto) => startFoodScan(kind, photo),
    onSuccess: (result) => setJobId(result.job_id),
  });
  const job = useJobStatus(jobId);

  const done = job.data?.status === 'done';
  const scanId = done ? String(job.data?.result?.scan_id ?? '') || undefined : undefined;
  const failure: string | null = start.isError
    ? isApiError(start.error)
      ? start.error.code
      : 'food_scan_failed'
    : job.data?.status === 'failed'
      ? (job.data.error_code ?? 'food_scan_failed')
      : job.isError
        ? 'food_scan_failed'
        : null;
  const phase: ScanPhase = failure ? 'failed' : done ? 'done' : start.isPending || jobId ? 'working' : 'idle';

  // The list of past scans is read again when a scan is done.
  useEffect(() => {
    if (scanId) void queryClient.invalidateQueries({ queryKey: queryKeys.foodScan.list(kind) });
  }, [scanId, kind, queryClient]);

  return {
    phase,
    scanId,
    failure,
    scan: (photo: ScanPhoto) => start.mutate(photo),
    reset: () => {
      start.reset();
      setJobId(undefined);
    },
  };
}
