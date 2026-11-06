import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfileCompleteness } from '@entities/profile';
import { Button } from '@shared/ui/button';
import { ProgressBar } from '@shared/ui/progress-bar';
import { Skeleton } from '@shared/ui/skeleton';
import { tapConfirm } from '@shared/lib';

import { stepHref, type OnboardingStepNumber } from '../model/step-href';
import { useSaveStep } from '../model/use-save-step';
import type { BasicsInput, HistoryInput, LifestyleInput } from '../model/onboarding.types';
import { StepConditionsForm } from './step-conditions-form';
import { StepIdentityForm } from './step-identity-form';
import { StepLifestyleForm } from './step-lifestyle-form';

const STEP_DATA = [
  { title: 'Tell us about you', subtitle: "Let's start with some basic details" },
  { title: 'Your Health Details', subtitle: 'Help us understand your health' },
  { title: 'Lifestyle & Habits', subtitle: 'Tell us about your daily routines' },
  { title: 'Your First Report', subtitle: 'Upload a lab report to get instant interpretation' },
];

export function OnboardingStepper({ step }: { step: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const status = useProfileCompleteness();
  const save = useSaveStep();

  const [basics, setBasics] = useState<BasicsInput | null>(null);
  const [history, setHistory] = useState<HistoryInput | null>(null);
  const [lifestyle, setLifestyle] = useState<LifestyleInput | null>(null);

  const current = STEP_DATA[Math.min(step - 1, STEP_DATA.length - 1)];

  function next() {
    if (step < 4) {
      router.replace(stepHref((step + 1) as OnboardingStepNumber));
    } else {
      router.replace('/(app)/(tabs)/dashboard');
    }
  }

  function back() {
    if (step > 1) {
      router.replace(stepHref((step - 1) as OnboardingStepNumber));
    } else {
      router.replace('/(app)/(tabs)/dashboard');
    }
  }

  async function onSave() {
    tapConfirm();
    if (step === 1 && basics) await save.mutateAsync({ step: 1, body: basics });
    if (step === 2 && history) await save.mutateAsync({ step: 2, body: history });
    if (step === 3 && lifestyle) await save.mutateAsync({ step: 3, body: lifestyle });
    next();
  }

  // Draw the step straight away; the progress bar falls back to the step position until status loads.
  const percent = status.data?.percent ?? Math.round((step / 4) * 100);
  const canSave =
    (step === 1 && basics !== null) ||
    (step === 2 && history !== null) ||
    (step === 3 && lifestyle !== null) ||
    step === 4;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 20) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}>
        {/* Top Header: Back & Skip */}
        {step > 1 ? (
          <View style={styles.headerBar}>
            <Pressable accessibilityRole="button" onPress={back} style={styles.headerBtn}>
              <Text style={styles.backChevron}>←</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Progress Bar */}
        <View style={styles.progressWrap}>
          <ProgressBar percent={percent} color="#84CC16" />
        </View>

        {/* Step Indicator & Header */}
        <View style={styles.titleSection}>
          <Text style={styles.stepBadge}>Step {step} of 4</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
        </View>

        {/* Step Content */}
        <View style={styles.stepBody}>
          {step === 1 ? <StepIdentityForm onChange={setBasics} /> : null}
          {step === 2 ? <StepConditionsForm onChange={setHistory} /> : null}
          {step === 3 ? <StepLifestyleForm onChange={setLifestyle} /> : null}
          {step === 4 ? (
            <View style={styles.reportUploadSection}>
              <Text style={styles.reportPrompt}>
                Upload a lab report or prescription to get your first personalized DNA health interpretation.
              </Text>
              <Button
                label="Upload Lab Report"
                onPress={() => router.push('/(app)/reports/upload')}
              />
            </View>
          ) : null}
        </View>

        {/* Footer Actions */}
        <View style={styles.actionWrap}>
          <View style={styles.buttonGroup}>
            {step > 1 ? (
              <Pressable accessibilityRole="button" onPress={next} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </Pressable>
            ) : null}
            <View style={styles.nextGroupItem}>
              <Button
                label={step === 4 ? 'Complete Onboarding' : 'Next'}
                disabled={!canSave || save.isPending}
                onPress={step === 4 ? next : onSave}
              />
            </View>
          </View>
        </View>

        {save.isError ? (
          <Text style={styles.errorText}>Could not save this step. Please check your entries.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    paddingHorizontal: 24,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: 8,
  },
  headerBtn: {
    padding: 6,
  },
  backChevron: {
    fontSize: 22,
    fontWeight: '700',
    color: '#171717',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60646C',
  },
  progressWrap: {
    marginBottom: 16,
  },
  titleSection: {
    gap: 6,
    marginBottom: 20,
  },
  stepBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7545ED',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#171717',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#60646C',
    fontWeight: '500',
    lineHeight: 22,
  },
  stepBody: {
    flex: 1,
    marginBottom: 24,
  },
  reportUploadSection: {
    gap: 16,
    paddingTop: 12,
  },
  reportPrompt: {
    fontSize: 15,
    lineHeight: 22,
    color: '#171717',
  },
  actionWrap: {
    width: '100%',
    marginTop: 'auto',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    height: 52,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9D4EA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5C6080',
  },
  nextGroupItem: {
    flex: 1,
  },
  errorText: {
    color: '#C22F43',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
