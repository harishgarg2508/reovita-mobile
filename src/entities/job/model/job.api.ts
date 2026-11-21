import { api } from '@shared/api';

import type { JobView } from './job.types';

export async function fetchJob(id: string): Promise<JobView> {
  const { data } = await api.get<JobView>(`/v1/jobs/${id}`);
  return data;
}
