import { useQuery } from '@tanstack/react-query';

import { fetchMeasurements } from './measurement.api';
import type { MeasurementType } from './measurement.types';

// The subject's readings, newest first. Refetched after a new reading is saved (see the entry feature).
export function useMeasurements(type?: MeasurementType) {
  return useQuery({
    queryKey: ['measurements', type ?? 'all'] as const,
    queryFn: () => fetchMeasurements(type),
    staleTime: 0,
  });
}
