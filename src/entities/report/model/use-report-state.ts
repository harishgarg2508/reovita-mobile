import { useQuery } from '@tanstack/react-query';

import { api } from '@shared/api';

export interface ReportState {
  status: string;
  // Why the last analysis attempt went back to review, for example llm_consent_required or interpretation_failed.
  interpretation_error: string | null;
}

// The report's status and the reason its last analysis did not finish. Read again whenever the live status changes.
export function useReportState(reportId: string | null, liveStatus: string | null) {
  return useQuery({
    queryKey: ['report', reportId, 'state', liveStatus] as const,
    queryFn: async (): Promise<ReportState> => {
      const { data } = await api.get<ReportState>(`/v1/health/reports/${reportId}/state`);
      return data;
    },
    enabled: !!reportId,
    staleTime: 0,
  });
}

// What the user is told, in plain words. The codes come from the server's audit and worker.
export function interpretationErrorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === 'llm_consent_required') return 'Your explanation needs AI analysis consent. Grant it, then confirm the values again.';
  if (code === 'interpretation_failed') return 'We could not finish the explanation this time. Confirm the values again to retry.';
  return 'The explanation did not finish. Confirm the values again to retry.';
}
