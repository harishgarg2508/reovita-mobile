import { PremiumGate } from '@features/subscription';
import { useLocalSearchParams } from 'expo-router';

import { ScanResultScreen } from '@features/food-scan';

export default function FoodScanRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PremiumGate feature="Food scans">
      <ScanResultScreen id={String(id ?? '')} />
    </PremiumGate>
  );
}
