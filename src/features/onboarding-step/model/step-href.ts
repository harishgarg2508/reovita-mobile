// Route for each onboarding step: /step-1 ... /step-4.
export type OnboardingStepNumber = 1 | 2 | 3 | 4;

export function stepHref(step: OnboardingStepNumber) {
  switch (step) {
    case 1:
      return '/(onboarding)/step-1' as const;
    case 2:
      return '/(onboarding)/step-2' as const;
    case 3:
      return '/(onboarding)/step-3' as const;
    case 4:
      return '/(onboarding)/step-4' as const;
  }
}
