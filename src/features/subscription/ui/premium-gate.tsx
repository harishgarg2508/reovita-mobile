import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { usePalette } from '@shared/ui/theme';
import { useSubscription } from '@entities/subscription';

import { PlanScreen } from './plan-screen';

// Wraps a screen that is part of Premium. A Premium account sees the screen; a free account sees the plan screen instead, with a line saying which feature
// was opened. While the plan is loading a spinner shows. If the plan cannot be read the screen is shown anyway: the server checks the plan on every
// Premium route, so nothing is opened by this.
export function PremiumGate({ feature, children }: { feature: string; children: ReactNode }) {
  const p = usePalette();
  const plan = useSubscription();
  if (plan.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg }}>
        <ActivityIndicator color={p.accent} />
      </View>
    );
  }
  if (plan.locked) return <PlanScreen feature={feature} />;
  return <>{children}</>;
}
