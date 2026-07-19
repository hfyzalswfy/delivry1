import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useColors } from '../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../theme/spacing';
import { ICONS } from '../constants/icons';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import type { PaymentMethod, OrderPriority } from '../types/database';

export interface OrderDetailValues {
  shipment_type_id: string | null;
  shipment_description: string;
  shipment_weight_kg: string;
  delivery_fee: string;
  payment_method: PaymentMethod;
  priority: OrderPriority;
  notes_for_driver: string;
  delivery_notes: string;
}

interface OrderDetailFormProps {
  onSubmit: (values: OrderDetailValues) => void;
  initialValues?: Partial<OrderDetailValues>;
  loading?: boolean;
  error?: string;
}

export default function OrderDetailForm({
  onSubmit, initialValues, loading: externalLoading, error: externalError,
}: OrderDetailFormProps) {
  const colors = useColors();
  const [shipmentTypes, setShipmentTypes] = useState<{ id: string; name: string }[]>([]);
  const [shipmentTypeId, setShipmentTypeId] = useState<string | null>(initialValues?.shipment_type_id || null);
  const [description, setDescription] = useState(initialValues?.shipment_description || '');
  const [weightKg, setWeightKg] = useState(initialValues?.shipment_weight_kg || '');
  const [deliveryFee, setDeliveryFee] = useState(initialValues?.delivery_fee || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialValues?.payment_method || 'cash');
  const [priority, setPriority] = useState<OrderPriority>(initialValues?.priority || 'normal');
  const [notesForDriver, setNotesForDriver] = useState(initialValues?.notes_for_driver || '');
  const [deliveryNotes, setDeliveryNotes] = useState(initialValues?.delivery_notes || '');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    supabase.from('shipment_types').select('id, name').eq('is_active', true).then(({ data }) => {
      if (data) setShipmentTypes(data);
    });
  }, []);

  const PAYMENT_OPTIONS: PaymentMethod[] = ['cash', 'card', 'wallet'];
  const PRIORITY_OPTIONS: OrderPriority[] = ['normal', 'express'];

  const handleSubmit = () => {
    setFormError('');
    if (!deliveryFee || isNaN(parseFloat(deliveryFee)) || parseFloat(deliveryFee) <= 0) {
      setFormError('Please enter a valid delivery fee');
      return;
    }
    onSubmit({
      shipment_type_id: shipmentTypeId,
      shipment_description: description,
      shipment_weight_kg: weightKg,
      delivery_fee: deliveryFee,
      payment_method: paymentMethod,
      priority,
      notes_for_driver: notesForDriver,
      delivery_notes: deliveryNotes,
    });
  };

  const displayError = formError || externalError;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Shipment Type</Text>
      <View style={styles.chipRow}>
        {shipmentTypes.map((st) => (
          <TouchableOpacity
            key={st.id}
            style={[
              styles.chip,
              { borderColor: shipmentTypeId === st.id ? colors.primary : colors.border, backgroundColor: shipmentTypeId === st.id ? colors.primaryLight : colors.surface },
            ]}
            onPress={() => setShipmentTypeId(st.id)}
          >
            <Text style={[styles.chipText, { color: shipmentTypeId === st.id ? colors.primaryDark : colors.text }]}>{st.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={description}
        onChangeText={setDescription}
        placeholder="What's being delivered?"
        placeholderTextColor={colors.textTertiary}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.label, { color: colors.text }]}>Weight (kg)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={weightKg}
        onChangeText={setWeightKg}
        placeholder="0.0"
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Pricing</Text>
      <Text style={[styles.label, { color: colors.text }]}>Delivery Fee *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={deliveryFee}
        onChangeText={setDeliveryFee}
        placeholder="0.00"
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
      />

      <Text style={[styles.label, { color: colors.text }]}>Payment Method</Text>
      <View style={styles.chipRow}>
        {PAYMENT_OPTIONS.map((pm) => (
          <TouchableOpacity
            key={pm}
            style={[
              styles.chip,
              { borderColor: paymentMethod === pm ? colors.primary : colors.border, backgroundColor: paymentMethod === pm ? colors.primaryLight : colors.surface },
            ]}
            onPress={() => setPaymentMethod(pm)}
          >
            <MaterialIcons
              name={paymentMethod === pm ? ICONS.radioChecked : ICONS.radioUnchecked}
              size={fontSize.sm}
              color={paymentMethod === pm ? colors.primary : colors.textTertiary}
            />
            <Text style={[styles.chipText, { color: paymentMethod === pm ? colors.primaryDark : colors.text }]}>
              {pm.charAt(0).toUpperCase() + pm.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Priority</Text>
      <View style={styles.chipRow}>
        {PRIORITY_OPTIONS.map((pr) => (
          <TouchableOpacity
            key={pr}
            style={[
              styles.chip,
              { borderColor: priority === pr ? colors.primary : colors.border, backgroundColor: priority === pr ? colors.primaryLight : colors.surface },
            ]}
            onPress={() => setPriority(pr)}
          >
            <Text style={[styles.chipText, { color: priority === pr ? colors.primaryDark : colors.text }]}>
              {pr.charAt(0).toUpperCase() + pr.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Delivery Notes (visible to driver & customer)</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={deliveryNotes}
        onChangeText={setDeliveryNotes}
        placeholder="Leave at reception, call before arrival..."
        placeholderTextColor={colors.textTertiary}
        multiline
        numberOfLines={2}
      />

      <Text style={[styles.label, { color: colors.text }]}>Notes for Driver</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={notesForDriver}
        onChangeText={setNotesForDriver}
        placeholder="Handle with care, fragile..."
        placeholderTextColor={colors.textTertiary}
        multiline
        numberOfLines={2}
      />

      {displayError ? (
        <Text style={[styles.error, { color: colors.danger }]}>{displayError}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }, externalLoading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={externalLoading}
      >
        {externalLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Continue</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  error: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  submitBtn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
