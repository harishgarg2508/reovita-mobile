import { api, isApiError } from '@shared/api';

import type { DietaryChartView, DietaryGoal, DietaryOverview, DietType } from './dietary-chart.types';

export async function fetchDietaryOverview(): Promise<DietaryOverview> {
  const { data } = await api.get<DietaryOverview>('/v1/dietary-chart/overview');
  return data;
}

// The latest chart, or null when none has been made yet.
export async function fetchDietaryChart(): Promise<DietaryChartView | null> {
  try {
    const { data } = await api.get<DietaryChartView>('/v1/dietary-chart');
    return data;
  } catch (error) {
    if (isApiError(error, 'chart_not_found')) return null;
    throw error;
  }
}

export async function startDietaryChart(goal: DietaryGoal, dietType: DietType): Promise<{ job_id: string }> {
  const { data } = await api.post<{ job_id: string }>('/v1/dietary-chart', { goal, diet_type: dietType });
  return data;
}
