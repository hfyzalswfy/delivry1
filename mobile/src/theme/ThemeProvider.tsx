import { createContext, useContext, useMemo } from 'react';
import { useSettingsStore } from '../store/settings-store';
import { colors, darkColors } from './colors';
import { darkTheme, lightTheme } from './driver-theme';
import type { ColorScheme } from './colors';
import type { ThemeValues } from './driver-theme';
import { spacing, fontSize, borderRadius, fontWeight, lineHeight, shadow } from './index';

export interface FullTheme {
  colors: ColorScheme;
  spacing: typeof spacing;
  fontSize: typeof fontSize;
  borderRadius: typeof borderRadius;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  shadow: typeof shadow;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeValues>(darkTheme);
const FullThemeContext = createContext<FullTheme>({
  colors,
  spacing,
  fontSize,
  borderRadius,
  fontWeight,
  lineHeight,
  shadow,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);
  const isDark = resolvedTheme === 'dark';

  const theme = useMemo<ThemeValues>(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const fullTheme = useMemo<FullTheme>(() => ({
    colors: isDark ? darkColors : colors,
    spacing,
    fontSize,
    borderRadius,
    fontWeight,
    lineHeight,
    shadow,
    isDark,
  }), [isDark]);

  return (
    <ThemeContext.Provider value={theme}>
      <FullThemeContext.Provider value={fullTheme}>
        {children}
      </FullThemeContext.Provider>
    </ThemeContext.Provider>
  );
}

/** Returns the old driver-theme style ThemeValues (backward compat) */
export function useTheme(): ThemeValues {
  return useContext(ThemeContext);
}

/** Returns the new unified FullTheme with colors, spacing, etc. */
export function useFullTheme(): FullTheme {
  return useContext(FullThemeContext);
}

/** Returns current color scheme (light or dark) */
export function useColors(): ColorScheme {
  return useContext(FullThemeContext).colors;
}
