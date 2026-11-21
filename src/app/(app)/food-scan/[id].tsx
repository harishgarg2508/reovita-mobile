import { useLocalSearchParams } from 'expo-router';

import { ScanResultScreen } from '@features/food-scan';

export default function FoodScanRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ScanResultScreen id={String(id ?? '')} />;
}
