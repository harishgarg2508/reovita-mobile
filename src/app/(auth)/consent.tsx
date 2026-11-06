import { useLocalSearchParams } from 'expo-router';

import { ConsentScreen } from '@features/consent-grant';
import type { ConsentScreenId } from '@entities/consent';

// The URL names the consent screen to open:
//   /consent                                -> welcome
//   /consent?health_consent_screen=true     -> "Store my health data"
//   /consent?ai_consent_screen=true         -> "Process my reports with AI"
//   /consent?final_consent_confirm_screen=true -> "You stay in control"
// While the user moves through the carousel, the URL is kept in step with the current screen.
export default function ConsentRoute() {
  const { health_consent_screen, ai_consent_screen, final_consent_confirm_screen } = useLocalSearchParams<{
    health_consent_screen?: string;
    ai_consent_screen?: string;
    final_consent_confirm_screen?: string;
  }>();
  let startScreen: ConsentScreenId = 'welcome';
  if (health_consent_screen === 'true') startScreen = 'storage';
  else if (ai_consent_screen === 'true') startScreen = 'ai';
  else if (final_consent_confirm_screen === 'true') startScreen = 'controls';
  return <ConsentScreen startScreen={startScreen} />;
}
