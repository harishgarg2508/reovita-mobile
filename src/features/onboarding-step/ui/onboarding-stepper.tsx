import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ElementRef, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@shared/ui/button';
import { tapConfirm } from '@shared/lib';

import { useProfileCompleteness } from '@entities/profile';
import { stepHref, type OnboardingStepNumber } from '../model/step-href';
import { useSaveStep } from '../model/use-save-step';
import { useStepSaved } from '../model/use-step-saved';
import { missingFields } from '../model/missing-fields';
import { basicsFromSaved, historyFromSaved, lifestyleFromSaved } from '../model/saved-to-draft';
import { useBasicsDraft, useHistoryDraft, useLifestyleDraft } from '../model/use-onboarding-drafts';
import type { BasicsInput, HistoryInput, LifestyleInput } from '../model/onboarding.types';
import { StepConditionsForm } from './step-conditions-form';
import { StepHeaderBadge } from '@shared/ui/step-header-badge';
import { StepIdentityForm } from './step-identity-form';
import { StepLifestyleForm } from './step-lifestyle-form';
import { StepReportPrompt } from './step-report-prompt';

const STEP_DATA = [
  { title: 'Vitals', subtitle: 'A few basics. A better picture of you.' },
  { title: 'Medical History', subtitle: 'Your context, at your pace.' },
  { title: 'Lifestyle & Habits', subtitle: 'Tell us about your daily routines' },
  { title: 'Your First Report', subtitle: 'Upload a lab report to get instant interpretation' },
];

export function OnboardingStepper({ step }: { step: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const save = useSaveStep();

  const [basics, setBasics] = useState<BasicsInput | null>(null);
  const [history, setHistory] = useState<HistoryInput | null>(null);
  const [lifestyle, setLifestyle] = useState<LifestyleInput | null>(null);
  // Set on the first Continue press that finds missing fields, so they can be highlighted.
  const [attempted, setAttempted] = useState(false);
  // Once the report step is complete on the server, Step 4 is not shown again.
  const status = useProfileCompleteness();
  const reportsDone = status.data?.steps.reports === true;
  useEffect(() => {
    if (step === 4 && reportsDone) router.replace('/(app)/(tabs)/dashboard');
  }, [step, reportsDone, router]);

  // Fill the step with the values already saved on the server. Done once each time the step opens.
  const saved = useStepSaved(step as OnboardingStepNumber, step !== 4);
  const [, patchBasics] = useBasicsDraft();
  const [, patchHistory] = useHistoryDraft();
  const [, patchLifestyle] = useLifestyleDraft();
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !saved.data) return;
    prefilled.current = true;
    if (step === 1) patchBasics(basicsFromSaved(saved.data));
    if (step === 2) patchHistory(historyFromSaved(saved.data));
    if (step === 3) patchLifestyle(lifestyleFromSaved(saved.data));
  }, [saved.data, step, patchBasics, patchHistory, patchLifestyle]);

  // Required fields still empty, and the scroll position of each field, so Next can scroll to the first one.
  const [basicsNow] = useBasicsDraft();
  const [historyNow] = useHistoryDraft();
  const [lifestyleNow] = useLifestyleDraft();
  const missing = missingFields(step, basicsNow, historyNow, lifestyleNow);
  const shownMissing = attempted ? missing : [];
  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const fieldY = useRef<Record<string, number>>({});
  const bodyY = useRef(0);
  function onFieldLayout(name: string, y: number) {
    fieldY.current[name] = y;
  }
  function scrollToField(name: string) {
    const y = bodyY.current + (fieldY.current[name] ?? 0);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
  }

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
    // Check the required fields here first. No request is sent until they are valid.
    if (missing.length > 0) {
      setAttempted(true);
      scrollToField(missing[0]);
      return;
    }
    if (step === 1 && basics) await save.mutateAsync({ step: 1, body: basics });
    if (step === 2 && history) await save.mutateAsync({ step: 2, body: history });
    if (step === 3 && lifestyle) await save.mutateAsync({ step: 3, body: lifestyle });
    next();
  }


  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 20) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}>
        {/* Top Header: Logo on left, stylized icon on right, step progress, bold title */}
        <View style={styles.headerSection}>
          <View style={styles.headerLeft}>
            {/* Logo at the left */}
            <View style={styles.brandRow}>
              <Image
                source={require('../../../shared/assets/images/reovita-sprout.png')}
                style={styles.brandMark}
                resizeMode="contain"
              />
              <Text style={styles.brandName}>Reovita</Text>
            </View>

            {/* How much steps: pill badge and progress indicator */}
            <View style={styles.stepRow}>
              <View style={styles.stepPill}>
                <Text style={styles.stepBadge}>Step {step} of 4</Text>
              </View>
              <View style={styles.stepTrack}>
                <View style={[styles.stepFill, { width: `${(step / 4) * 100}%` }]} />
              </View>
            </View>

            {/* Header title properly bolded for each step */}
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.subtitle}>{current.subtitle}</Text>
          </View>

          {/* Icon in the top right */}
          <View style={styles.headerRight}>
            <StepHeaderBadge step={step} size={82} />
          </View>
        </View>

        {/* Step Content */}
        <View style={styles.stepBody} onLayout={(e) => (bodyY.current = e.nativeEvent.layout.y)}>
          {step === 1 ? <StepIdentityForm onChange={setBasics} missing={shownMissing} onFieldLayout={onFieldLayout} /> : null}
          {step === 2 ? <StepConditionsForm onChange={setHistory} missing={shownMissing} onFieldLayout={onFieldLayout} /> : null}
          {step === 3 ? <StepLifestyleForm onChange={setLifestyle} missing={shownMissing} onFieldLayout={onFieldLayout} /> : null}
          {step === 4 ? (
            <StepReportPrompt
              onChoose={() => router.push({ pathname: '/onboarding/upload', params: { pick: '1' } })}
              onSkip={() => router.replace('/(app)/(tabs)/dashboard')}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footerFixed, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
        <View style={styles.actionWrap}>
          {step === 1 ? (
            <View style={styles.requiredPill}>
              <Ionicons name="information-circle-outline" size={15} color="#1F6F3F" />
              <Text style={styles.requiredPillText}>All fields required</Text>
            </View>
          ) : null}
          <View style={styles.buttonGroup}>
            {step > 1 && step < 4 ? (
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
                label={step === 4 ? 'Complete setup' : step === 1 ? 'Continue →' : 'Next →'}
                disabled={save.isPending}
                onPress={step === 4 ? next : onSave}
              />
            </View>
          </View>
        </View>

        {save.isError ? (
          <View style={styles.errorRow}>
            <Ionicons name="information-circle-outline" size={14} color="#C22F43" />
            <Text style={styles.errorText}>{save.error?.message || 'Could not save this step. Please check your entries.'}</Text>
          </View>
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
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 10,
    gap: 8,
  },
  headerRight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  brandMark: {
    width: 28,
    height: 24,
  },
  brandName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#1B152B',
    letterSpacing: -0.4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  stepPill: {
    backgroundColor: '#F1EDF7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stepBadge: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#1F6F3F',
    letterSpacing: 0.2,
  },
  stepTrack: {
    width: 64,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5E0EC',
    overflow: 'hidden',
  },
  stepFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#1F6F3F',
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: '#1B152B',
    marginTop: 2,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#655F74',
  },
  stepBody: {
    flex: 1,
    marginTop: 18,
    marginBottom: 24,
  },
  requiredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1EDF7',
    marginBottom: 12,
  },
  requiredPillText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#655F74',
  },
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
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#5C6080',
  },
  nextGroupItem: {
    flex: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    color: '#C22F43',
    fontSize: 13,
    textAlign: 'center',
  },
});
