import { Stack } from 'expo-router';
import { colors } from '../../../src/theme/colors';

export default function ChatLayout() {
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
