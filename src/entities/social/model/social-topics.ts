// The topics a post can carry. The same list as the server (SOCIAL_TOPICS in social.constants.ts). Lifestyle topics only, never a health condition.
export const SOCIAL_TOPICS = [
  { value: 'sleep', label: 'Sleep' },
  { value: 'daily_steps', label: 'Daily steps' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'hydration', label: 'Hydration' },
  { value: 'mindfulness', label: 'Mindfulness' },
  { value: 'strength', label: 'Strength' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'recovery', label: 'Rest and recovery' },
] as const;

export function topicLabel(value: string | null | undefined): string | null {
  return SOCIAL_TOPICS.find((t) => t.value === value)?.label ?? null;
}
