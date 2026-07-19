import { useState, useEffect } from 'react';
import { View, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../../../src/theme/ThemeProvider';
import { useCreateOrderStore } from '../../../../src/store/create-order-store';
import OrderDetailForm from '../../../../src/components/OrderDetailForm';
import { supabase } from '../../../../src/lib/supabase';
import { useAuthStore } from '../../../../src/store/auth-store';
import type { OrderDetailValues } from '../../../../src/components/OrderDetailForm';

export default function OrderDetailsScreen() {
  const colors = useColors();
  const store = useCreateOrderStore();
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!store.deliveryLat || !store.deliveryLng) {
      router.replace('/(app)/(store)/create-order');
    }
  }, []);

  const handleSubmit = async (values: OrderDetailValues) => {
    store.setOrderDetails({
      shipmentTypeId: values.shipment_type_id,
      description: values.shipment_description,
      weightKg: values.shipment_weight_kg,
      fee: values.delivery_fee,
      paymentMethod: values.payment_method,
      priority: values.priority,
      notesForDriver: values.notes_for_driver,
      deliveryNotes: values.delivery_notes,
    });

    router.push('/(app)/(store)/create-order/review');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <OrderDetailForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        initialValues={{
          shipment_type_id: store.shipmentTypeId || undefined,
          shipment_description: store.shipmentDescription,
          shipment_weight_kg: store.shipmentWeightKg,
          delivery_fee: store.deliveryFee,
          payment_method: store.paymentMethod,
          priority: store.priority,
          notes_for_driver: store.notesForDriver,
          delivery_notes: store.deliveryNotes,
        }}
      />
    </SafeAreaView>
  );
}
