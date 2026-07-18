import { Stack } from 'expo-router';
import { useColors } from '../../../src/theme/ThemeProvider';

export default function ChatLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="[orderId]" options={{ title: 'Chat' }} />
    </Stack>
  );
}
