import { Platform } from 'react-native';

import { api } from '@shared/api';

import type { FoodScanKind, FoodScanView } from './food-scan.types';

export interface ScanPhoto {
  uri: string;
  name: string;
  type: string;
}

// Sends the photo to be scanned. Answers with the job to follow (the scan takes longer than two seconds). The server never stores the photo.
export async function startFoodScan(kind: FoodScanKind, photo: ScanPhoto): Promise<{ job_id: string }> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // Browsers need a real Blob in FormData; the native { uri, name, type } object is ignored.
    form.append('photo', await (await fetch(photo.uri)).blob(), photo.name);
  } else {
    form.append('photo', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
  }
  const { data } = await api.post<{ job_id: string }>(`/v1/food-scans/${kind}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}

export async function fetchFoodScans(kind: FoodScanKind, limit = 20): Promise<FoodScanView[]> {
  const { data } = await api.get<FoodScanView[]>('/v1/food-scans', { params: { kind, limit } });
  return data;
}

export async function fetchFoodScan(id: string): Promise<FoodScanView> {
  const { data } = await api.get<FoodScanView>(`/v1/food-scans/${id}`);
  return data;
}

export async function deleteFoodScan(id: string): Promise<void> {
  await api.delete(`/v1/food-scans/${id}`);
}
