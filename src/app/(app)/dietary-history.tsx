import { DietaryHistoryScreen } from '@features/dietary-guidance';
import { PremiumGate } from '@features/subscription';

export default function DietaryHistoryRoute() {
  return (
    <PremiumGate feature="Dietary guidance">
      <DietaryHistoryScreen />
    </PremiumGate>
  );
}
