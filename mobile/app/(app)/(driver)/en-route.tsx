import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Linking, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Marker, Polyline } from 'react-native-maps';
import SharedMap, { SharedMapRef } from '../../../src/components/ui/SharedMap';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { useDriverLocation } from '../../../src/hooks/use-driver-location';
import { arriveAtDestination, startDelivery } from '../../../src/services/delivery-service';
import { DeliveryOrders, Stores } from '../../../src/types/database';
import { calculateDistance, calculateETA, isValidCoordinate } from '../../../src/lib/geo';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';
import { ICONS } from '../../../src/constants/icons';

const STEPS = [
  { key: 'driver_accepted', label: 'Accepted' },
  { key: 'driver_arrived_store', label: 'At Store' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'on_the_way', label: 'On The Way' },
  { key: 'driver_arrived_destination', label: 'Arrived' },
];

function fmtCurr(v: number): string {
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} YER`;
}

function fmtDist(km: number): string {
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
}

function fmtETA(min: number): string {
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`;
}

export default function EnRouteScreen() {
  const colors = useColors();
  const S = useMemo(() => createStyles(colors, spacing, fontSize, borderRadius, fontWeight), [colors]);
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const profile = useAuthStore((s) => s.profile);

  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [store, setStore] = useState<Stores | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [arriving, setArriving] = useState(false);

  const mapRef = useRef<SharedMapRef>(null);

  const shouldTrack = !!(order && driverId && order.assigned_driver_id === driverId
    && ['picked_up', 'on_the_way'].includes(order.status));
  useDriverLocation(shouldTrack ? orderId : undefined);

  useEffect(() => {
    let cancelled = false;
    let orderChannel: ReturnType<typeof supabase.channel> | null = null;
    let driverLocationChannel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: o } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (cancelled) { setLoading(false); return; }

      if (!o) {
        if (!cancelled) { setAccessError('Order not found.'); setLoading(false); }
        return;
      }

      if (o.status !== 'on_the_way' && o.status !== 'picked_up') {
        if (!cancelled) { setAccessError(`This screen is only available when the order status is "On The Way" or "Picked Up". Current status: ${o.status.replace(/_/g, ' ')}`); setLoading(false); }
        return;
      }

      if (o.status === 'picked_up') {
        const { data: d } = await supabase.from('drivers').select('id').eq('profile_id', profile?.id).single();
        if (d && !cancelled) {
          const result = await startDelivery(orderId, d.id);
          if (!result.success) {
            if (!cancelled) { setAccessError(result.error || 'Failed to start delivery.'); setLoading(false); }
            return;
          }
        }
        if (!cancelled) setOrder({ ...o, status: 'on_the_way', on_the_way_at: new Date().toISOString() });
      } else {
        if (!cancelled) setOrder(o);
      }

      const { data: s } = await supabase.from('stores').select('*').eq('id', o.store_id).single();
      if (s && !cancelled) setStore(s);

      const { data: d } = await supabase.from('drivers').select('*').eq('profile_id', profile?.id).single();
      if (d && !cancelled) {
        if (d.id !== o.assigned_driver_id) {
          if (!cancelled) { setAccessError('You are not the assigned driver for this order.'); setLoading(false); }
          return;
        }
        setDriverId(d.id);
        setDriverLat(d.current_latitude);
        setDriverLng(d.current_longitude);
      }

      if (cancelled) { setLoading(false); return; }

      orderChannel = supabase.channel(`en-route-order-${orderId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `id=eq.${orderId}` }, (p) => {
          setOrder(p.new as DeliveryOrders);
        })
        .subscribe();

      if (d?.id) {
        driverLocationChannel = supabase.channel(`en-route-driver-${d.id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${d.id}` }, (p) => {
            const { current_latitude, current_longitude } = p.new as any;
            if (current_latitude != null && current_longitude != null) {
              setDriverLat(current_latitude);
              setDriverLng(current_longitude);
            }
          })
          .subscribe();
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (orderChannel) supabase.removeChannel(orderChannel);
      if (driverLocationChannel) supabase.removeChannel(driverLocationChannel);
    };
  }, [orderId]);

  const distToCustomer = useMemo(() => {
    if (!order || driverLat == null || driverLng == null) return null;
    return calculateDistance(driverLat, driverLng, order.delivery_latitude, order.delivery_longitude);
  }, [order, driverLat, driverLng]);

  const etaToCustomer = useMemo(() => (distToCustomer != null ? calculateETA(distToCustomer) : null), [distToCustomer]);

  const currentStepIndex = order ? STEPS.findIndex((s) => s.key === order.status) : -1;

  const badgeConfig: Record<string, { label: string; bg: string; text: string }> = {
    on_the_way: { label: 'On The Way', bg: colors.primaryLight, text: colors.primary },
  };
  const badge = order ? (badgeConfig[order.status] || { label: order.status.replace(/_/g, ' '), bg: colors.borderLight, text: colors.textSecondary }) : null;

  const startNavigation = () => {
    if (!order) { Alert.alert('Error', 'Order data not available'); return; }
    if (driverLat == null || driverLng == null) { Alert.alert('Location Unavailable', 'Your current location is not available. Please wait for GPS to activate.'); return; }
    if (!isValidCoordinate(order.delivery_latitude, order.delivery_longitude)) { Alert.alert('Missing Destination', 'Delivery destination coordinates are not set for this order.'); return; }
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${driverLat},${driverLng}&destination=${order.delivery_latitude},${order.delivery_longitude}&travelmode=driving`).catch(() => Alert.alert('Error', 'Could not open maps. Please check your navigation app.'));
  };

  const callCustomer = () => {
    if (!order) return;
    Linking.openURL(`tel:${order.customer_phone}`);
  };

  const openChat = () => {
    if (!order) return;
    router.push(`/(app)/(chat)/${orderId}`);
  };

  const handleArrive = async () => {
    if (!order || !driverId) return;
    setArriving(true);

    try {
      const result = await arriveAtDestination(orderId, driverId);
      if (result.success) {
        setArriving(false);
        router.replace(`/(app)/(driver)/confirm-delivery?orderId=${orderId}`);
      } else {
        Alert.alert('Failed to Arrive', result.error);
        setArriving(false);
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setArriving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Active Delivery', headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (accessError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Active Delivery', headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
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

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Active Delivery', headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>Order not found</Text></View>
      </SafeAreaView>
    );
  }

  const mapRegion = {
    latitude: driverLat ?? (order.delivery_latitude + order.pickup_latitude) / 2,
    longitude: driverLng ?? (order.delivery_longitude + order.pickup_longitude) / 2,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const bonus = order.reward_bonus ?? 0;
  const total = order.driver_earnings + bonus;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Active Delivery', headerTitleStyle: { fontWeight: fontWeight.semibold, color: colors.text } }} />

      <View style={{ flex: 1 }}>
        {/* MAP */}
        <View style={S.mapContainer}>
          <SharedMap ref={mapRef} style={S.map} initialRegion={mapRegion} loadingEnabled>
            {driverLat != null && driverLng != null && (
              <Marker coordinate={{ latitude: driverLat, longitude: driverLng }} title="You" pinColor="#3B82F6" />
            )}
              {isValidCoordinate(order.pickup_latitude, order.pickup_longitude) && (
                <Marker coordinate={{ latitude: order.pickup_latitude, longitude: order.pickup_longitude }} title={store?.name || 'Store'} pinColor="green" />
              )}
            {isValidCoordinate(order.delivery_latitude, order.delivery_longitude) && (
              <Marker coordinate={{ latitude: order.delivery_latitude, longitude: order.delivery_longitude }} title="Customer" pinColor="red" />
            )}
            {isValidCoordinate(order.pickup_latitude, order.pickup_longitude) && isValidCoordinate(order.delivery_latitude, order.delivery_longitude) && (
              <Polyline coordinates={[{ latitude: order.pickup_latitude, longitude: order.pickup_longitude }, { latitude: order.delivery_latitude, longitude: order.delivery_longitude }]} strokeColor={colors.primary} strokeWidth={3} />
            )}
          </SharedMap>

          <View style={S.etaOverlay}>
            <MaterialIcons name={ICONS.location} size={fontSize.sm} color={colors.text} />
            <Text style={S.etaText}>{distToCustomer != null ? fmtDist(distToCustomer) : '—'} &middot; {etaToCustomer != null ? fmtETA(etaToCustomer) : '—'}</Text>
          </View>
        </View>

        {/* CONTENT */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
          {/* Timeline */}
          <View style={S.timelineCard}>
            <View style={S.timelineRow}>
              {STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isActive = idx === currentStepIndex;
                const isLast = idx === STEPS.length - 1;
                return (
                  <View key={step.key} style={[S.stepItem, isLast && { flex: 0 }]}>
                    <View style={[S.stepDot, isCompleted && S.stepDotCompleted, isActive && S.stepDotActive]} />
                    {!isLast && <View style={[S.stepLine, isCompleted && S.stepLineCompleted]} />}
                    <Text style={[S.stepLabel, isCompleted && S.stepLabelCompleted, isActive && S.stepLabelActive]}>{step.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Route */}
          <View style={S.card}>
            <View style={S.orderHeader}>
              <Text style={S.orderId}>{order.order_number}</Text>
              {badge && <View style={[S.badge, { backgroundColor: badge.bg }]}><Text style={[S.badgeText, { color: badge.text }]}>{badge.label}</Text></View>}
            </View>
            <View style={S.locRow}>
              <MaterialIcons name={ICONS.store} size={fontSize.md} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={S.locLabel}>PICKUP</Text>
                <Text style={S.locTitle}>{store?.name || 'Store'}</Text>
                <Text style={S.locAddr}>{order.pickup_address}</Text>
              </View>
            </View>
            <View style={[S.locRow, { marginBottom: 0 }]}>
              <View style={S.dropPinSmall}><MaterialIcons name={ICONS.location} size={fontSize.xxs} color={colors.text} /></View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={S.locLabel}>DROP-OFF</Text>
                <Text style={S.locTitle}>{order.delivery_address}</Text>
              </View>
            </View>
          </View>

          {/* Customer + Earnings */}
          <View style={S.card}>
            <Text style={S.cardTitle}>Delivery Info</Text>
            <View style={S.custRow}>
              <View style={{ flex: 1 }}>
                <Text style={S.custName}>{order.customer_name}</Text>
                <Text style={S.custPhone}>{order.customer_phone}</Text>
              </View>
            </View>
            <View style={S.divider} />
            <View style={S.infoGrid}>
              <View style={S.infoItem}>
                <Text style={S.infoLabel}>Distance</Text>
                <Text style={S.infoValue}>{distToCustomer != null ? fmtDist(distToCustomer) : '—'}</Text>
              </View>
              <View style={S.infoItem}>
                <Text style={S.infoLabel}>ETA</Text>
                <Text style={S.infoValue}>{etaToCustomer != null ? fmtETA(etaToCustomer) : '—'}</Text>
              </View>
              <View style={S.infoItem}>
                <Text style={S.infoLabel}>Earnings</Text>
                <Text style={[S.infoValue, { color: colors.primary }]}>{fmtCurr(total)}</Text>
              </View>
            </View>
          </View>

          {/* Mark as Arrived */}
          <TouchableOpacity style={S.arriveBtn} onPress={handleArrive} disabled={arriving}>
            {arriving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={S.arriveBtnText}>Mark as Arrived</Text>}
          </TouchableOpacity>
        </ScrollView>

        {/* BOTTOM ACTIONS - 3 buttons */}
        <View style={S.bottomBar}>
          <TouchableOpacity style={S.bottomBtn} onPress={startNavigation}>
            <MaterialIcons name={ICONS.map} size={fontSize.md} color={colors.primary} />
            <Text style={S.bottomBtnText}>Navigate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.bottomBtn, S.bottomBtnChat]} onPress={openChat}>
            <MaterialIcons name={ICONS.chat} size={fontSize.md} color={colors.primary} />
            <Text style={S.bottomBtnText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.bottomBtn, S.bottomBtnCall]} onPress={callCustomer}>
            <MaterialIcons name={ICONS.phone} size={fontSize.md} color={colors.primary} />
            <Text style={S.bottomBtnText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>, spacing: any, fontSize: any, borderRadius: any, fontWeight: any) => StyleSheet.create({
  mapContainer: { height: 280, position: 'relative' },
  map: { width: '100%', height: '100%' },
  etaOverlay: {
    position: 'absolute', top: spacing.sm, right: spacing.sm, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.md, gap: spacing.xs,
  },
  etaText: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  timelineCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  stepItem: { flex: 1, alignItems: 'center' },
  stepDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.border, marginBottom: 6 },
  stepDotCompleted: { backgroundColor: colors.primary },
  stepDotActive: { backgroundColor: colors.primary, width: 18, height: 18, borderRadius: 9, marginTop: -2 },
  stepLine: { position: 'absolute', top: 6, left: '50%', right: '-50%', height: 3, backgroundColor: colors.border, zIndex: -1 },
  stepLineCompleted: { backgroundColor: colors.primary },
  stepLabel: { fontSize: fontSize.xxs, color: colors.textSecondary, textAlign: 'center', fontWeight: fontWeight.medium },
  stepLabelCompleted: { color: colors.primary },
  stepLabelActive: { color: colors.text, fontWeight: fontWeight.bold },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  orderId: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  locRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  locLabel: { color: colors.textSecondary, fontSize: fontSize.xxs, fontWeight: fontWeight.semibold, letterSpacing: 0.5, marginBottom: spacing.xs },
  locTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  locAddr: { color: colors.textSecondary, fontSize: fontSize.xs },
  dropPinSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.dangerLight, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  custRow: { flexDirection: 'row', alignItems: 'center' },
  custName: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  custPhone: { color: colors.textSecondary, fontSize: fontSize.sm },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  infoItem: { alignItems: 'center', flex: 1 },
  infoLabel: { color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: spacing.xs },
  infoValue: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  arriveBtn: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, alignItems: 'center', marginBottom: spacing.sm },
  arriveBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.sm,
    padding: spacing.sm, paddingBottom: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
  },
  bottomBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryLight, borderRadius: borderRadius.md, paddingVertical: spacing.sm, gap: 6,
  },
  bottomBtnChat: { backgroundColor: colors.primaryLight },
  bottomBtnCall: { backgroundColor: colors.primaryLight },
  bottomBtnText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  backBtn: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
  backBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
