import { PremiumGate } from '@features/subscription';
import { ScanScreen } from '@features/food-scan';

export default function FridgeScanRoute() {
  return (
    <PremiumGate feature="Scan my fridge">
      <ScanScreen kind="fridge" />
    </PremiumGate>
  );
}
