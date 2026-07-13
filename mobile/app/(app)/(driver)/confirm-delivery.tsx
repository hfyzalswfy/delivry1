import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, Alert, Image } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { completeDelivery } from '../../../src/services/delivery-service';
import { DeliveryOrders, Stores } from '../../../src/types/database';

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
  callBg: '#064E3B',
  badgeGray: '#2A2D3A',
  pendingDot: '#3A3A3A',
  cardRadius: 12,
  inputBg: '#0E1212',
  otpInputBg: '#0E1212',
  warningBg: '#78350F',
  warningText: '#FBBF24',
};

function fmtCurr(v: number): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER`;
}

export default function ConfirmDeliveryScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const profile = useAuthStore((s) => s.profile);

  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [store, setStore] = useState<Stores | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [otpValue, setOtpValue] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const hasOtp = !!(order?.otp_code);
  const bonus = order?.reward_bonus ?? 0;
  const total = (order?.driver_earnings ?? 0) + bonus;

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

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
        if (!cancelled) { setAccessError(`This screen is only available when the order status is "Arrived at Destination". Current status: ${o.status.replace(/_/g, ' ')}`); setLoading(false); }
        return;
      }

      if (o.assigned_driver_id !== driver.id) {
        if (!cancelled) { setAccessError('You are not the assigned driver for this order'); setLoading(false); }
        return;
      }

      if (!cancelled) setOrder(o);

      const { data: s } = await supabase.from('stores').select('*').eq('id', o.store_id).single();
      if (s && !cancelled) setStore(s);

      if (cancelled) { setLoading(false); return; }

      channel = supabase.channel(`confirm-delivery-${orderId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `id=eq.${orderId}` }, (p) => {
          const updated = p.new as DeliveryOrders;
          setOrder(updated);
          if (updated.status === 'delivered') {
            router.replace(`/(app)/(driver)/delivery-summary?orderId=${orderId}`);
          }
        })
        .subscribe();

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId]);

  const handleCompleteDelivery = async () => {
    if (!order || !driverId) return;
    setCompleting(true);

    try {
      let method: 'otp' | 'photo' | 'signature' | 'none' = 'none';
      let data: string | undefined;

      if (hasOtp) {
        method = 'otp';
        data = otpValue;
      } else if (photoUri) {
        method = 'photo';
        data = photoUri;
      }

      const result = await completeDelivery(orderId, driverId, method, data);

      setCompleting(false);
      if (!result.success) {
        Alert.alert('Delivery Failed', result.error);
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setCompleting(false);
    }
  };

  const handleReportIssue = () => {
    router.push(`/(app)/(driver)/report-issue?orderId=${orderId}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Confirm Delivery', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={C.green} /></View>
      </SafeAreaView>
    );
  }

  if (accessError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Confirm Delivery', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
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

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Confirm Delivery', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: C.label, fontSize: 16 }}>Order not found</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
      <Stack.Screen options={{ title: 'Confirm Delivery', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Order Info */}
        <View style={S.card}>
          <Text style={S.orderNumber}>{order.order_number}</Text>
          <View style={S.locRow}>
            <Text style={{ fontSize: 16, color: C.green }}>{'\u{1F3EA}'}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={S.locLabel}>PICKUP</Text>
              <Text style={S.locTitle}>{store?.name || 'Store'}</Text>
            </View>
          </View>
          <View style={[S.locRow, { marginBottom: 0 }]}>
            <View style={S.dropPinSmall}><Text style={{ fontSize: 10, color: C.white }}>{'\u{1F4CD}'}</Text></View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={S.locLabel}>DROP-OFF</Text>
              <Text style={S.locTitle}>{order.delivery_address}</Text>
            </View>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Payment Summary</Text>
          <View style={S.payRow}>
            <Text style={S.lbl}>Delivery Fee</Text>
            <Text style={S.val}>{fmtCurr(order.delivery_fee)}</Text>
          </View>
          {bonus > 0 && (
            <View style={S.payRow}>
              <Text style={S.lbl}>Reward</Text>
              <Text style={S.val}>{fmtCurr(bonus)}</Text>
            </View>
          )}
          <View style={S.divider} />
          <View style={S.totalRow}>
            <Text style={S.totalLbl}>Total Earnings</Text>
            <Text style={S.totalVal}>{fmtCurr(total)}</Text>
          </View>
        </View>

        {/* Verification */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Verification</Text>
          <Text style={S.verifLabel}>Please verify delivery to complete the order.</Text>

          {/* OTP */}
          {hasOtp && (
            <View style={S.otpSection}>
              <Text style={S.otpLabel}>Enter OTP</Text>
              <TextInput
                style={S.otpInput}
                value={otpValue}
                onChangeText={setOtpValue}
                placeholder="000000"
                placeholderTextColor={C.label}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          )}

          {/* Photo */}
          {!hasOtp && !order.proof_signature_url && (
            <>
              {photoUri ? (
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Image source={{ uri: photoUri }} style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: 8 }} />
                  <TouchableOpacity onPress={() => setPhotoUri(null)}>
                    <Text style={{ color: C.label, fontSize: 14, fontWeight: '500' }}>Remove Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={S.photoBtn} onPress={async () => {
                  const permission = await ImagePicker.requestCameraPermissionsAsync();
                  if (!permission.granted) { Alert.alert('Permission Denied', 'Camera access is required to take delivery proof photos.'); return; }
                  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
                  if (!result.canceled && result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
                }}>
                  <Text style={{ fontSize: 24, color: C.label }}>{'\u{1F4F7}'}</Text>
                  <Text style={S.photoBtnText}>Take Delivery Photo</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Signature placeholder */}
          {!hasOtp && order.proof_signature_url && (
            <View style={S.signatureBox}>
              <Text style={{ fontSize: 24, color: C.label }}>{'\u{270D}\u{FE0F}'}</Text>
              <Text style={S.signatureLabel}>Customer Signature</Text>
              <Text style={S.signatureNote}>Signature captured online</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity style={S.completeBtn} onPress={handleCompleteDelivery} disabled={completing || (hasOtp && otpValue.length < 4)}>
          {completing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={S.completeBtnText}>Complete Delivery</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={S.reportBtn} onPress={handleReportIssue}>
          <Text style={{ fontSize: 16, color: C.label }}>{'\u{26A0}\u{FE0F}'}</Text>
          <Text style={S.reportBtnText}>Report a Problem</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg, borderRadius: C.cardRadius, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
  },
  cardTitle: { color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  cardNumber: { color: C.white, fontSize: 14, fontWeight: '600' },
  orderNumber: { color: C.white, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  locRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  locLabel: { color: C.label, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  locTitle: { color: C.white, fontSize: 14, fontWeight: '700' },
  dropPinSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.redDark, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lbl: { color: C.label, fontSize: 14 },
  val: { color: C.nearWhite, fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLbl: { color: C.white, fontSize: 15, fontWeight: '700' },
  totalVal: { color: C.green, fontSize: 16, fontWeight: '700' },
  verifLabel: { color: C.label, fontSize: 14, marginBottom: 16 },
  otpSection: { marginBottom: 16 },
  otpLabel: { color: C.nearWhite, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  otpInput: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    padding: 14, fontSize: 24, color: C.white, textAlign: 'center', letterSpacing: 8,
    fontWeight: '700',
  },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.inputBg, borderRadius: C.cardRadius, borderWidth: 1, borderColor: C.border,
    borderStyle: 'dashed', paddingVertical: 24, gap: 8,
  },
  photoBtnText: { color: C.label, fontSize: 14, fontWeight: '500' },
  signatureBox: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.inputBg, borderRadius: C.cardRadius, borderWidth: 1, borderColor: C.border,
    borderStyle: 'dashed', paddingVertical: 24, gap: 8,
  },
  signatureLabel: { color: C.nearWhite, fontSize: 14, fontWeight: '600' },
  signatureNote: { color: C.label, fontSize: 12 },
  completeBtn: { backgroundColor: C.greenDark, borderRadius: C.cardRadius, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  completeBtnText: { color: C.greenLight, fontSize: 16, fontWeight: '700' },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, marginTop: 12, gap: 8,
  },
  reportBtnText: { color: C.label, fontSize: 15, fontWeight: '600' },
  backBtn: { backgroundColor: C.greenDark, borderRadius: C.cardRadius, paddingVertical: 12, paddingHorizontal: 32 },
  backBtnText: { color: C.greenLight, fontSize: 16, fontWeight: '700' },
});