import { useStepTracker } from '../model/use-step-tracking';

// Renders nothing; keeps step counting running while the person is signed in and has turned it on.
export function StepTracker() {
  useStepTracker();
  return null;
}
