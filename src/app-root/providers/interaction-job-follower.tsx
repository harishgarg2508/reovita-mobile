import { useInteractionJobFollower } from '@/entities/interaction-finding';

// Renders nothing. It keeps following the interaction check queued by the step 2 save while the user moves on.
export function InteractionJobFollower() {
  useInteractionJobFollower();
  return null;
}
