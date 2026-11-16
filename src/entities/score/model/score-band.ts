// The bands a health score falls in, as words. The app shows these instead of the number: the score is shown as Normal, Watch
// or Critical, drawn in the same colours on the dial, the history graph and the list.
export interface ScoreZone {
  from: number;
  to: number;
  color: string;
  word: 'Critical' | 'Watch' | 'Normal';
}

export const SCORE_ZONES: ScoreZone[] = [
  { from: 0, to: 40, color: '#D6334A', word: 'Critical' },
  { from: 40, to: 70, color: '#E0A526', word: 'Watch' },
  { from: 70, to: 100, color: '#2E9E5B', word: 'Normal' },
];

export function scoreZone(score: number): ScoreZone {
  return SCORE_ZONES.find((zone) => score <= zone.to) ?? SCORE_ZONES[SCORE_ZONES.length - 1];
}

// A part of the score (lifestyle, conditions or reports) in words, or null when it has no information yet.
export function partWord(score: number | null | undefined): ScoreZone['word'] | null {
  return score === null || score === undefined ? null : scoreZone(score).word;
}
