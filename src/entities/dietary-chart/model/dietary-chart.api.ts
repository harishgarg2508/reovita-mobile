import { api, isApiError } from '@shared/api';

import type { DietaryChartListItem, DietaryChartView, DietaryGoal, DietaryOverview, DietType } from './dietary-chart.types';

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

export async function fetchDietaryHistory(): Promise<DietaryChartListItem[]> {
  const { data } = await api.get<DietaryChartListItem[]>('/v1/dietary-chart/history', { params: { limit: 50 } });
  return data;
}

export async function fetchDietaryChartById(id: string): Promise<DietaryChartView> {
  const { data } = await api.get<DietaryChartView>(`/v1/dietary-chart/${id}`);
  return data;
}

export async function deleteDietaryChart(id: string): Promise<void> {
  await api.delete(`/v1/dietary-chart/${id}`);
}

export async function startDietaryChart(goal: DietaryGoal, dietType: DietType): Promise<{ job_id: string }> {
  const { data } = await api.post<{ job_id: string }>('/v1/dietary-chart', { goal, diet_type: dietType });
  return data;
}
