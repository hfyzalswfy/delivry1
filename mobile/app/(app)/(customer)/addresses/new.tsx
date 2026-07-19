import { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { supabase } from '../../../../src/lib/supabase';
import { useAuthStore } from '../../../../src/store/auth-store';
import AddressForm from '../../../../src/components/AddressForm';
import type { AddressFormValues } from '../../../../src/components/AddressForm';

export default function AddAddressScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values: AddressFormValues) => {
    setLoading(true);
    setError('');

    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile?.id)
        .maybeSingle();
      if (!customer) {
        setError('Customer profile not found');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('customer_addresses').insert({
        customer_id: customer.id,
        label: values.label,
        address_text: values.address_text,
        latitude: values.latitude,
        longitude: values.longitude,
        apartment: values.apartment || null,
        floor: values.floor || null,
        landmark: values.landmark || null,
        notes: values.notes || null,
        is_default: false,
      });

      if (insertError) {
        setError(insertError.message);
      } else {
        if (router.canGoBack()) router.back(); else router.replace('/(app)/(customer)/addresses');
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
        onCancel={() => { if (router.canGoBack()) router.back(); else router.replace('/(app)/(customer)/addresses'); }}
        loading={loading}
        error={error}
        submitLabel="Save Address"
      />
    </SafeAreaView>
  );
}
