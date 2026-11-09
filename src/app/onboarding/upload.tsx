import { useLocalSearchParams } from 'expo-router';

import { UploadScreen } from '@features/report-upload';

// Upload from onboarding Step 4. It lives outside the (app) group, so the app gate does not send it back to onboarding.
export default function OnboardingUploadRoute() {
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  return <UploadScreen autoPick={pick === '1'} />;
}
