import { Stack } from 'expo-router';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { fontWeight } from '../../../../src/theme/spacing';

export default function AddressesLayout() {
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
      <Stack.Screen name="index" options={{ title: 'My Addresses' }} />
      <Stack.Screen name="new" options={{ title: 'Add Address' }} />
      <Stack.Screen name="[addressId]" options={{ title: 'Edit Address' }} />
      <Stack.Screen name="complete-address" options={{ title: 'Complete Your Address', headerShown: false }} />
    </Stack>
  );
}
