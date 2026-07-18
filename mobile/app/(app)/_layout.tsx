import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import { useSettingsStore } from '../../src/store/settings-store';
import { useColors } from '../../src/theme/ThemeProvider';
import { usePushToken } from '../../src/hooks/use-push-token';

export default function AppLayout() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const loadSettings = useSettingsStore((s) => s.load);

  usePushToken();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(store)" options={{ headerShown: false }} />
      <Stack.Screen name="(driver)" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)" options={{ headerShown: false }} />
      <Stack.Screen name="(chat)" options={{ headerShown: false }} />
      <Stack.Screen name="(notifications)" options={{ headerShown: false }} />
    </Stack>
  );
}
