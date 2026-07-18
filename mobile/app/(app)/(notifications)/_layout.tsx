import { Stack } from 'expo-router';
import { useColors } from '../../../src/theme/ThemeProvider';
import { fontWeight } from '../../../src/theme/spacing';

export default function NotificationsLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: fontWeight.semibold },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Notifications' }} />
    </Stack>
  );
}
