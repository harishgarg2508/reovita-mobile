import { api } from '@shared/api';

import type { Interpretation, Observation } from './report.types';

export async function fetchReportObservations(reportId: string): Promise<Observation[]> {
  const { data } = await api.get<Observation[]>(`/v1/health/reports/${reportId}/observations`);
  return data;
}

export async function fetchReportInterpretation(reportId: string): Promise<Interpretation> {
  const { data } = await api.get<Interpretation>(`/v1/health/reports/${reportId}/interpretation`);
  return data;
}
