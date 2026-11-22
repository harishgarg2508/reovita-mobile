import { PremiumGate } from '@features/subscription';
import { ScanHistoryScreen } from '@features/food-scan';

export default function FridgeHistoryRoute() {
  return (
    <PremiumGate feature="Scan my fridge">
      <ScanHistoryScreen kind="fridge" />
    </PremiumGate>
  );
}
