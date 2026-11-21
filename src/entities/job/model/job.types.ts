export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

// A background job the server runs. result holds ids and counts only; error_code says why a failed job failed.
export interface JobView {
  id: string;
  type: string;
  status: JobStatus;
  result: Record<string, unknown> | null;
  error_code: string | null;
}
