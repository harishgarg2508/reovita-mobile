import { Ionicons } from '@expo/vector-icons';
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
  { title: 'Vitals', subtitle: 'A few basics. A better picture of you.' },
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
        nestedScrollEnabled={true}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 20) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}>

        {/* Intro: step context row, heading, description */}
        <View style={styles.intro}>
          <View style={styles.contextRow}>
            <Text style={styles.stepBadge}>STEP {step} OF 4</Text>
            <Text style={styles.requirement}>{step === 1 ? 'Mandatory' : 'Optional'}</Text>
          </View>
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
      </ScrollView>
      <View style={[styles.footerFixed, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
        <View style={styles.actionWrap}>
          {step === 1 ? <Text style={styles.footerNote}>All fields required</Text> : null}
          <View style={styles.buttonGroup}>
            {step > 1 ? (
              <>
                <Pressable accessibilityRole="button" onPress={back} style={styles.skipButton}>
                  <Text style={styles.skipButtonText}>Back</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={next} style={styles.skipButton}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </Pressable>
              </>
            ) : null}
            <View style={styles.nextGroupItem}>
              <Button
                label={step === 4 ? 'Complete Onboarding' : step === 1 ? 'Continue' : 'Next'}
                disabled={!canSave || save.isPending}
                onPress={step === 4 ? next : onSave}
              />
            </View>
          </View>
        </View>

        {save.isError ? (
          <Text style={styles.errorText}>Could not save this step. Please check your entries.</Text>
        ) : null}
      </View>
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1.1,
    color: '#242032',
  },
  subtitle: {
    fontSize: 15,
    color: '#60646C',
    fontWeight: '500',
    lineHeight: 22,
  },
  stepBody: {
    flex: 1,
    marginTop: 24,
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
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 60 },
  navSide: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navSideRight: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },
  dotActive: { width: 20, height: 6, borderRadius: 999, backgroundColor: '#7545ED', marginHorizontal: 12 },
  dotDone: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#D4FF3F', marginHorizontal: 19 },
  dotUpcoming: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#E5E0EC', marginHorizontal: 19 },
  percentText: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#6B7280' },
  intro: { gap: 8 },
  contextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requirement: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: '#6B7280' },
  footerNote: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#6B7280', marginBottom: 8 },
  footerFixed: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E0EC',
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
