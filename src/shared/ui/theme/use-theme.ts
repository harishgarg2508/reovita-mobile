import { Colors } from './tokens';
import { useResolvedScheme } from './theme-context';

// Colors for the scheme the user chose (or the system setting when they chose "system").
export function useTheme() {
  return Colors[useResolvedScheme()];
}
