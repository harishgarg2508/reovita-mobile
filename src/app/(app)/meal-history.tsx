import { PremiumGate } from '@features/subscription';
import { ScanHistoryScreen } from '@features/food-scan';

export default function MealHistoryRoute() {
  return (
    <PremiumGate feature="Scan my meal">
      <ScanHistoryScreen kind="meal" />
    </PremiumGate>
  );
}
