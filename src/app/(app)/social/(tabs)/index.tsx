import { useThemeTransition } from '@app-root/providers/theme-transition';
import { useAppDispatch } from '@app-root/store';
import { themeModeSet } from '@entities/preferences';
import { SocialScreen } from '@features/social';
import { ThemeToggle, useResolvedScheme } from '@shared/ui/theme';

// The Social page. The theme toggle is wired here, because the store and the theme change live in the app layer.
export default function SocialRoute() {
  const dispatch = useAppDispatch();
  const scheme = useResolvedScheme();
  const playThemeChange = useThemeTransition();
  return (
    <SocialScreen
      themeToggle={
        <ThemeToggle
          scheme={scheme}
          onToggle={(origin) => {
            const next = scheme === 'dark' ? 'light' : 'dark';
            playThemeChange(next, origin, () => dispatch(themeModeSet(next)));
          }}
        />
      }
    />
  );
}
