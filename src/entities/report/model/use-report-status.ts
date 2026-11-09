import { useEffect, useState } from 'react';
import EventSource from 'react-native-sse';

import { getAccessToken } from '@shared/api';
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

// Live status of a report from the server's event stream (server-sent events). Nothing polls.
// The first event is the current status, later events are changes. The server closes the stream
// once the report needs the user or has finished.
export function useReportStatus(reportId: string): ReportProcessingStatus | null {
  const [status, setStatus] = useState<ReportProcessingStatus | null>(null);

  useEffect(() => {
    if (!reportId) return;
    const token = getAccessToken();
    const source = new EventSource<'status'>(`${API_URL}/v1/health/reports/${reportId}/events`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    });
    source.addEventListener('status', (event) => {
      if (!event.data) return;
      const parsed = JSON.parse(event.data) as ReportStatusEvent;
      setStatus(parsed.status);
    });
    return () => source.close();
  }, [reportId]);

  return status;
}
