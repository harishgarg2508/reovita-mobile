import { useState } from 'react';

import { useEventStream } from '@shared/lib';
import { API_URL } from '@shared/config/environment';

export type ReportProcessingStatus =
  | 'UPLOADED'
  | 'PREPROCESSING'
  | 'AWAITING_CONFIRMATION'
  | 'NEEDS_RETAKE'
  | 'INTERPRETING'
  | 'DONE'
  | 'FAILED';

interface ReportStatusEvent {
  report_id: string;
  status: ReportProcessingStatus;
}

// Statuses in which the observations can be read.
const READY_STATUSES: ReportProcessingStatus[] = ['AWAITING_CONFIRMATION', 'INTERPRETING', 'DONE'];

export function isReportReady(status: ReportProcessingStatus | null): boolean {
  return status !== null && READY_STATUSES.includes(status);
}

// Live status of a report over the generic event stream. Only open it when the status is needed.
export function useReportStatus(reportId: string | null): ReportProcessingStatus | null {
  const [status, setStatus] = useState<ReportProcessingStatus | null>(null);
  useEventStream<ReportStatusEvent>(
    reportId ? `${API_URL}/v1/health/reports/${reportId}/events` : null,
    'status',
    (event) => setStatus(event.status),
  );
  return status;
}
