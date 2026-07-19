import { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { supabase } from '../../../../src/lib/supabase';
import AddressForm from '../../../../src/components/AddressForm';
import type { AddressFormValues } from '../../../../src/components/AddressForm';

export default function EditAddressScreen() {
  const colors = useColors();
  const { addressId } = useLocalSearchParams<{ addressId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [initialValues, setInitialValues] = useState<Partial<AddressFormValues> | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('id', addressId)
        .single();
      if (data) {
        setInitialValues({
          label: data.label || '',
          address_text: data.address_text,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          landmark: data.landmark || '',
          apartment: data.apartment || '',
          floor: data.floor || '',
          notes: data.notes || '',
        });
      }
      setLoading(false);
    };
    load();
  }, [addressId]);

  const handleSubmit = async (values: AddressFormValues) => {
    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('customer_addresses')
        .update({
          label: values.label,
          address_text: values.address_text,
          latitude: values.latitude,
          longitude: values.longitude,
          apartment: values.apartment || null,
          floor: values.floor || null,
          landmark: values.landmark || null,
          notes: values.notes || null,
        })
        .eq('id', addressId);

      if (updateError) {
        setError(updateError.message);
      } else {
        if (router.canGoBack()) router.back(); else router.replace('/(app)/(customer)/addresses');
      }
    } catch {
      setError('Failed to update address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Address', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('customer_addresses').delete().eq('id', addressId);
          router.replace('/(app)/(customer)/addresses');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ActivityIndicator size="large" style={{ flex: 1 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <AddressForm
        initialValues={initialValues || undefined}
        onSubmit={handleSubmit}
        onCancel={() => { if (router.canGoBack()) router.back(); else router.replace('/(app)/(customer)/addresses'); }}
        onPickOnMap={() => {}}
        loading={saving}
        error={error}
        submitLabel="Update Address"
      />
    </SafeAreaView>
  );
}
