import { api, openApiFile } from '@shared/api';

export type AccessStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface AccessSummary {
  codename: string;
  age: number | null;
  sex: string | null;
  bmi: number | null;
  conditions: string[];
  lifestyle: { smoking: string | null; exercise: string | null; stress: number | null; sleep: number | null } | null;
  score: { total: number; parts: { lifestyle: number | null; conditions: number | null; reports: number | null } | null } | null;
  reports_count: number;
  vitals: {
    bp: { sys: number; dia: number; at: string } | null;
    weight: { kg: number; at: string } | null;
    readings: { type: string; value: number; at: string }[];
  };
  timeline: { date: string; status: string; flagged: number }[];
  family_history: { relation: string; condition: string }[];
  medications: { name: string | null; dose: string | null }[];
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
