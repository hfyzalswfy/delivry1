import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { DeliveryOrders, Stores } from '../../../src/types/database';
import { calculateDistance } from '../../../src/lib/geo';

const C = {
  screenBg: '#0E1212',
  cardBg: '#1A1D28',
  white: '#FFFFFF',
  nearWhite: '#F3F4F6',
  label: '#6B7280',
  green: '#22C55E',
  greenDark: '#064E3B',
  greenLight: '#4ADE80',
  border: '#2A2D3A',
  divider: '#2A2D3A',
  cardRadius: 12,
  disabledBg: '#2A2D3A',
  disabledText: '#6B7280',
};

function fmtCurr(v: number): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER`;
}

function fmtDist(km: number): string {
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
}

export default function ConfirmAcceptanceScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const profile = useAuthStore((s) => s.profile);

  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [store, setStore] = useState<Stores | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: o } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (!o || cancelled) { if (!cancelled) setLoading(false); return; }
      if (!cancelled) setOrder(o);

      if (!cancelled && o.status !== 'pending') {
        setRedirectTarget(`/(app)/(driver)/${orderId}`);
        setLoading(false);
        return;
      }

      const { data: s } = await supabase.from('stores').select('*').eq('id', o.store_id).single();
      if (s && !cancelled) setStore(s);

      const { data: d } = await supabase.from('drivers').select('*').eq('profile_id', profile?.id).single();
      if (d && !cancelled) {
        setDriverId(d.id);
        setDriverLat(d.current_latitude);
        setDriverLng(d.current_longitude);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [orderId]);

  const distKm = useMemo(() => {
    if (!order || driverLat == null || driverLng == null) return null;
    return calculateDistance(driverLat, driverLng, order.pickup_latitude, order.pickup_longitude);
  }, [order, driverLat, driverLng]);

  const bonus = order?.reward_bonus ?? 0;
  const total = (order?.driver_earnings ?? 0) + bonus;

  const handleCancel = () => {
    router.back();
  };

  const handleConfirm = async () => {
    if (!order || !driverId || !profile) return;
    setAccepting(true);

    try {
      const { data, error } = await supabase.rpc('accept_order', {
        p_order_id: orderId,
        p_driver_id: driverId,
      });

      if (error) {
        Alert.alert('Error', error.message);
        setAccepting(false);
        return;
      }

      const result = data as { success: boolean; code?: string; error?: string };
      if (!result.success) {
        Alert.alert('Cannot Accept', result.error || 'Order may have been taken by another driver.');
        setAccepting(false);
        return;
      }

      setAccepting(false);
      router.replace(`/(app)/(driver)/${orderId}`);
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Confirm Acceptance', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Confirm Acceptance', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: C.label, fontSize: 16 }}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
      <Stack.Screen options={{ title: 'Confirm Acceptance', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* ────────── ORDER SUMMARY CARD ────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Order Summary</Text>

          <View style={S.row}>
            <Text style={S.lbl}>Order ID</Text>
            <Text style={S.val}>{order.order_number}</Text>
          </View>

          <View style={S.row}>
            <Text style={S.lbl}>Pickup</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={S.val}>{store?.name || 'Store'}</Text>
              <Text style={S.sml}>{order.pickup_address}</Text>
            </View>
          </View>

          <View style={[S.row, { borderBottomWidth: 0 }]}>
            <Text style={S.lbl}>Drop-off</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={S.val}>{order.delivery_address}</Text>
            </View>
          </View>

          {distKm != null && (
            <>
              <View style={S.divider} />
              <View style={S.distRow}>
                <Text style={{ fontSize: 14 }}>{'\u{1F4CD}'}</Text>
                <Text style={S.distText}>{fmtDist(distKm)} from your location</Text>
              </View>
            </>
          )}
        </View>

        {/* ────────── PAYMENT SUMMARY CARD ────────── */}
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
            <Text style={S.totalLbl}>Estimated Total</Text>
            <Text style={S.totalVal}>{fmtCurr(total)}</Text>
          </View>
        </View>

        {/* ────────── CHECKBOX ────────── */}
        <TouchableOpacity style={S.chkRow} onPress={() => setConfirmed(!confirmed)} activeOpacity={0.7}>
          <View style={[S.chkBox, confirmed && S.chkBoxChecked]}>
            {confirmed && <Text style={S.chkMark}>✓</Text>}
          </View>
          <Text style={S.chkLabel}>I am available to complete this delivery</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ────────── FOOTER ────────── */}
      <View style={S.footer}>
        <TouchableOpacity
          style={[S.confirmBtn, !confirmed && S.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!confirmed || accepting}
        >
          {accepting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[S.confirmBtnText, !confirmed && S.confirmBtnTextDisabled]}>
              Confirm & Accept Order
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={S.cancelBtn} disabled={accepting}>
          <Text style={S.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg,
    borderRadius: C.cardRadius,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  lbl: { color: C.label, fontSize: 14, width: 80 },
  val: { color: C.nearWhite, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  sml: { color: C.label, fontSize: 12, marginTop: 2, textAlign: 'right' },

  divider: { height: 1, backgroundColor: C.divider, marginVertical: 12 },

  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distText: { color: C.nearWhite, fontSize: 13, fontWeight: '500' },

  // Payment
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLbl: { color: C.white, fontSize: 15, fontWeight: '700' },
  totalVal: { color: C.green, fontSize: 16, fontWeight: '700' },

  // Checkbox
  chkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  chkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.label,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chkBoxChecked: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  chkMark: { color: C.white, fontSize: 14, fontWeight: '700' },
  chkLabel: { color: C.white, fontSize: 15, fontWeight: '500', flex: 1 },

  // Footer
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    backgroundColor: C.screenBg,
  },
  confirmBtn: {
    backgroundColor: C.greenDark,
    borderRadius: C.cardRadius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: C.disabledBg },
  confirmBtnText: { color: C.greenLight, fontSize: 16, fontWeight: '700' },
  confirmBtnTextDisabled: { color: C.disabledText },

  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: { color: C.label, fontSize: 16, fontWeight: '600' },
});
