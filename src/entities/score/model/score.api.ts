import { api } from '@shared/api';

import type { HealthScoreEntry } from './score.types';

// The user's saved scores, oldest first (the server returns at most the 50 it keeps for the graph).
export async function fetchScoreHistory(): Promise<HealthScoreEntry[]> {
  const { data } = await api.get<HealthScoreEntry[]>('/v1/score/history');
  // The total can arrive as text when it comes from a decimal column, so it is made a number here.
  return (data ?? []).map((entry) => ({ ...entry, total: Number(entry.total) }));
}
