import type { ConsentType } from '@entities/consent';

// The five consent types from reovita-service (consent-type.ts). Keep in step with the backend.
export interface ConsentChoice {
  type: ConsentType;
  label: string;
  purpose: string;
  effectIfMissing: string;
  required: boolean;
}

export const CONSENT_CHOICES: ConsentChoice[] = [
  {
    type: 'health_data',
    label: 'health_data',
    purpose: 'All profile and report writes',
    effectIfMissing: '403 Forbidden: you cannot use the app.',
    required: true,
  },
  {
    type: 'llm_processing',
    label: 'llm_processing',
    purpose: 'Sending data to AI for interpretations',
    effectIfMissing: '409 Conflict: AI interpretations are disabled.',
    required: false,
  },
  {
    type: 'location',
    label: 'location',
    purpose: 'Daily environmental briefing',
    effectIfMissing: 'Briefing falls back to manual city selection.',
    required: false,
  },
  {
    type: 'notifications',
    label: 'notifications',
    purpose: 'Web Push notifications',
    effectIfMissing: 'No push alerts are sent to the device.',
    required: false,
  },
  {
    type: 'food_image',
    label: 'food_image',
    purpose: 'Sending meal photos to the vision API (coming soon)',
    effectIfMissing: 'Meal scanning is disabled.',
    required: false,
  },
];
