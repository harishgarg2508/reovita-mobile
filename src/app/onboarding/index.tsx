import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useActiveConsent } from '@entities/consent';
import { useProfileCompleteness, type OnboardingStepKey } from '@entities/profile';
import { stepHref, type OnboardingStepNumber } from '@features/onboarding-step';
import { isApiError } from '@shared/api';

const STEP_OF: Record<OnboardingStepKey, OnboardingStepNumber> = { basics: 1, history: 2, lifestyle: 3, reports: 4 };

// Onboarding entry: opens the first step that is not done yet, from GET /v1/onboarding/status.
// A 428 (profile incomplete) means nothing is saved yet, so it opens step 1.
// Onboarding writes health data, so it needs an active health_data consent first.
export default function OnboardingEntry() {
  const consent = useActiveConsent('health_data');
  const status = useProfileCompleteness();

  if (consent.isLoading) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }
  if (!consent.granted) {
    return <Redirect href="/(auth)/consent" />;
  }

  if (status.isError && isApiError(status.error) && status.error.status === 428) {
    return <Redirect href={stepHref(1)} />;
  }

  if (status.isLoading || !status.data) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  const next = status.data.next_step;
  if (!next) return <Redirect href="/(app)/(tabs)/dashboard" />;
  return <Redirect href={stepHref(STEP_OF[next])} />;
}
