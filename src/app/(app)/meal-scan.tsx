import { PremiumGate } from '@features/subscription';
import { ScanScreen } from '@features/food-scan';

export default function MealScanRoute() {
  return (
    <PremiumGate feature="Scan my meal">
      <ScanScreen kind="meal" />
    </PremiumGate>
  );
}
