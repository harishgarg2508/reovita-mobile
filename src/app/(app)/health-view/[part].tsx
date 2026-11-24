import { useLocalSearchParams } from 'expo-router';

import { useIsFamilyView } from '@features/profile-switch';
import { HealthDetailView, type HealthPart } from '@features/profile-details';

const PARTS: HealthPart[] = ['lifestyle', 'conditions', 'reports'];

// A view-only screen for one part of the health details (lifestyle, conditions or reports). Used for a family member's health.
export default function HealthViewRoute() {
  const { part } = useLocalSearchParams<{ part: string }>();
  const chosen = PARTS.find((item) => item === part) ?? 'lifestyle';
  const familyView = useIsFamilyView();
  return <HealthDetailView part={chosen} familyView={familyView} />;
}
