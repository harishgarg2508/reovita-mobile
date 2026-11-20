import { useMyHandle, useSocialNotificationStream } from '@entities/social';

// Opens the live stream of social notifications once, for the whole social section. The social layout renders this, so moving
// between Home, Search, Kudos and Profile keeps the same connection instead of closing and opening one on every screen.
export function SocialStream() {
  const me = useMyHandle();
  useSocialNotificationStream(me.joined);
  return null;
}
