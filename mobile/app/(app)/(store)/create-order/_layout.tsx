import { Stack } from 'expo-router';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { fontWeight } from '../../../../src/theme/spacing';

export default function CreateOrderLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: fontWeight.semibold },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'New Order' }} />
      <Stack.Screen name="select-address" options={{ title: 'Select Address' }} />
      <Stack.Screen name="add-address" options={{ title: 'Add Address' }} />
      <Stack.Screen name="location-picker" options={{ title: 'Select Location', headerShown: false }} />
      <Stack.Screen name="order-details" options={{ title: 'Order Details' }} />
      <Stack.Screen name="review" options={{ title: 'Review Order' }} />
    </Stack>
  );
}
