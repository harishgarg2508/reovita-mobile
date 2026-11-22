import { PremiumGate } from '@features/subscription';
import { BriefingPage } from '@features/briefing-view';

export default function BriefingsRoute() {
  return (
    <PremiumGate feature="The daily briefing">
      <BriefingPage />
    </PremiumGate>
  );
}
