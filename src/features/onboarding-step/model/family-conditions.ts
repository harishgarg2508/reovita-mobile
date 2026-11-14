// The family history conditions the server accepts (FamilyCondition in reovita-service), with the label
// shown in the picker. Anything else is not tracked for family history, so it is not offered.
export const FAMILY_CONDITION_LABELS: Record<string, string> = {
  diabetes: 'Diabetes',
  cvd: 'Heart Disease',
  cancer: 'Cancer',
  thyroid: 'Thyroid',
  kidney: 'Kidney Disease',
};

export const FAMILY_CONDITION_OPTIONS = [...Object.values(FAMILY_CONDITION_LABELS), 'None'];

// Picker label -> server tag, and the reverse for showing saved values.
export const FAMILY_TAG_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(FAMILY_CONDITION_LABELS).map(([tag, label]) => [label, tag]),
);
