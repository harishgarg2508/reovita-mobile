import { useAppDispatch } from '@app-root/store';
import { themeModeSet } from '@entities/preferences';
import { useResolvedScheme } from '@shared/ui/theme';
import { DashboardHome } from '@widgets/dashboard-home';

// Home tab. The theme toggle is wired here, because the store lives in the app layer.
export default function DashboardRoute() {
  const dispatch = useAppDispatch();
  const scheme = useResolvedScheme();
  return <DashboardHome onToggleTheme={() => dispatch(themeModeSet(scheme === 'dark' ? 'light' : 'dark'))} />;
}
