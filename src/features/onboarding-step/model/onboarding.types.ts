// Request bodies for POST /v1/onboarding/steps/{n}. Mirrors the backend DTOs.
export interface BasicsInput {
  birth_year: number;
  sex: 'female' | 'male' | 'other' | 'prefer_not_to_say';
  height_cm: number;
  weight_kg: number;
}

export interface HistoryInput {
  conditions?: { items: { tag: string; free_text?: string }[] };
  medications?: { name: string; dose?: string }[];
  family_history?: { items: { relation: string; condition: string }[] };
}

export interface LifestyleInput {
  sleep: number;
  stress: number;
  diet: 'mixed' | 'vegetarian' | 'vegan' | 'keto' | 'mediterranean' | 'other';
  smoking: 'never' | 'former' | 'current';
  alcohol: 'never' | 'occasional' | 'regular';
  exercise: 'none' | '1_2_week' | '3_4_week' | '5_plus_week';
  occupation: Occupation;
  activity_level: ActivityLevel;
}

// Work type and how active it is. Used to estimate daily physical activity.
export type Occupation =
  | 'desk'
  | 'mostly_standing'
  | 'manual_field'
  | 'heavy_labour'
  | 'healthcare'
  | 'student_homemaker'
  | 'retired'
  | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'heavy';
