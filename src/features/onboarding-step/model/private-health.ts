import { useQuery } from '@tanstack/react-query';

import { api } from '@shared/api';

// The private questions in the lifestyle step (sexual health). The answers are encrypted on the server and unlocked only with the
// user's security answer. They are never stored on the phone: not in Redux, not in storage, not in the query cache. The screen keeps
// them in its own state while it is open, and drops them when it closes.

export type SexualActivity = 'yes' | 'no' | 'prefer_not_to_say';
export type Protection = 'always' | 'sometimes' | 'never' | 'not_applicable' | 'prefer_not_to_say';
export type Partners = 'none' | 'one' | 'two_or_more' | 'prefer_not_to_say';
export type StiHistory = 'yes' | 'no' | 'prefer_not_to_say';

export interface PrivateItems {
  sexual_activity?: SexualActivity;
  protection?: Protection;
  partners?: Partners;
  sti_history?: StiHistory;
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
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
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
