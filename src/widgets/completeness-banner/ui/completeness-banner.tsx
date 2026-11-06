import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useProfileCompleteness, type OnboardingStepKey } from '@entities/profile';
import { stepHref, type OnboardingStepNumber } from '@features/onboarding-step';
import { ProfileAvatarBadge } from '@shared/ui';

const STEP_NUMBER: Record<OnboardingStepKey, OnboardingStepNumber> = {
  basics: 1,
  history: 2,
  lifestyle: 3,
  reports: 4,
};

/**
 * Reovita Profile Completeness Banner.
 * Exact recreation from Screen 2 (Home Dashboard):
 * - Soft golden-amber background (#FEF9ED)
 * - Yellow circular avatar silhouette badge
 * - "Complete Your Profile" title & "Get better insights" subtitle
 * - "Complete" royal purple pill button
 */
export function CompletenessBanner() {
  const router = useRouter();
  const status = useProfileCompleteness();
  const nextStep = status.data?.next_step ?? 'basics';

  function onComplete() {
    router.push(stepHref(STEP_NUMBER[nextStep]));
  }

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <ProfileAvatarBadge size={38} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Get better insights</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onComplete}
        style={styles.actionBtn}>
        <Text style={styles.actionBtnText}>Complete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9ED',
    borderWidth: 1,
    borderColor: '#FBE8C3',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#171717',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#60646C',
  },
  actionBtn: {
    backgroundColor: '#7545ED',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 8,
    shadowColor: '#7545ED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
