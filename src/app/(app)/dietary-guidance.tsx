import { PremiumGate } from '@features/subscription';
import { DietaryGuidanceScreen } from '@features/dietary-guidance';

export default function DietaryGuidanceRoute() {
  return (
    <PremiumGate feature="Dietary guidance">
      <DietaryGuidanceScreen />
    </PremiumGate>
  );
}
