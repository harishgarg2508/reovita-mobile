// Mirrors OnboardingStatusResponseDto in reovita-service.
export type OnboardingStepKey = 'basics' | 'history' | 'lifestyle' | 'reports';

export interface OnboardingStatus {
  steps: Record<OnboardingStepKey, boolean>;
  percent: number;
  next_step: OnboardingStepKey | null;
  unlock_lines: string[];
  dashboard_access: boolean;
}
