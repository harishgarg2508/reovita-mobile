import { useLocalSearchParams } from 'expo-router';

import { DietaryChartScreen } from '@features/dietary-guidance';
import { PremiumGate } from '@features/subscription';

export default function DietaryChartRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PremiumGate feature="Dietary guidance">
      <DietaryChartScreen id={String(id ?? '')} />
    </PremiumGate>
  );
}
