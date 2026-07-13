import { createContext, useContext, useMemo } from 'react';
import { useSettingsStore } from '../store/settings-store';
import { darkTheme, lightTheme } from './driver-theme';
import type { Theme } from './driver-theme';

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);

  const theme = useMemo(() => {
    return resolvedTheme === 'light' ? lightTheme : darkTheme;
  }, [resolvedTheme]);

  return <ThemeContext.Provider value={theme as Theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
