import { api } from '@shared/api';

export interface MedicineEntry {
  name: string;
  dose: string | null;
}

export type MedicalHistoryFileKind = 'report' | 'medicine';

export interface MedicalHistoryFile {
  id: string;
  kind: MedicalHistoryFileKind;
  name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface MedicalHistoryEntry {
  id: string;
  title: string;
  occurred_on: string; // YYYY-MM-DD
  occurred_time: string | null; // HH:MM, optional
  medicines: MedicineEntry[];
  files: MedicalHistoryFile[];
  created_at: string; // ISO time the entry was added
  updated_at: string; // ISO time the entry was last changed
}

// "Added 12 Nov 2026, 3:40 pm" or "Updated 13 Nov 2026, 9:05 am", from the saved times.
export function entryStamp(entry: MedicalHistoryEntry): string {
  const created = new Date(entry.created_at);
  const updated = new Date(entry.updated_at);
  const changed = updated.getTime() - created.getTime() > 60_000;
  const when = changed ? updated : created;
  const text = when.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  return `${changed ? 'Updated' : 'Added'} ${text}`;
}

export interface CreateMedicalHistoryInput {
  title: string;
  occurred_on: string;
  occurred_time?: string | null;
  medicines: { name: string; dose?: string | null }[];
}

export interface PickedMedicalFile {
  uri: string;
  name: string;
  type: string;
}

// Attaches one report or prescription file to an entry. Sent as multipart form data.
export async function uploadMedicalHistoryFile(id: string, file: PickedMedicalFile, kind: MedicalHistoryFileKind): Promise<MedicalHistoryFile> {
  const form = new FormData();
  form.append('kind', kind);
  form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  const { data } = await api.post<MedicalHistoryFile>(`/v1/medical-histories/${id}/files`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteMedicalHistoryFile(id: string, fileId: string): Promise<void> {
  await api.delete(`/v1/medical-histories/${id}/files/${fileId}`);
}

export async function fetchMedicalHistories(): Promise<MedicalHistoryEntry[]> {
  const { data } = await api.get<MedicalHistoryEntry[]>('/v1/medical-histories');
  return data;
}

export async function createMedicalHistory(input: CreateMedicalHistoryInput): Promise<MedicalHistoryEntry> {
  const { data } = await api.post<MedicalHistoryEntry>('/v1/medical-histories', input);
  return data;
}

export async function updateMedicalHistory(id: string, input: CreateMedicalHistoryInput): Promise<MedicalHistoryEntry> {
  const { data } = await api.patch<MedicalHistoryEntry>(`/v1/medical-histories/${id}`, input);
  return data;
}

export async function deleteMedicalHistory(id: string): Promise<void> {
  await api.delete(`/v1/medical-histories/${id}`);
}
