// Turns the values saved for an onboarding step into the labels shown on the profile page.
// The labels match the ones the onboarding forms show, so the profile reads the same as the form did.

const SEX: Record<string, string> = {
  female: 'Female',
  male: 'Male',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

const CONDITION: Record<string, string> = {
  diabetes: 'Diabetes',
  hypertension: 'Hypertension',
  thyroid: 'Thyroid',
  cvd: 'Heart disease',
  ckd: 'Kidney disease',
  none: 'None',
};

const RELATION: Record<string, string> = {
  father: 'Father',
  mother: 'Mother',
  sibling: 'Sibling',
  wife: 'Wife',
};

const DIET: Record<string, string> = {
  mixed: 'Mixed',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  keto: 'Keto',
  mediterranean: 'Mediterranean',
  other: 'Other',
};

const SMOKING: Record<string, string> = { never: 'Never', former: 'Former', current: 'Current' };
const ALCOHOL: Record<string, string> = { never: 'Never', occasional: 'Occasional', regular: 'Regular' };

const EXERCISE: Record<string, string> = {
  none: 'None',
  '1_2_week': '1-2 a week',
  '3_4_week': '3-4 a week',
  '5_plus_week': '5+ a week',
};

const OCCUPATION: Record<string, string> = {
  desk: 'Desk / office',
  mostly_standing: 'Mostly standing or walking',
  manual_field: 'Manual or field work',
  heavy_labour: 'Heavy labour',
  healthcare: 'Healthcare',
  student_homemaker: 'Student / homemaker',
  retired: 'Retired / not working',
  other: 'Other',
};

const ACTIVITY: Record<string, string> = {
  sedentary: 'Mostly sitting',
  light: 'Light movement',
  moderate: 'Moderately active',
  heavy: 'Very physical',
};

export const RELATION_ORDER = ['father', 'mother', 'sibling', 'wife'] as const;

export function labelOf(map: Record<string, string>, value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  return map[value] ?? value;
}

export function sexLabel(value: unknown) {
  return labelOf(SEX, value);
}

export function dietLabel(value: unknown) {
  return labelOf(DIET, value);
}

export function smokingLabel(value: unknown) {
  return labelOf(SMOKING, value);
}

export function alcoholLabel(value: unknown) {
  return labelOf(ALCOHOL, value);
}

export function exerciseLabel(value: unknown) {
  return labelOf(EXERCISE, value);
}

export function occupationLabel(value: unknown) {
  return labelOf(OCCUPATION, value);
}

export function activityLabel(value: unknown) {
  return labelOf(ACTIVITY, value);
}

export function conditionLabel(tag: string, freeText: string | null | undefined): string {
  if (tag === 'other') return freeText?.trim() || 'Other';
  return CONDITION[tag] ?? tag;
}

export function relationLabel(relation: string): string {
  return RELATION[relation] ?? relation;
}

export function bmi(heightCm: unknown, weightKg: unknown): string | null {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!(h > 0) || !(w > 0)) return null;
  const meters = h / 100;
  return (w / (meters * meters)).toFixed(1);
}

export function ageFrom(birthYear: unknown): number | null {
  const year = Number(birthYear);
  if (!Number.isFinite(year) || year <= 0) return null;
  return new Date().getFullYear() - year;
}
