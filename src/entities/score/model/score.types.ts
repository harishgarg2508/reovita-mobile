// The server compares each score with the one before it and stores one of these words.
export type ScoreTrend = 'Improving' | 'Declining' | 'Stable';

// The three parts the total is averaged from. A part is null until its information has been added.
export interface ScoreParts {
  lifestyle: number | null;
  conditions: number | null;
  reports: number | null;
}

// One saved health score (GET /v1/score and each item of GET /v1/score/history).
export interface HealthScoreEntry {
  total: number;
  categories: Record<string, number>;
  parts: ScoreParts | null;
  trend: ScoreTrend;
  formula_version: string;
  created_at: string;
}
