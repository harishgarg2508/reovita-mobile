import { api } from '@shared/api';

import type { HealthScoreEntry } from './score.types';

export interface ScoreHistoryPage {
  page: number;
  limit: number;
  has_more: boolean;
  // Newest first, as the server returns them.
  items: HealthScoreEntry[];
}

// One page of the user's saved scores, newest first.
export async function fetchScoreHistoryPage(page: number, limit = 20): Promise<ScoreHistoryPage> {
  const { data } = await api.get<ScoreHistoryPage>('/v1/score/history', { params: { page, limit } });
  // The total can arrive as text when it comes from a decimal column, so it is made a number here.
  return { ...data, items: (data.items ?? []).map((entry) => ({ ...entry, total: Number(entry.total) })) };
}
