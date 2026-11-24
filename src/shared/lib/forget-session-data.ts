import type { QueryClient } from '@tanstack/react-query';

// Forgets everything that was shown for the previous profile or account: requests still running are stopped, and every cached response is dropped,
// so the next screen asks the server again. The saved onboarding and consent progress is cleared by the caller (it lives in the store).
export async function forgetSessionData(queryClient: QueryClient): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.removeQueries();
}
