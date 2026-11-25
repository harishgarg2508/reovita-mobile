import type { QueryClient } from '@tanstack/react-query';

// The bottom tabs are remounted each time the profile changes, so each profile opens on the dashboard with no tab kept from the last one.
// The app layout reads this number and gives the tabs a new identity when it changes.
export const TABS_GENERATION_KEY = ['tabs', 'generation'] as const;

// Starts a fresh set of tabs. Called on every profile switch, before the dashboard is opened.
export function startFreshTabs(queryClient: QueryClient): void {
  queryClient.setQueryData<number>(TABS_GENERATION_KEY, (current) => (current ?? 0) + 1);
}
