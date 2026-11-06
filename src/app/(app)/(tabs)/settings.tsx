import { useSignOut } from '@app-root/bootstrap';
import { ProfilePanel } from '@widgets/profile-panel';

// Profile tab: subject code as a QR code, copy and share, and log out.
export default function ProfileRoute() {
  const signOut = useSignOut();
  return <ProfilePanel onSignOut={() => void signOut()} />;
}
