import { useState } from 'react';

import { pickPicture } from './pick-picture';
import { useSetPicture } from './use-social-actions';

// The profile picture of the social account: choose a new one from the phone, or take it away. Used from places outside the social screens (the
// dashboard header), so they share the same upload and the same clean-up as the profile page.
export function useChangeAvatar(handle: string | null) {
  const picture = useSetPicture('avatar');
  const [error, setError] = useState<string | null>(null);

  async function change(): Promise<void> {
    if (!handle) return;
    setError(null);
    try {
      const picked = await pickPicture();
      if (picked) picture.set.mutate({ handle, photo: picked });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function remove(): void {
    if (!handle) return;
    setError(null);
    picture.remove.mutate(handle);
  }

  return {
    change,
    remove,
    error,
    busy: picture.set.isPending || picture.remove.isPending,
  };
}
