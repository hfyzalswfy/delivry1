import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Linking, Alert } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { useDriverLocation } from '../../../src/hooks/use-driver-location';
import { DeliveryOrders, Stores } from '../../../src/types/database';
import { calculateDistance, calculateETA } from '../../../src/lib/geo';

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
  cardRadius: 12,
};

const BADGE: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: '#1E3A5F', text: '#60A5FA' },
  published: { label: 'Available', bg: '#064E3B', text: '#4ADE80' },
  driver_accepted: { label: 'Accepted', bg: '#064E3B', text: '#4ADE80' },
  driver_arrived_store: { label: 'At Store', bg: '#713F12', text: '#FBBF24' },
  picked_up: { label: 'Picked Up', bg: '#1E3A5F', text: '#60A5FA' },
  on_the_way: { label: 'On The Way', bg: '#064E3B', text: '#4ADE80' },
  driver_arrived_destination: { label: 'Arrived', bg: '#713F12', text: '#FBBF24' },
  delivered: { label: 'Delivered', bg: '#065F46', text: '#6EE7B7' },
  cancelled: { label: 'Cancelled', bg: '#7F1D1D', text: '#FCA5A5' },
};

function fmtDate(s: string): string {
  const d = new Date(s);
  const n = new Date();
  const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (d.toDateString() === n.toDateString()) return `Today, ${t}`;
  const y = new Date(n); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday, ${t}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${t}`;
}

function fmtCurr(v: number): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER`;
}

function fmtPay(m: string): string {
  const map: Record<string, string> = { cash: 'Cash on Delivery', card: 'Card', wallet: 'Wallet' };
  return map[m] || m;
}

function payIcon(m: string): string {
  const map: Record<string, string> = { cash: '\u{1F4B5}', card: '\u{1F4B3}', wallet: '\u{1F45B}' };
  return map[m] || '\u{1F4B5}';
}

function fmtDist(km: number): string {
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
}

function fmtETA(min: number): string {
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`;
}

export default function DriverOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const profile = useAuthStore((s) => s.profile);

  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [store, setStore] = useState<Stores | null>(null);
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const shouldTrack = !!(order && driverId && order.assigned_driver_id === driverId
    && ['driver_accepted', 'driver_arrived_store', 'picked_up', 'on_the_way', 'driver_arrived_destination'].includes(order.status));
  useDriverLocation(shouldTrack ? orderId : undefined);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: o } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (!o || cancelled) { if (!cancelled) setLoading(false); return; }
      if (!cancelled) setOrder(o);

      const { data: s } = await supabase.from('stores').select('*').eq('id', o.store_id).single();
      if (s && !cancelled) setStore(s);

      const { data: d } = await supabase.from('drivers').select('*').eq('profile_id', profile?.id).single();
      if (d && !cancelled) {
        setDriverId(d.id);
        setDriverLat(d.current_latitude);
          setDriverLng(d.current_longitude);
      }

      if (cancelled) { setLoading(false); return; }

      channel = supabase.channel(`order-${orderId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `id=eq.${orderId}` }, (p) => {
          setOrder(p.new as DeliveryOrders);
        })
        .subscribe();

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId]);

  const refetchOrder = useCallback(async () => {
    if (!orderId) return;
    const { data: o } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
    if (o) setOrder(o);
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      refetchOrder();
    }, [refetchOrder])
  );

  const distKm = useMemo(() => {
    if (!order || driverLat == null || driverLng == null) return null;
    return calculateDistance(driverLat, driverLng, order.pickup_latitude, order.pickup_longitude);
  }, [order, driverLat, driverLng]);

  const etaMin = useMemo(() => (distKm != null ? calculateETA(distKm) : null), [distKm]);

  const badge = order ? (BADGE[order.status] || BADGE.pending) : null;
  const bonus = order?.reward_bonus ?? 0;
  const total = (order?.driver_earnings ?? 0) + bonus;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Order Details', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={S.center}><ActivityIndicator size="large" color={C.green} /></View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
        <Stack.Screen options={{ title: 'Order Details', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
        <View style={S.center}><Text style={{ color: C.label, fontSize: 16 }}>Order not found</Text></View>
      </SafeAreaView>
    );
  }

  const statusFlow = ['driver_accepted', 'driver_arrived_store', 'picked_up', 'on_the_way', 'driver_arrived_destination', 'delivered'];
  const nextIdx = statusFlow.indexOf(order.status) + 1;
  const isMine = !!(driverId && order.assigned_driver_id === driverId);

  const openMap = () => {
    if (!order) { Alert.alert('Error', 'Order data not available'); return; }
    if (driverLat == null || driverLng == null) { Alert.alert('Location Unavailable', 'Your current location is not available. Please wait for GPS to activate.'); return; }
    if (!order.pickup_latitude || !order.pickup_longitude) { Alert.alert('Missing Destination', 'Pickup coordinates are not set for this order.'); return; }
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${driverLat},${driverLng}&destination=${order.pickup_latitude},${order.pickup_longitude}&travelmode=driving`).catch(() => Alert.alert('Error', 'Could not open maps. Please check your navigation app.'));
  };

  const callCustomer = () => {
    if (!order) return;
    Linking.openURL(`tel:${order.customer_phone}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.screenBg }}>
      <Stack.Screen options={{ title: 'Order Details', headerTitleStyle: { fontWeight: '700', color: '#fff' } }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* ────────── ORDER INFO CARD ────────── */}
        <View style={S.card}>
          <View style={S.row}>
            <Text style={S.lbl}>Order ID</Text>
            <Text style={S.val}>{order.order_number}</Text>
          </View>
          <View style={S.row}>
            <Text style={S.lbl}>Status</Text>
            {badge && (
              <View style={[S.badge, { backgroundColor: badge.bg }]}>
                <Text style={[S.badgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
            )}
          </View>
          <View style={[S.row, { borderBottomWidth: 0 }]}>
            <Text style={S.lbl}>Created</Text>
            <Text style={S.val}>{fmtDate(order.created_at)}</Text>
          </View>
        </View>

        {/* ────────── ROUTE CARD ────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Route</Text>

          {/* Pickup */}
          <View style={S.rtSec}>
            <View style={S.rtLeft}>
              <Text style={{ fontSize: 20, color: C.green, marginTop: 2 }}>{'\u{1F3EA}'}</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={S.rtLabel}>PICKUP</Text>
                <Text style={S.rtTitle}>{store?.name || 'Store'}</Text>
                <Text style={S.rtAddr}>{order.pickup_address}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={openMap} style={S.mapBtn} activeOpacity={0.7}>
              <Text style={{ fontSize: 12, color: C.green }}>{'\u{1F5FA}'}</Text>
              <Text style={S.mapBtnText}>Map</Text>
            </TouchableOpacity>
          </View>

          {/* Drop-off */}
          <View style={S.rtSec}>
            <View style={S.dropPin}>
              <Text style={{ fontSize: 13, color: C.white }}>{'\u{1F4CD}'}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={S.rtLabel}>DROP-OFF</Text>
              <Text style={S.rtTitle}>{order.delivery_address}</Text>
            </View>
          </View>

          {/* Trip info */}
          <View style={S.divider} />
          <View style={S.tripRow}>
            <View style={S.tripItem}>
              <Text style={{ fontSize: 14, color: C.label }}>{'\u{1F4CD}'}</Text>
              <Text style={S.tripText}>{distKm != null ? fmtDist(distKm) : '—'}</Text>
            </View>
            <View style={S.tripItem}>
              <Text style={{ fontSize: 14, color: C.label }}>{'\u{23F1}'}</Text>
              <Text style={S.tripText}>{etaMin != null ? fmtETA(etaMin) : '—'}</Text>
            </View>
          </View>
        </View>

        {/* ────────── CUSTOMER DETAILS CARD ────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Customer Details</Text>
          <View style={S.custRow}>
            <View style={{ flex: 1 }}>
              <Text style={S.custName}>{order.customer_name}</Text>
              <Text style={S.custPhone}>{order.customer_phone}</Text>
            </View>
            <TouchableOpacity onPress={callCustomer} style={S.callBtn} activeOpacity={0.7}>
              <Text style={{ fontSize: 22, color: C.green }}>{'\u{1F4DE}'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ────────── PAYMENT DETAILS CARD ────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Payment Details</Text>

          <View style={S.payRow}>
            <Text style={S.lbl}>Delivery Fee</Text>
            <Text style={S.val}>{fmtCurr(order.delivery_fee)}</Text>
          </View>

          {bonus > 0 && (
            <View style={S.payRow}>
              <Text style={S.lbl}>Reward Bonus</Text>
              <Text style={S.val}>{fmtCurr(bonus)}</Text>
            </View>
          )}

          <View style={[S.payRow, { marginTop: 8 }]}>
            <Text style={S.totalLbl}>Total Earnings</Text>
            <Text style={S.totalVal}>{fmtCurr(total)}</Text>
          </View>

          <View style={S.payMethodBadge}>
            <Text style={{ fontSize: 18, color: C.label }}>{payIcon(order.payment_method)}</Text>
            <Text style={S.payMethodText}>{fmtPay(order.payment_method)}</Text>
          </View>
        </View>

        {/* ────────── ACTION BUTTONS ────────── */}
        {isMine && nextIdx < statusFlow.length && (
          statusFlow[nextIdx] === 'picked_up' || statusFlow[nextIdx] === 'driver_arrived_store' ? (
            <TouchableOpacity style={S.btnPrimary} onPress={() => router.push(`/(app)/(driver)/pickup-confirmation?orderId=${orderId}`)}>
              <Text style={S.btnPrimaryText}>Confirm Pickup</Text>
            </TouchableOpacity>
          ) : statusFlow[nextIdx] === 'on_the_way' ? (
            <TouchableOpacity style={S.btnPrimary} onPress={() => router.push(`/(app)/(driver)/en-route?orderId=${orderId}`)}>
              <Text style={S.btnPrimaryText}>Start Delivery</Text>
            </TouchableOpacity>
          ) : statusFlow[nextIdx] === 'driver_arrived_destination' || statusFlow[nextIdx] === 'delivered' ? (
            <TouchableOpacity style={S.btnPrimary} onPress={() => router.push(`/(app)/(driver)/confirm-delivery?orderId=${orderId}`)}>
              <Text style={S.btnPrimaryText}>Complete Delivery</Text>
            </TouchableOpacity>
          ) : null
        )}

        {isMine && order.status === 'delivered' && (
          <TouchableOpacity style={S.btnPrimary} onPress={() => router.push(`/(app)/(driver)/delivery-summary?orderId=${orderId}`)}>
            <Text style={S.btnPrimaryText}>View Delivery Summary</Text>
          </TouchableOpacity>
        )}

        {order.status === 'pending' && !order.assigned_driver_id && (
          <TouchableOpacity style={S.btnPrimary} onPress={() => router.push(`/(app)/(driver)/confirm-acceptance?orderId=${orderId}`)}>
            <Text style={S.btnPrimaryText}>Accept Order</Text>
          </TouchableOpacity>
        )}

        {isMine && order.status === 'driver_accepted' && (
          <TouchableOpacity style={S.btnSecondary} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(app)/(driver)'); }}>
            <Text style={S.btnSecondaryText}>Cancel Assignment</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },

  lbl: { color: C.label, fontSize: 14 },
  val: { color: C.nearWhite, fontSize: 14, fontWeight: '600' },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // Route
  rtSec: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rtLeft: { flexDirection: 'row', flex: 1, alignItems: 'flex-start' },
  rtLabel: { color: C.label, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  rtTitle: { color: C.white, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  rtAddr: { color: C.label, fontSize: 13 },

  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.greenDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    marginLeft: 12,
    marginTop: 2,
  },
  mapBtnText: { color: C.green, fontSize: 13, fontWeight: '600' },

  dropPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.redDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  divider: { height: 1, backgroundColor: C.divider, marginBottom: 12 },

  tripRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 24 },
  tripItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripText: { color: C.nearWhite, fontSize: 13, fontWeight: '500' },

  // Customer
  custRow: { flexDirection: 'row', alignItems: 'center' },
  custName: { color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  custPhone: { color: C.label, fontSize: 14 },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.callBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },

  // Payment
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLbl: { color: C.white, fontSize: 15, fontWeight: '700' },
  totalVal: { color: C.green, fontSize: 16, fontWeight: '700' },

  payMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.badgeGray,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  payMethodText: { color: C.nearWhite, fontSize: 14, fontWeight: '500' },

  // Buttons
  btnPrimary: {
    backgroundColor: C.greenDark,
    borderRadius: C.cardRadius,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnPrimaryText: { color: C.greenLight, fontSize: 16, fontWeight: '700' },

  btnSecondary: {
    backgroundColor: C.badgeGray,
    borderRadius: C.cardRadius,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecondaryText: { color: C.label, fontSize: 16, fontWeight: '600' },
});
