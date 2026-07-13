import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
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
  border: '#2A2D3A',
  divider: '#2A2D3A',
  badgeGray: '#2A2D3A',
  cardRadius: 12,
};

function fmtCurr(v: number): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER`;
}

function fmtPay(m: string): string {
  const map: Record<string, string> = { cash: 'Cash on Delivery', card: 'Card', wallet: 'Wallet' };
  return map[m] || m;
}

export default function DeliverySummaryScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const profile = useAuthStore((s) => s.profile);

  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [store, setStore] = useState<Stores | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!profile) {
        if (!cancelled) { setAccessError('Authentication required'); setLoading(false); }
        return;
      }

      const { data: driver } = await supabase.from('drivers').select('id').eq('profile_id', profile.id).maybeSingle();
      const driverId = driver?.id;

      const { data: o } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (!o) {
        if (!cancelled) { setAccessError('Order not found'); setLoading(false); }
        return;
      }

      if (o.status !== 'delivered') {
        if (!cancelled) { setAccessError(`This screen is only available after delivery is completed. Current status: ${o.status.replace(/_/g, ' ')}`); setLoading(false); }
        return;
      }

      if (driverId && o.assigned_driver_id !== driverId) {
        if (!cancelled) { setAccessError('You are not the assigned driver for this order'); setLoading(false); }
        return;
      }

      if (!cancelled) setOrder(o);

      const { data: s } = await supabase.from('stores').select('*').eq('id', o.store_id).single();
      if (s && !cancelled) setStore(s);

      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [orderId]);

  const handleGoHome = () => {
    router.replace('/(app)/(driver)');
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Delivery Summary', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={C.green} /></View>
      </SafeAreaView>
    );
  }

  if (accessError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Delivery Summary', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 20, marginBottom: 12 }}>{'\u{26A0}\u{FE0F}'}</Text>
          <Text style={{ color: C.nearWhite, fontSize: 16, textAlign: 'center', marginBottom: 24 }}>{accessError}</Text>
          <TouchableOpacity style={S.backBtn} onPress={handleGoHome}>
            <Text style={S.backBtnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Delivery Summary', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: C.label, fontSize: 16 }}>Order not found</Text></View>
      </SafeAreaView>
    );
  }

  const bonus = order.reward_bonus ?? 0;
  const total = order.driver_earnings + bonus;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
      <Stack.Screen options={{ title: 'Delivery Summary', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Success Banner */}
        <View style={S.banner}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>{'\u{2705}'}</Text>
          <Text style={S.bannerTitle}>Delivery Complete!</Text>
          <Text style={S.bannerSub}>Order {order.order_number} has been delivered successfully.</Text>
        </View>

        {/* Route */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Delivery Route</Text>
          <View style={S.locRow}>
            <Text style={{ fontSize: 16, color: C.green }}>{'\u{1F3EA}'}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={S.locLabel}>FROM</Text>
              <Text style={S.locTitle}>{store?.name || 'Store'}</Text>
            </View>
          </View>
          <View style={[S.locRow, { marginBottom: 0 }]}>
            <View style={S.dropPinSmall}><Text style={{ fontSize: 10, color: C.white }}>{'\u{1F4CD}'}</Text></View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={S.locLabel}>TO</Text>
              <Text style={S.locTitle}>{order.delivery_address}</Text>
            </View>
          </View>
        </View>

        {/* Customer */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Customer</Text>
          <Text style={S.custName}>{order.customer_name}</Text>
          <Text style={S.custPhone}>{order.customer_phone}</Text>
        </View>

        {/* Earnings Breakdown */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Earnings Breakdown</Text>
          <View style={S.payRow}>
            <Text style={S.lbl}>Delivery Fee</Text>
            <Text style={S.val}>{fmtCurr(order.delivery_fee)}</Text>
          </View>
          <View style={S.payRow}>
            <Text style={S.lbl}>Platform Commission</Text>
            <Text style={S.val}>{fmtCurr(order.platform_commission)}</Text>
          </View>
          {bonus > 0 && (
            <View style={S.payRow}>
              <Text style={S.lbl}>Reward Bonus</Text>
              <Text style={S.val}>{fmtCurr(bonus)}</Text>
            </View>
          )}
          <View style={S.divider} />
          <View style={S.totalRow}>
            <Text style={S.totalLbl}>Driver Earnings</Text>
            <Text style={S.totalVal}>{fmtCurr(total)}</Text>
          </View>
          <View style={S.payMethodBadge}>
            <Text style={{ fontSize: 18, color: C.label }}>{'\u{1F4B5}'}</Text>
            <Text style={S.payMethodText}>{fmtPay(order.payment_method)}</Text>
          </View>
        </View>

        {/* Home Button */}
        <TouchableOpacity style={S.homeBtn} onPress={handleGoHome}>
          <Text style={S.homeBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  banner: {
    alignItems: 'center', paddingVertical: 28, marginBottom: 12,
  },
  bannerTitle: { color: C.white, fontSize: 22, fontWeight: '700', marginBottom: 6 },
  bannerSub: { color: C.label, fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: C.cardBg, borderRadius: C.cardRadius, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
  },
  cardTitle: { color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  locRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  locLabel: { color: C.label, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  locTitle: { color: C.white, fontSize: 14, fontWeight: '700' },
  dropPinSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#7F1D1D', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  custName: { color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  custPhone: { color: C.label, fontSize: 14 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lbl: { color: C.label, fontSize: 14 },
  val: { color: C.nearWhite, fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLbl: { color: C.white, fontSize: 15, fontWeight: '700' },
  totalVal: { color: C.green, fontSize: 16, fontWeight: '700' },
  payMethodBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.badgeGray,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginTop: 12, gap: 8,
  },
  payMethodText: { color: C.nearWhite, fontSize: 14, fontWeight: '500' },
  homeBtn: { backgroundColor: C.greenDark, borderRadius: C.cardRadius, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  homeBtnText: { color: C.greenLight, fontSize: 16, fontWeight: '700' },
  backBtn: { backgroundColor: C.greenDark, borderRadius: C.cardRadius, paddingVertical: 12, paddingHorizontal: 32 },
  backBtnText: { color: C.greenLight, fontSize: 16, fontWeight: '700' },
});