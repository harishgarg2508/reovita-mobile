import { useThemeTransition } from '@app-root/providers/theme-transition';
import { useAppDispatch } from '@app-root/store';
import { themeModeSet } from '@entities/preferences';
import { useResolvedScheme } from '@shared/ui/theme';
import { DashboardHome } from '@widgets/dashboard-home';

// Home tab. The theme toggle is wired here, because the store lives in the app layer.
export default function DashboardRoute() {
  const dispatch = useAppDispatch();
  const scheme = useResolvedScheme();
  const playThemeChange = useThemeTransition();
  return (
    <DashboardHome
      onToggleTheme={(origin) => {
        const next = scheme === 'dark' ? 'light' : 'dark';
        playThemeChange(next, origin, () => dispatch(themeModeSet(next)));
      }}
    />
  );
}
