import { ProfileScreen } from '@features/social';
import { useMyHandle } from '@entities/social';

// The Profile tab: the person's own page, inside the tabs so the dock stays.
export default function MyProfileTab() {
  const me = useMyHandle();
  return <ProfileScreen handle={me.data?.handle ?? ''} />;
}
