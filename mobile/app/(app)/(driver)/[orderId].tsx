import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Linking, Alert } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { useDriverLocation } from '../../../src/hooks/use-driver-location';
import { DeliveryOrders, Stores } from '../../../src/types/database';
import { calculateDistance, calculateETA } from '../../../src/lib/geo';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { ICONS } from '../../../src/constants/icons';

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

function fmtDist(km: number): string {
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
}

function fmtETA(min: number): string {
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`;
}

export default function DriverOrderDetailScreen() {
  const colors = useColors();

  const BADGE: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: 'Pending', bg: colors.infoLight, text: colors.info },
    published: { label: 'Available', bg: colors.primaryLight, text: colors.primary },
    driver_accepted: { label: 'Accepted', bg: colors.primaryLight, text: colors.primary },
    driver_arrived_store: { label: 'At Store', bg: colors.warningLight, text: colors.warning },
    picked_up: { label: 'Picked Up', bg: colors.infoLight, text: colors.info },
    on_the_way: { label: 'On The Way', bg: colors.primaryLight, text: colors.primary },
    driver_arrived_destination: { label: 'Arrived', bg: colors.warningLight, text: colors.warning },
    delivered: { label: 'Delivered', bg: colors.successLight, text: colors.success },
    cancelled: { label: 'Cancelled', bg: colors.dangerLight, text: colors.danger },
  };

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

  const S = useMemo(() => StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    lbl: { color: colors.textSecondary, fontSize: fontSize.sm },
    val: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    rtSec: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    rtLeft: { flexDirection: 'row', flex: 1, alignItems: 'flex-start' },
    rtLabel: { color: colors.textSecondary, fontSize: fontSize.xxs, fontWeight: fontWeight.semibold, letterSpacing: 0.5, marginBottom: spacing.xs },
    rtTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
    rtAddr: { color: colors.textSecondary, fontSize: fontSize.sm },
    mapBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.md,
      gap: spacing.xs,
      marginLeft: spacing.sm,
      marginTop: spacing.xs,
    },
    mapBtnText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    dropPin: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.dangerLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.sm },
    tripRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: spacing.lg },
    tripItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tripText: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    custRow: { flexDirection: 'row', alignItems: 'center' },
    custName: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
    custPhone: { color: colors.textSecondary, fontSize: fontSize.sm },
    callBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing.md,
    },
    payRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    totalLbl: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    totalVal: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    payMethodBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.borderLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    payMethodText: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    btnPrimary: {
      backgroundColor: colors.primaryLight,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    btnPrimaryText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    btnSecondary: {
      backgroundColor: colors.borderLight,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    btnSecondaryText: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Order Details', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={S.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Order Details', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
        <View style={S.center}><Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>Order not found</Text></View>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Order Details', headerTitleStyle: { fontWeight: fontWeight.bold } }} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
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
              <MaterialIcons name={ICONS.store} size={fontSize.xl} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={S.rtLabel}>PICKUP</Text>
                <Text style={S.rtTitle}>{store?.name || 'Store'}</Text>
                <Text style={S.rtAddr}>{order.pickup_address}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={openMap} style={S.mapBtn} activeOpacity={0.7}>
              <MaterialIcons name={ICONS.map} size={fontSize.xs} color={colors.primary} />
              <Text style={S.mapBtnText}>Map</Text>
            </TouchableOpacity>
          </View>

          {/* Drop-off */}
          <View style={S.rtSec}>
            <View style={S.dropPin}>
              <MaterialIcons name={ICONS.location} size={fontSize.sm} color={colors.text} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={S.rtLabel}>DROP-OFF</Text>
              <Text style={S.rtTitle}>{order.delivery_address}</Text>
            </View>
          </View>

          {/* Trip info */}
          <View style={S.divider} />
          <View style={S.tripRow}>
            <View style={S.tripItem}>
              <MaterialIcons name={ICONS.location} size={fontSize.sm} color={colors.textSecondary} />
              <Text style={S.tripText}>{distKm != null ? fmtDist(distKm) : '—'}</Text>
            </View>
            <View style={S.tripItem}>
              <MaterialIcons name={ICONS.timer} size={fontSize.sm} color={colors.textSecondary} />
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
              <MaterialIcons name={ICONS.phone} size={fontSize.xxl} color={colors.primary} />
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

          <View style={[S.payRow, { marginTop: spacing.sm }]}>
            <Text style={S.totalLbl}>Total Earnings</Text>
            <Text style={S.totalVal}>{fmtCurr(total)}</Text>
          </View>

          <View style={S.payMethodBadge}>
            <MaterialIcons name={ICONS.money} size={fontSize.lg} color={colors.textSecondary} />
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
