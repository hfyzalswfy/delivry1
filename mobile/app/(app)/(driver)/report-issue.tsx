import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { reportDeliveryIssue, IssueType } from '../../../src/services/delivery-service';
import { DeliveryOrders } from '../../../src/types/database';

const C = {
  screenBg: '#0E1212',
  cardBg: '#1A1D28',
  white: '#FFFFFF',
  nearWhite: '#F3F4F6',
  label: '#6B7280',
  green: '#22C55E',
  greenDark: '#064E3B',
  greenLight: '#4ADE80',
  redDark: '#7F1D1D',
  border: '#2A2D3A',
  divider: '#2A2D3A',
  cardRadius: 12,
};

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
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Submission Failed', result.error);
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Report Issue', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={C.green} /></View>
      </SafeAreaView>
    );
  }

  if (accessError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Report Issue', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 20, marginBottom: 12 }}>{'\u{26A0}\u{FE0F}'}</Text>
          <Text style={{ color: C.nearWhite, fontSize: 16, textAlign: 'center', marginBottom: 24 }}>{accessError}</Text>
          <TouchableOpacity style={S.backBtn} onPress={() => router.back()}>
            <Text style={S.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
      <Stack.Screen options={{ title: 'Report Issue', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
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
              <Text style={[S.issueLabel, selectedType === item.key && styles.issueLabelSelected]}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <Text style={S.descLabel}>Description (optional)</Text>
          <TextInput
            style={S.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Provide additional details..."
            placeholderTextColor={C.label}
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

        <TouchableOpacity style={S.cancelBtn} onPress={() => router.back()}>
          <Text style={S.cancelBtnText}>Cancel, Return to Delivery</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  issueLabelSelected: { color: '#fff' as string },
});

const S = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg, borderRadius: C.cardRadius, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
  },
  cardTitle: { color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  sub: { color: C.label, fontSize: 13, marginBottom: 20 },
  issueRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  issueRowSelected: {},
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.label,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  radioSelected: { borderColor: C.green },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.green },
  issueLabel: { color: C.nearWhite, fontSize: 15, fontWeight: '500' },
  descLabel: { color: C.white, fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  descInput: {
    backgroundColor: '#0E1212', borderWidth: 1, borderColor: C.border, borderRadius: 10,
    padding: 14, fontSize: 14, color: C.white, minHeight: 80,
  },
  submitBtn: { backgroundColor: C.greenDark, borderRadius: C.cardRadius, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: C.greenLight, fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  cancelBtnText: { color: C.label, fontSize: 15, fontWeight: '600' },
  backBtn: { backgroundColor: C.greenDark, borderRadius: C.cardRadius, paddingVertical: 12, paddingHorizontal: 32 },
  backBtnText: { color: C.greenLight, fontSize: 16, fontWeight: '700' },
});