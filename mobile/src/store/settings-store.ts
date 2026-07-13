import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type ThemeMode = 'dark' | 'light' | 'system';

const THEME_KEY = '@full_delivery_theme';

interface SettingsState {
  theme: ThemeMode;
  loaded: boolean;
  resolvedTheme: 'dark' | 'light';
  setTheme: (mode: ThemeMode) => Promise<void>;
  load: () => Promise<void>;
}

function resolveSystemTheme(): 'dark' | 'light' {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  return mode === 'system' ? resolveSystemTheme() : mode;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  loaded: false,
  resolvedTheme: 'dark',

  setTheme: async (mode: ThemeMode) => {
    const resolved = resolveTheme(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
    set({ theme: mode, resolvedTheme: resolved });
  },

  load: async () => {
    try {
      const saved = (await AsyncStorage.getItem(THEME_KEY)) as ThemeMode | null;
      const mode = saved || 'dark';
      const resolved = resolveTheme(mode);
      set({ theme: mode, resolvedTheme: resolved, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
