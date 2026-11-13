import { api } from '@shared/api';

import type { CreateMeasurementInput, Measurement, MeasurementType } from './measurement.types';

// GET /v1/measurements, newest first. Optionally filtered by type.
export async function fetchMeasurements(type?: MeasurementType): Promise<Measurement[]> {
  const { data } = await api.get<Measurement[]>('/v1/measurements', { params: type ? { type } : undefined });
  return data;
}

// POST /v1/measurements. The server checks the range, step 1 and the health_data consent.
export async function createMeasurement(input: CreateMeasurementInput): Promise<Measurement> {
  const { data } = await api.post<Measurement>('/v1/measurements', input);
  return data;
}
