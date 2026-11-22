import { Platform } from 'react-native';

import { api } from '@shared/api';

export interface MedicineScanPhoto {
  uri: string;
  name: string;
  type: string;
}

// One medicine read from a pack: what was printed, and the drug list name it was matched to (null when there was no match).
export interface ScannedMedicine {
  brand: string;
  generic: string;
  strength: string;
  match: { alias: string; ingredient_ids: string[] } | null;
}

export interface MedicineScanResult {
  medicines: ScannedMedicine[];
}

// Sends the photo of a medicine strip, box or bottle. Answers with the job to follow. The server never stores the photo.
export async function startMedicineScan(photo: MedicineScanPhoto): Promise<{ job_id: string }> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // Browsers need a real Blob in FormData; the native { uri, name, type } object is ignored.
    form.append('photo', await (await fetch(photo.uri)).blob(), photo.name);
  } else {
    form.append('photo', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
  }
  const { data } = await api.post<{ job_id: string }>('/v1/interactions/scan', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}

// The answer of a finished scan. The server gives it once, so it is read once and kept in memory by the screen that asked.
export async function fetchMedicineScan(id: string): Promise<MedicineScanResult> {
  const { data } = await api.get<MedicineScanResult>(`/v1/interactions/scan/${id}`);
  return data;
}
