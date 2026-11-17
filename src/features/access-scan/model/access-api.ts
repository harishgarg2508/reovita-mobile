import { api, openApiFile } from '@shared/api';

export type AccessStatus = 'pending' | 'approved' | 'denied' | 'expired';

// The lists of the summary that are sent 10 at a time.
export type AccessListName = 'reports' | 'medical_history' | 'score_history' | 'medications' | 'family_history' | 'timeline' | 'readings';

// A report in the list: its date and counts only. Its results are fetched when it is opened (fetchAccessReport).
export interface AccessReportItem {
  id: string;
  date: string;
  results: number;
  flagged: number;
}

export interface AccessReportDetail {
  id: string;
  date: string;
  observations: { biomarker_code: string; name: string; value: number; unit: string; ref_low: number | null; ref_high: number | null; status: string }[];
}
export interface AccessSummary {
  codename: string;
  age: number | null;
  sex: string | null;
  bmi: number | null;
  conditions: string[];
  conditions_other?: string | null;
  lifestyle: { smoking: string | null; exercise: string | null; stress: number | null; sleep: number | null } | null;
  score: { total: number; parts: { lifestyle: number | null; conditions: number | null; reports: number | null } | null } | null;
  // The last scores, newest first. Shown as words, never as numbers.
  score_history?: { total: number; trend: string; created_at: string }[];
  // The latest finished reports with their results and the explanation made for them.
  reports?: AccessReportItem[];
  // True for a list that has more than the first page.
  more?: Record<AccessListName, boolean>;
  reports_count: number;
  vitals: {
    bp: { sys: number; dia: number; at: string } | null;
    weight: { kg: number; at: string } | null;
    readings: { type: string; value: number; at: string }[];
  };
  timeline: { date: string; status: string; flagged: number }[];
  family_history: { relation: string; condition: string }[];
  medications: { name: string | null; dose: string | null; schedule_times?: string[] }[];
  medical_history: {
    id: string;
    title: string;
    occurred_on: string;
    occurred_time: string | null;
    medicines: { name: string; dose: string | null }[];
    files: AccessFile[];
  }[];
}

export interface AccessFile {
  id: string;
  kind: 'report' | 'medicine';
  name: string;
  mime_type: string;
  size_bytes: number;
}

// Opens one medical history file of the approved subject.
export async function openAccessFile(requestId: string, file: AccessFile): Promise<void> {
  await openApiFile(`/v1/access-requests/${requestId}/files/${file.id}`, file);
}

// Asks the subject for access by the codename read from their QR code.
export async function requestAccess(codename: string): Promise<{ id: string; expires_at: string }> {
  const { data } = await api.post<{ id: string; expires_at: string }>('/v1/access-requests', { codename });
  return data;
}

export async function fetchAccessStatus(id: string): Promise<{ status: AccessStatus; access_until: string | null }> {
  const { data } = await api.get<{ status: AccessStatus; access_until: string | null }>(`/v1/access-requests/${id}`);
  return data;
}

export async function fetchAccessSummary(id: string): Promise<AccessSummary> {
  const { data } = await api.get<AccessSummary>(`/v1/access-requests/${id}/summary`);
  return data;
}

// One more page of one list of the summary (10 entries a page).
export async function fetchAccessList(id: string, name: AccessListName, page: number): Promise<{ items: unknown[]; has_more: boolean; page: number }> {
  const { data } = await api.get<{ items: unknown[]; has_more: boolean; page: number }>(`/v1/access-requests/${id}/lists/${name}`, { params: { page } });
  return data;
}

// The results of one report, asked for when the viewer opens it. The explanation is not fetched.
export async function fetchAccessReport(requestId: string, reportId: string): Promise<AccessReportDetail> {
  const { data } = await api.get<AccessReportDetail>(`/v1/access-requests/${requestId}/reports/${reportId}`);
  return data;
}
