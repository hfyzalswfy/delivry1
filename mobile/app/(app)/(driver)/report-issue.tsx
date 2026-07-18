import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { reportDeliveryIssue, IssueType } from '../../../src/services/delivery-service';
import { DeliveryOrders } from '../../../src/types/database';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { ICONS } from '../../../src/constants/icons';

const ISSUE_TYPES: { key: IssueType; label: string }[] = [
  { key: 'customer_unavailable', label: 'Customer Unavailable' },
  { key: 'wrong_address', label: 'Wrong Address' },
  { key: 'customer_refused', label: 'Customer Refused Order' },
  { key: 'store_issue', label: 'Store Issue' },
  { key: 'vehicle_issue', label: 'Vehicle Issue' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'other', label: 'Other' },
];

export default function ReportIssueScreen() {
  const colors = useColors();

  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const profile = useAuthStore((s) => s.profile);

  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!profile) {
        if (!cancelled) { setAccessError('Authentication required'); setLoading(false); }
        return;
      }

      const { data: driver } = await supabase.from('drivers').select('id').eq('profile_id', profile.id).maybeSingle();
      if (!driver) {
        if (!cancelled) { setAccessError('Driver profile not found'); setLoading(false); }
        return;
      }
      if (!cancelled) setDriverId(driver.id);

      const { data: o } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (!o) {
        if (!cancelled) { setAccessError('Order not found'); setLoading(false); }
        return;
      }

      if (o.status !== 'driver_arrived_destination') {
        if (!cancelled) { setAccessError(`Issues can only be reported when status is "Arrived at Destination". Current: ${o.status.replace(/_/g, ' ')}`); setLoading(false); }
        return;
      }

      if (o.assigned_driver_id !== driver.id) {
        if (!cancelled) { setAccessError('You are not the assigned driver for this order'); setLoading(false); }
        return;
      }

      if (!cancelled) { setOrder(o); setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [orderId]);

  const handleSubmit = async () => {
    if (!order || !driverId || !selectedType) return;
    setSubmitting(true);

    try {
      const result = await reportDeliveryIssue(orderId, driverId, selectedType, description || undefined);

      setSubmitting(false);
      if (result.success) {
        Alert.alert('Report Submitted', 'Your issue has been recorded. You can return to the delivery flow.', [
          { text: 'OK', onPress: () => { if (router.canGoBack()) router.back(); else router.replace('/(app)/(driver)'); } },
        ]);
      } else {
        Alert.alert('Submission Failed', result.error);
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  const S = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm,
      borderWidth: 1, borderColor: colors.border,
    },
    cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: 6 },
    sub: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.xl },
    issueRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    issueRowSelected: {},
    radio: {
      width: 20, height: 20, borderRadius: borderRadius.full, borderWidth: 2, borderColor: colors.textSecondary,
      justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm,
    },
    radioSelected: { borderColor: colors.primary },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    issueLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    issueLabelSelected: { color: '#fff' },
    descLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: spacing.xl, marginBottom: spacing.sm },
    descInput: {
      backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
      padding: spacing.sm, fontSize: fontSize.sm, color: colors.text, minHeight: 80,
    },
    submitBtn: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
    submitBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.sm },
    cancelBtnText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    backBtn: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
    backBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Report Issue', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (accessError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Report Issue', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg }}>
          <MaterialIcons name={ICONS.warning} size={fontSize.xl} color={colors.warning} />
          <Text style={{ color: colors.text, fontSize: fontSize.md, textAlign: 'center', marginBottom: spacing.lg }}>{accessError}</Text>
          <TouchableOpacity style={S.backBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(app)/(driver)'); }}>
            <Text style={S.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Report Issue', headerTitleStyle: { fontWeight: fontWeight.bold } }} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        <View style={S.card}>
          <Text style={S.cardTitle}>What went wrong?</Text>
          <Text style={S.sub}>Select the issue type and provide details. This will not cancel the order.</Text>

          {ISSUE_TYPES.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[S.issueRow, selectedType === item.key && S.issueRowSelected]}
              onPress={() => setSelectedType(item.key)}
            >
              <View style={[S.radio, selectedType === item.key && S.radioSelected]}>
                {selectedType === item.key && <View style={S.radioInner} />}
              </View>
              <Text style={[S.issueLabel, selectedType === item.key && S.issueLabelSelected]}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <Text style={S.descLabel}>Description (optional)</Text>
          <TextInput
            style={S.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Provide additional details..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[S.submitBtn, !selectedType && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!selectedType || submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={S.submitBtnText}>Submit Report</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={S.cancelBtn} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(app)/(driver)'); }}>
          <Text style={S.cancelBtnText}>Cancel, Return to Delivery</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
