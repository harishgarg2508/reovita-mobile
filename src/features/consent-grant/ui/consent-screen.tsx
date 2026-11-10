import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONSENT_TYPES, useConsentGrants, type ConsentScreenId } from '@entities/consent';
import { api, isApiError } from '@shared/api';
import { tapConfirm } from '@shared/lib';

import { useConsentFlow } from '../model/use-consent-flow';

const VIOLET = '#1F6F3F';
const LIME = '#d4ff3f';
const INK = '#242032';
const INK_SECONDARY = '#655f74';
const INK_TERTIARY = '#6b7280';
const BORDER = '#e5e0ec';
const SURFACE = '#fbfaff';
// Consent carousel. The screen comes from the URL on open (/consent, /consent?health_consent_screen=true,
// /consent?ai_consent_screen=true), then Redux drives every change. Slides for consents that are already
// granted (GET /v1/consents, granted_at set) are left out.
export function ConsentScreen({ startScreen = 'welcome' }: { startScreen?: ConsentScreenId }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const consents = useConsentGrants();
  // The slide order is fixed when the screen loads, so saving a consent does not remove a slide mid-flow.
  const [order, setOrder] = useState<ConsentScreenId[] | null>(null);
  const flow = useConsentFlow(order ?? ['welcome', 'controls']);
  const { screen, records, goTo, next, back, setSelected, saveType } = flow;
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Lock the slide order once the consent list has loaded (setting state during render, as React allows).
  if (!order && !consents.isLoading) {
    const slides: ConsentScreenId[] = ['welcome'];
    if (!consents.granted.has('health_data')) slides.push('storage');
    if (!consents.granted.has('llm_processing')) slides.push('ai');
    slides.push('controls');
    setOrder(slides);
  }

  // Open on the screen named in the URL, once the order is known.
  useEffect(() => {
    if (!order) return;
    goTo(order.includes(startScreen) ? startScreen : order[0]);
    // Runs when the order is first known; later moves go through Redux.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // Keep the URL in step with the screen shown, e.g. ?health_consent_screen=true on the storage slide.
  useEffect(() => {
    router.setParams({
      health_consent_screen: screen === 'storage' ? 'true' : undefined,
      ai_consent_screen: screen === 'ai' ? 'true' : undefined,
      final_consent_confirm_screen: screen === 'controls' ? 'true' : undefined,
    });
  }, [router, screen]);

  const slides = order ?? ['welcome'];
  const slideIndex = Math.max(0, slides.indexOf(screen));
  // Checkbox state before Next. The Redux record only becomes true when Next is pressed.
  const [healthDraft, setHealthDraft] = useState(false);
  const [aiDraft, setAiDraft] = useState(false);

  // Next commits the ticked box to Redux: the record becomes true only now.
  function onNext() {
    tapConfirm();
    setDirection('forward');
    if (screen === 'storage' && healthDraft) setSelected('health_data', true);
    if (screen === 'ai' && aiDraft) setSelected('llm_processing', true);
    next();
  }

  // Skip moves on without saving a consent for this slide.
  function onSkip() {
    tapConfirm();
    setDirection('forward');
    next();
  }

  function onBack() {
    if (slideIndex > 0) {
      setDirection('back');
      back();
    } else if (router.canGoBack()) {
      // Consent is reached by a redirect from the (app) guard, so there is often no history.
      router.back();
    }
  }

  // Last slide. Pressing Next sends every ticked consent that is not granted yet (POST /v1/consents),
  // Last slide. Pressing Next saves each ticked consent (POST /v1/consents), then calls GET /v1/home.
  // 428 (profile incomplete) opens onboarding; any other result opens the dashboard.
  async function onFinish() {
    tapConfirm();
    try {
      for (const type of CONSENT_TYPES) {
        if (records[type].selected && !consents.granted.has(type)) {
          await saveType(type);
        }
      }
    } catch {
      return; // The error is kept in Redux (records[type].status) and shown on this screen.
    }
    try {
      await api.get('/v1/home');
      router.replace('/(app)/(tabs)/dashboard');
    } catch (err) {
      if (isApiError(err) && err.status === 428) {
        router.replace('/onboarding');
      } else {
        router.replace('/(app)/(tabs)/dashboard');
      }
    }
  }

  // On the storage slide, ticking the box sets the local draft only.
  function toggleHealthAgree() {
    tapConfirm();
    setHealthDraft((v) => !v);
  }

  // Slide change animation: the new slide enters from the side it came from.
  const entering = direction === 'forward' ? FadeInRight.duration(280) : FadeInLeft.duration(280);
  const exiting = direction === 'forward' ? FadeOutLeft.duration(200) : FadeOutRight.duration(200);

  if (!order) {
    return <View style={[styles.screen, { paddingTop: insets.top }]} />;
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* Top navigation */}
      <View style={styles.navRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={styles.backBtn}>
          {slideIndex === 0 ? (
            <Image source={require('../../../shared/assets/images/reovita-sprout.png')} style={styles.navLogo} resizeMode="contain" />
          ) : (
            <Ionicons name="arrow-back" size={20} color={VIOLET} />
          )}
        </Pressable>
        <View style={styles.dotsCenter}>
          {slides.map((_, i) => {
            if (i === slideIndex) return <View key={i} style={styles.dotActive} />;
            if (i < slideIndex) return <View key={i} style={styles.dotDone} />;
            return <View key={i} style={styles.dot} />;
          })}
        </View>
        <Text style={styles.counter}>{slideIndex + 1} / {slides.length}</Text>
      </View>


      {/* Each slide is keyed by its screen, so changing screen runs the enter and exit animation */}
      <Animated.View key={screen} entering={entering} exiting={exiting} style={styles.flex}>
        {screen === 'welcome' ? (
          <>
            <View style={styles.hero}>
              <View style={styles.glow} />
              <View style={styles.appCard}>
                <Image source={require('../../../shared/assets/images/reovita-sprout.png')} style={styles.sprout} resizeMode="contain" />
              </View>
            </View>

            <View style={styles.copy}>
              <Text style={styles.heading}>Welcome to VITA</Text>
              <Text style={styles.body}>
                {"Your health, in your words. Before we start, we'll walk you through exactly how your data is handled: two quick consents, then you're in."}
              </Text>
              <Text style={styles.eyebrow}>CLEAR CHOICES. YOUR CONTROL.</Text>
              <Text style={styles.caption}>Health data storage  ·  AI report processing</Text>
            </View>

            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={onNext} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                <Text style={styles.primaryText}>Next</Text>
              </Pressable>
              <View style={styles.footerRow}>
                <Text style={styles.footerLeft}>Takes about 60 seconds.</Text>
              </View>
            </View>
          </>
        ) : null}

        {screen === 'storage' ? (
          <>
            {/* Illustration: phone and document cards on the lime glow, from Figma hero/storage */}
            <View style={styles.storageHero}>
              <Image source={require('../../../shared/assets/images/consent-storage-hero.png')} style={styles.storageImage} resizeMode="contain" />
            </View>

            <ScrollView style={styles.flex} contentContainerStyle={styles.storageContent}>
              <View style={styles.introBlock}>
                <Text style={styles.eyebrowSmall}>CONSENT 1 OF 2</Text>
                <Text style={styles.heading}>Store my health data</Text>
                <Text style={styles.body}>
                  VITA securely stores your profile (age, sex, height, weight), your uploaded medical reports, and the health values extracted from them. This is what powers your timeline and your insights.
                </Text>
              </View>

              <Pressable accessibilityRole="link" onPress={() => undefined} style={styles.agreementLink}>
                <Text style={styles.agreementText}>Read the Health Data Agreement →</Text>
              </Pressable>

              <View style={styles.trustRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={INK_TERTIARY} />
                <Text style={styles.trustText}>Encrypted at rest · Never sold · Delete anytime</Text>
              </View>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: healthDraft }}
                onPress={toggleHealthAgree}
                style={styles.consentCard}>
                <View style={[styles.checkbox, healthDraft && styles.checkboxOn]}>
                  {healthDraft ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </View>
                <Text style={styles.consentLabel}>I agree to VITA storing my health data</Text>
              </Pressable>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !healthDraft }}
                disabled={!healthDraft}
                onPress={onNext}
                style={({ pressed }) => [styles.primary, pressed && styles.pressed, !healthDraft && styles.disabled]}>
                <Text style={styles.primaryText}>Next</Text>
              </Pressable>
              <View style={styles.footerRow}>
                <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8}>
                  <Text style={styles.footerLeft}>Prev</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}

        {screen === 'ai' ? (
          <>
            <View style={styles.storageHero}>
              <Image source={require('../../../shared/assets/images/consent-ai-hero.png')} style={styles.storageImage} resizeMode="contain" />
            </View>

            <ScrollView style={styles.flex} contentContainerStyle={styles.storageContent}>
              <View style={styles.introBlock}>
                <Text style={styles.eyebrowSmall}>CONSENT 2 OF 2</Text>
                <Text style={styles.heading}>Process my reports with AI</Text>
                <Text style={styles.body}>
                  When you upload a report, VITA sends the extracted values to its AI service to generate a plain-language interpretation and an action plan. Reports are never sold and never used to train public AI models.
                </Text>
              </View>

              <Pressable accessibilityRole="link" onPress={() => undefined} style={styles.agreementLink}>
                <Text style={styles.agreementText}>How AI works →</Text>
              </Pressable>

              <View style={styles.trustRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={INK_TERTIARY} />
                <Text style={styles.trustText}>Processed only on your request · Not used for model training</Text>
              </View>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: aiDraft }}
                onPress={() => {
                  tapConfirm();
                  setAiDraft((v) => !v);
                }}
                style={styles.consentCard}>
                <View style={[styles.checkbox, aiDraft && styles.checkboxOn]}>
                  {aiDraft ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </View>
                <Text style={styles.consentLabel}>I consent to my reports being processed by AI</Text>
              </Pressable>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !aiDraft }}
                disabled={!aiDraft}
                onPress={onNext}
                style={({ pressed }) => [styles.primary, pressed && styles.pressed, !aiDraft && styles.disabled]}>
                <Text style={styles.primaryText}>Next</Text>
              </Pressable>
              <View style={styles.footerRow}>
                <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8}>
                  <Text style={styles.footerLeft}>Prev</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={8}>
                  <Text style={styles.footerLeft}>Skip</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}

        {screen === 'controls' ? (
          <>
            <View style={styles.storageHero}>
              <Image source={require('../../../shared/assets/images/consent-controls-hero.png')} style={styles.storageImage} resizeMode="contain" />
            </View>

            <ScrollView style={styles.flex} contentContainerStyle={styles.storageContent}>
              <View style={styles.introBlock}>
                <Text style={styles.heading}>You stay in control</Text>
                <Text style={styles.body}>
                  {"Consent isn't permanent. From Settings you can export a copy of everything, delete your data at any time, or change what VITA is allowed to process."}
                </Text>
              </View>

              <View style={styles.controlList}>
                {['Export your data as a PDF or JSON', 'Delete your account and all reports', 'Withdraw AI consent anytime'].map((label) => (
                  <View key={label} style={styles.controlRow}>
                    <View style={styles.controlBadge}>
                      <Ionicons name="checkmark" size={14} color={INK} />
                    </View>
                    <Text style={styles.controlLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={onFinish} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                <Text style={styles.primaryText}>Next</Text>
              </Pressable>
              <View style={styles.footerRow}>
                <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8}>
                  <Text style={styles.footerLeft}>Prev</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SURFACE, paddingHorizontal: 24 },
  flex: { flex: 1 },

  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 60 },
  backBtn: { width: 18, height: 44, alignItems: 'center', justifyContent: 'center' },
  navLogo: { width: 30, height: 24 },
  wordmark: { fontFamily: 'Poppins_800ExtraBold', fontSize: 15, color: VIOLET },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dotsCenter: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BORDER, marginHorizontal: 19 },
  dotDone: { width: 6, height: 6, borderRadius: 3, backgroundColor: LIME, marginHorizontal: 19 },
  dotActive: { width: 20, height: 6, borderRadius: 999, backgroundColor: VIOLET, marginHorizontal: 12 },
  counter: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: INK_TERTIARY, width: 38, textAlign: 'right' },

  progressTrack: { height: 4, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 4, borderRadius: 999, backgroundColor: VIOLET },

  hero: { height: 248, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 228, height: 228, borderRadius: 114, backgroundColor: LIME, opacity: 0.18 },
  appCard: {
    width: 128, height: 128, borderRadius: 36, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center',
    shadowColor: VIOLET, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  sprout: { width: 96, height: 72 },

  storageHero: { height: 224, alignItems: 'center', justifyContent: 'center' },
  storageImage: { width: 390, height: 224 },
  storageContent: { paddingTop: 8, paddingBottom: 12, gap: 14 },
  introBlock: { gap: 10 },
  eyebrowSmall: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1.4, color: VIOLET },
  agreementLink: { height: 44, justifyContent: 'center' },
  agreementText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: VIOLET },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 16, color: INK_TERTIARY },
  consentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 80, padding: 16,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF',
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  checkboxOn: { backgroundColor: VIOLET, borderColor: VIOLET },
  consentLabel: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 14, lineHeight: 20, color: INK },

  copy: { flex: 1, gap: 10, paddingTop: 8 },
  heading: { fontFamily: 'Poppins_400Regular', fontSize: 30, lineHeight: 34, letterSpacing: -1.1, color: INK },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 15, lineHeight: 22, color: INK_SECONDARY },
  eyebrow: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, letterSpacing: 1, color: VIOLET, marginTop: 20 },
  caption: { fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 20, color: INK_TERTIARY },

  actions: { gap: 8, paddingTop: 12, paddingBottom: 8 },
  primary: { height: 52, borderRadius: 999, backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primaryText: { fontFamily: 'Poppins_400Regular', fontSize: 16, color: '#FFFFFF' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  footerLeft: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: INK_TERTIARY },

  controlList: { gap: 8, paddingTop: 8 },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  controlBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f0ffd0', alignItems: 'center', justifyContent: 'center' },
  controlLabel: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 20, color: INK },
  choicesContent: { paddingTop: 16, paddingBottom: 24, gap: 14 },
  choicesCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: BORDER },
  error: { color: '#C22F43', fontSize: 13, fontFamily: 'Poppins_400Regular' },
});
