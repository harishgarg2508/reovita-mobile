import { newId } from '@shared/lib';
import type { BasicsDraft, HistoryDraft, LifestyleDraft, OnboardingSex } from '@entities/onboarding';
import { FAMILY_CONDITION_LABELS } from './family-conditions';
import { joinOtherConditions, OTHER_LABEL, splitOtherConditions } from './other-conditions';

// Turns the values the server saved for a step (GET /v1/onboarding/steps/{step}) into the shape the step
// forms keep in their drafts. Null or missing values are left out, so the form shows them as not filled yet.

// Server condition tags back to the labels the conditions form shows.
const TAG_LABEL: Record<string, string> = {
  diabetes: 'Diabetes',
  hypertension: 'Hypertension',
  thyroid: 'Thyroid',
  cvd: 'Heart Disease',
  ckd: 'Kidney Disease',
};

type Saved = Record<string, unknown>;

interface SavedMedication {
  id?: string;
  name: string | null;
  dose: string | null;
  schedule_times?: string[];
  ingredient_ids?: string[];
}

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const str = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);

export function basicsFromSaved(saved: Saved): Partial<BasicsDraft> {
  const patch: Partial<BasicsDraft> = {};
  const year = num(saved.birth_year);
  if (year !== null) patch.year = year;
  const sex = str(saved.sex);
  if (sex) patch.sex = sex as OnboardingSex;
  const height = num(saved.height_cm);
  if (height !== null) patch.height = String(height);
  const weight = num(saved.weight_kg);
  if (weight !== null) patch.weight = String(weight);
  return patch;
}

export function historyFromSaved(saved: Saved): Partial<HistoryDraft> {
  const conditions = (saved.conditions as { tag: string; free_text: string | null }[] | undefined) ?? [];
  const family = (saved.family_history as { relation: string; condition: string }[] | undefined) ?? [];
  const medications = (saved.medications as SavedMedication[] | undefined) ?? [];

  // Every tag becomes its chip label. The free text of 'other' holds the typed conditions; when there are any,
  // the Other chip is selected too, so its field and chips are shown.
  const conditionLabels = conditions
    .filter((c) => c.tag !== 'other')
    .map((c) => TAG_LABEL[c.tag] ?? null)
    .filter((label): label is string => label !== null);
  const other = joinOtherConditions(splitOtherConditions(conditions.find((c) => c.tag === 'other')?.free_text ?? ''));
  if (other) conditionLabels.push(OTHER_LABEL);
  // The block was saved with no conditions: the user answered "None".
  if (conditionLabels.length === 0 && saved.conditions_answered === true) conditionLabels.push('None');

  // The server stores family conditions as tags (diabetes); the picker shows their labels (Diabetes).
  const byRelation = (relation: string) =>
    family
      .filter((f) => f.relation === relation)
      .map((f) => FAMILY_CONDITION_LABELS[f.condition])
      .filter((label): label is string => Boolean(label));

  return {
    conditions: conditionLabels,
    otherText: other,
    // Rows come back with the id and ingredients the server holds, so a save updates them instead of adding copies.
    // A row from an older response without an id gets a new one, and is saved as a new medicine.
    medications: medications
      .filter((m): m is SavedMedication & { name: string } => !!m.name)
      .map((m) => ({
        id: m.id ?? newId(),
        name: m.name,
        dose: m.dose ?? '',
        schedule_times: m.schedule_times ?? [],
        ingredient_ids: m.ingredient_ids ?? [],
      })),
    father: byRelation('father'),
    mother: byRelation('mother'),
    sibling: byRelation('sibling'),
    wife: byRelation('wife'),
  };
}

export function lifestyleFromSaved(saved: Saved): Partial<LifestyleDraft> {
  const patch: Partial<LifestyleDraft> = {};
  const sleep = num(saved.sleep);
  if (sleep !== null) patch.sleep = sleep;
  const stress = num(saved.stress);
  if (stress !== null) patch.stress = stress;
  for (const key of ['diet', 'smoking', 'alcohol', 'exercise', 'occupation', 'activity_level'] as const) {
    const value = str(saved[key]);
    if (value) patch[key] = value;
  }
  return patch;
}
