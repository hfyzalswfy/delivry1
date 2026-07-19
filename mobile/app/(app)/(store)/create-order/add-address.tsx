import { useState } from 'react';
import { View, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { supabase } from '../../../../src/lib/supabase';
import { useCreateOrderStore } from '../../../../src/store/create-order-store';
import AddressForm from '../../../../src/components/AddressForm';
import type { AddressFormValues } from '../../../../src/components/AddressForm';

export default function AddAddressScreen() {
  const colors = useColors();
  const store = useCreateOrderStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values: AddressFormValues) => {
    if (!store.customerId) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('add_customer_address', {
        p_customer_id: store.customerId,
        p_label: values.label || null,
        p_address_text: values.address_text,
        p_latitude: values.latitude,
        p_longitude: values.longitude,
        p_apartment: values.apartment || null,
        p_floor: values.floor || null,
        p_landmark: values.landmark || null,
        p_notes: values.notes || null,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      if (data) {
        store.setDelivery({
          address: data.address_text,
          lat: Number(data.latitude),
          lng: Number(data.longitude),
          apartment: data.apartment || undefined,
          floor: data.floor || undefined,
          landmark: data.landmark || undefined,
          notes: data.notes || undefined,
        });
        store.setNewlyAddedAddressId(data.id);
        if (router.canGoBack()) router.back(); else router.replace('/(app)/(store)');
      }
    } catch {
      setError('Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <AddressForm
        onSubmit={handleSubmit}
        onCancel={() => { if (router.canGoBack()) router.back(); else router.replace('/(app)/(store)'); }}
        loading={loading}
        error={error}
        submitLabel="Save & Continue"
      />
    </SafeAreaView>
  );
}
