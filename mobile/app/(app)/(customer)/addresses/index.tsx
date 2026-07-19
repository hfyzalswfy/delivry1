import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { spacing } from '../../../../src/theme/spacing';
import { supabase } from '../../../../src/lib/supabase';
import { useAuthStore } from '../../../../src/store/auth-store';
import AddressList from '../../../../src/components/AddressList';
import type { CustomerAddresses } from '../../../../src/types/database';

export default function AddressListScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const [addresses, setAddresses] = useState<CustomerAddresses[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', profile?.id)
        .maybeSingle();
      if (customer) {
        setCustomerId(customer.id);
        const { data } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', customer.id)
          .order('is_default', { ascending: false });
        if (data) setAddresses(data as CustomerAddresses[]);
      }
      setLoading(false);
    };
    init();
  }, [profile?.id]);

  const handleEdit = (id: string) => {
    router.push(`/(app)/(customer)/addresses/${id}`);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('customer_addresses').delete().eq('id', id);
          setAddresses((prev) => prev.filter((a) => a.id !== id));
        },
      },
    ]);
  };

  const handleSetDefault = async (id: string) => {
    if (!customerId) return;
    await supabase.from('customer_addresses').update({ is_default: true }).eq('id', id);
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <AddressList
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          address_text: a.address_text,
          landmark: a.landmark,
          apartment: a.apartment,
          floor: a.floor,
          notes: a.notes,
          is_default: a.is_default,
        }))}
        loading={loading}
        onSelect={() => {}}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
        onAddNew={() => router.push('/(app)/(customer)/addresses/new')}
      />
    </SafeAreaView>
  );
}
