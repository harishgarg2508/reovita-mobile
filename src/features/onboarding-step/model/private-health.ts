import { useQuery } from '@tanstack/react-query';

import { api } from '@shared/api';

// The private questions in the lifestyle step (sexual health). The answers are encrypted on the server and unlocked only with the
// user's security answer. They are never stored on the phone: not in Redux, not in storage, not in the query cache. The screen keeps
// them in its own state while it is open, and drops them when it closes.

export type SexualActivity = 'yes' | 'no' | 'prefer_not_to_say';
export type Protection = 'always' | 'sometimes' | 'never' | 'not_applicable' | 'prefer_not_to_say';
export type Partners = 'none' | 'one' | 'two_or_more' | 'prefer_not_to_say';
export type StiHistory = 'yes' | 'no' | 'prefer_not_to_say';
export type Orientation = 'heterosexual' | 'gay_or_lesbian' | 'bisexual' | 'other' | 'prefer_not_to_say';
export type SelfSexuality = 'never' | 'less_than_weekly' | 'one_to_three_weekly' | 'four_or_more_weekly' | 'prefer_not_to_say';
export type DrugUse = 'never' | 'three_or_fewer' | 'more_than_three' | 'prefer_not_to_say';

export interface PrivateItems {
  sexual_activity?: SexualActivity;
  protection?: Protection;
  partners?: Partners;
  sti_history?: StiHistory;
  orientation?: Orientation;
  self_sexuality?: SelfSexuality;
  drug_use?: DrugUse;
}

export interface PrivateStatus {
  configured: boolean;
  question_id: string | null;
  locked_until: string | null;
}

interface Option<T extends string> {
  value: T;
  label: string;
}

export interface PrivateQuestion<K extends keyof PrivateItems = keyof PrivateItems> {
  key: K;
  title: string;
  // Short help shown behind an info button next to the question.
  info?: string;
  options: Option<NonNullable<PrivateItems[K]>>[];
}

const PREFER: Option<'prefer_not_to_say'> = { value: 'prefer_not_to_say', label: 'Prefer not to say' };

// Every question can be skipped, and every one offers "Prefer not to say".
export const PRIVATE_QUESTIONS: PrivateQuestion[] = [
  {
    key: 'sexual_activity',
    title: 'Are you currently sexually active?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      PREFER,
    ],
  },
  {
    key: 'protection',
    title: 'Do you use protection or contraception?',
    options: [
      { value: 'always', label: 'Always' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'never', label: 'Never' },
      { value: 'not_applicable', label: 'Not applicable' },
      PREFER,
    ],
  },
  {
    key: 'partners',
    title: 'In the past 12 months, how many partners have you had?',
    options: [
      { value: 'none', label: 'None' },
      { value: 'one', label: 'One' },
      { value: 'two_or_more', label: 'Two or more' },
      PREFER,
    ],
  },
  {
    key: 'sti_history',
    title: 'Have you ever had a sexually transmitted infection (STI)?',
    info: 'Testing is quick and confidential. A blood or urine sample is usually enough. You can ask your family doctor, or go to a government hospital or a trusted lab and ask for a sexual health screening. Tell them if you are unsure which tests you need, and they will suggest them.',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      PREFER,
    ],
  },
  {
    key: 'orientation',
    title: 'How do you describe your sexual orientation?',
    options: [
      { value: 'heterosexual', label: 'Straight' },
      { value: 'gay_or_lesbian', label: 'Gay or lesbian' },
      { value: 'bisexual', label: 'Bisexual' },
      { value: 'other', label: 'Other' },
      PREFER,
    ],
  },
  {
    key: 'self_sexuality',
    title: 'How often do you masturbate?',
    info: 'This is a normal part of sexual health for many people. Your answer stays locked with your security answer and is never shared.',
    options: [
      { value: 'never', label: 'Never' },
      { value: 'less_than_weekly', label: 'Less than once a week' },
      { value: 'one_to_three_weekly', label: '1–3 times a week' },
      { value: 'four_or_more_weekly', label: '4 or more times a week' },
      PREFER,
    ],
  },
  {
    key: 'drug_use',
    title: 'Have you used recreational drugs, or drugs a doctor did not give you?',
    info: 'This does not include medicines a doctor gave you. Your answer stays locked and is never shared.',
    options: [
      { value: 'never', label: 'Never' },
      { value: 'three_or_fewer', label: '3 times or fewer' },
      { value: 'more_than_three', label: 'More than 3 times' },
      PREFER,
    ],
  },
] as PrivateQuestion[];

// The security questions to choose from. The ids match the server's list; the server stores only the id.
export const SECURITY_QUESTIONS: { id: string; text: string }[] = [
  { id: 'first_school', text: 'What was the name of your first school?' },
  { id: 'childhood_street', text: 'What street did you grow up on?' },
  { id: 'first_pet', text: 'What was the name of your first pet?' },
  { id: 'favourite_teacher', text: 'What was the surname of your favourite teacher?' },
  { id: 'grandmother_first_name', text: 'What is your grandmother’s first name?' },
  { id: 'first_phone_model', text: 'What was the model of your first phone?' },
  { id: 'childhood_nickname', text: 'What was your childhood nickname?' },
  { id: 'first_job_place', text: 'Where did you have your first job?' },
];

export const questionText = (id: string | null): string => SECURITY_QUESTIONS.find((q) => q.id === id)?.text ?? 'Your security question';

// The word shown for a saved answer.
export function answerLabel(key: keyof PrivateItems, value: string | undefined): string {
  if (!value) return 'Not answered';
  return PRIVATE_QUESTIONS.find((q) => q.key === key)?.options.find((o) => o.value === value)?.label ?? value;
}

const STATUS_KEY = ['profile', 'sensitive', 'status'] as const;
export const PRIVATE_STATUS_KEY = STATUS_KEY;

// Whether private answers are saved and which question protects them. This is all that is cached: never the answers.
export function usePrivateStatus() {
  return useQuery({
    queryKey: STATUS_KEY,
    queryFn: async (): Promise<PrivateStatus> => (await api.get<PrivateStatus>('/v1/profile/sensitive/status')).data,
    staleTime: 0,
  });
}

export async function savePrivate(body: { answer: string; question_id?: string; items: PrivateItems }): Promise<PrivateStatus> {
  return (await api.put<PrivateStatus>('/v1/profile/sensitive', body)).data;
}

export async function unlockPrivate(answer: string): Promise<PrivateItems> {
  return (await api.post<{ items: PrivateItems }>('/v1/profile/sensitive/unlock', { answer })).data.items;
}

export async function erasePrivate(): Promise<void> {
  await api.delete('/v1/profile/sensitive');
}
