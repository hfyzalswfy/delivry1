import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type ThemeMode = 'dark' | 'light' | 'system';

const THEME_KEY = '@full_delivery_theme';
const NOTIF_KEY = '@full_delivery_notifications';

export interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  orderUpdates: boolean;
  promotional: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  push: true,
  email: true,
  sms: false,
  orderUpdates: true,
  promotional: false,
};

interface SettingsState {
  theme: ThemeMode;
  loaded: boolean;
  resolvedTheme: 'dark' | 'light';
  notifications: NotificationPreferences;
  setTheme: (mode: ThemeMode) => Promise<void>;
  setNotification: (key: keyof NotificationPreferences, value: boolean) => Promise<void>;
  load: () => Promise<void>;
}

function resolveSystemTheme(): 'dark' | 'light' {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  return mode === 'system' ? resolveSystemTheme() : mode;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark',
  loaded: false,
  resolvedTheme: 'dark',
  notifications: { ...DEFAULT_NOTIFICATIONS },

  setTheme: async (mode: ThemeMode) => {
    const resolved = resolveTheme(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
    set({ theme: mode, resolvedTheme: resolved });
  },

  setNotification: async (key: keyof NotificationPreferences, value: boolean) => {
    const next = { ...get().notifications, [key]: value };
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    set({ notifications: next });
  },

  load: async () => {
    try {
      const savedTheme = (await AsyncStorage.getItem(THEME_KEY)) as ThemeMode | null;
      const mode = savedTheme || 'dark';
      const resolved = resolveTheme(mode);
      const savedNotif = await AsyncStorage.getItem(NOTIF_KEY);
      const notifications = savedNotif ? { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(savedNotif) } : { ...DEFAULT_NOTIFICATIONS };
      set({ theme: mode, resolvedTheme: resolved, notifications, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
