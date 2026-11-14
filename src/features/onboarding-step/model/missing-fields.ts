import type { BasicsDraft, HistoryDraft, LifestyleDraft } from '@entities/onboarding';

import { OTHER_LABEL, splitOtherConditions } from './other-conditions';

// The required fields of a step that are still empty, in the order they appear on screen.
// Step 1: sex, height and weight. Step 2: at least one condition (or "None"). Step 3: every lifestyle choice.
// Step 4 has no form fields here.
export function missingFields(
  step: number,
  basics: BasicsDraft,
  history: HistoryDraft,
  lifestyle: LifestyleDraft,
): string[] {
  if (step === 1) {
    const missing: string[] = [];
    if (basics.year === null) missing.push('year');
    if (basics.sex === null) missing.push('sex');
    const height = Number(basics.height);
    if (!(height >= 50 && height <= 260)) missing.push('height');
    const weight = Number(basics.weight);
    if (!(weight >= 20 && weight <= 400)) missing.push('weight');
    return missing;
  }
  if (step === 2) {
    const conditions = history.conditions ?? [];
    // Other alone is not an answer until at least one condition is typed for it.
    const otherEmpty = conditions.includes(OTHER_LABEL) && splitOtherConditions(history.otherText ?? '').length === 0;
    const answered = conditions.filter((label) => label !== OTHER_LABEL).length > 0 || (conditions.includes(OTHER_LABEL) && !otherEmpty);
    return answered ? [] : ['conditions'];
  }
  if (step === 3) {
    return (['sleep', 'stress', 'diet', 'smoking', 'alcohol', 'exercise', 'occupation', 'activity_level'] as const).filter(
      (field) => lifestyle[field] === null,
    );
  }
  return [];
}
