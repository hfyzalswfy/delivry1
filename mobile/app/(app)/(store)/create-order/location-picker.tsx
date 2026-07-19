import { SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { useCreateOrderStore } from '../../../../src/store/create-order-store';
import LocationPickerScreen from '../../../../src/components/LocationPickerScreen';
import type { LocationPickerResult } from '../../../../src/components/LocationPickerScreen';

export default function LocationPickerRoute() {
  const colors = useColors();
  const store = useCreateOrderStore();

  const handleConfirm = (result: LocationPickerResult) => {
    store.setDelivery({
      address: result.addressText,
      lat: result.latitude,
      lng: result.longitude,
      landmark: result.landmark,
      notes: result.notes,
    });
    router.push('/(app)/(store)/create-order/order-details');
  };

  const handleCancel = () => {
    if (router.canGoBack()) router.back(); else router.replace('/(app)/(store)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <LocationPickerScreen
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        title="Delivery Location"
      />
    </SafeAreaView>
  );
}
