import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@shared/api';

import { deleteDietaryChart, fetchDietaryChart, fetchDietaryChartById, fetchDietaryHistory, fetchDietaryOverview } from './dietary-chart.api';

// BMI, its band and the choices for a chart. Worked out from the saved height and weight, with no model call.
export function useDietaryOverview() {
  return useQuery({ queryKey: queryKeys.dietary.overview(), queryFn: fetchDietaryOverview, retry: false, staleTime: 0 });
}

// The latest chart (null when none yet).
export function useDietaryChart() {
  return useQuery({ queryKey: queryKeys.dietary.chart(), queryFn: fetchDietaryChart, staleTime: 0 });
}

// My past charts, newest first, as short lines.
export function useDietaryHistory() {
  return useQuery({ queryKey: queryKeys.dietary.history(), queryFn: fetchDietaryHistory, staleTime: 0 });
}

// One chart, whole. A chart never changes once it is made, so it is kept.
export function useDietaryChartById(id: string) {
  return useQuery({ queryKey: queryKeys.dietary.detail(id), queryFn: () => fetchDietaryChartById(id), enabled: id.length > 0, staleTime: Infinity, retry: false });
}

export function useDeleteDietaryChart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDietaryChart,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dietary.root }),
  });
}
