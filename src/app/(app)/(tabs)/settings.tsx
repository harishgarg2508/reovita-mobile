import { useState } from 'react';

import { useSignOut } from '@app-root/bootstrap';
import { ProfilePanel } from '@widgets/profile-panel';

// Profile tab: subject code as a QR code, copy and share, and log out.
export default function ProfileRoute() {
  const signOut = useSignOut();
  // Stays on while the sign-out request runs. The screen leaves once the session is cleared.
  const [signingOut, setSigningOut] = useState(false);
  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }
  return <ProfilePanel onSignOut={() => void onSignOut()} signingOut={signingOut} />;
}
