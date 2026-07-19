import { Stack } from 'expo-router';
import { useColors } from '../../src/theme/ThemeProvider';
import { usePushToken } from '../../src/hooks/use-push-token';

export default function AppLayout() {
  const colors = useColors();

  usePushToken();

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
