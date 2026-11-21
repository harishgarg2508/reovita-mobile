import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { fetchDietaryChart, fetchDietaryOverview } from './dietary-chart.api';

// BMI, its band and the choices for a chart. Worked out from the saved height and weight, with no model call.
export function useDietaryOverview() {
  return useQuery({ queryKey: queryKeys.dietary.overview(), queryFn: fetchDietaryOverview, retry: false, staleTime: 0 });
}

// The latest chart (null when none yet).
export function useDietaryChart() {
  return useQuery({ queryKey: queryKeys.dietary.chart(), queryFn: fetchDietaryChart, staleTime: 0 });
}
