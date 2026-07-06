import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, SafeAreaView, Linking } from 'react-native';
import { useLocalSearchParams, Stack, Link } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { supabase } from '../../../src/lib/supabase';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';
import { DeliveryOrders, DriverLocations } from '../../../src/types/database';
import { calculateDistance, calculateETA } from '../../../src/lib/geo';

const statusColors: Record<string, string> = {
  pending: colors.statusDraft,
  driver_accepted: colors.statusAssigned,
  driver_arrived_store: colors.statusPublished,
  picked_up: colors.statusPickedUp,
  on_the_way: colors.statusInTransit,
  delivered: colors.statusDelivered,
  cancelled: colors.statusCancelled,
};

interface DriverProfile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  average_rating: number;
  availability: string;
}

export default function CustomerOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [storeName, setStoreName] = useState('');
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let orderChannel: ReturnType<typeof supabase.channel> | null = null;
    let locationChannel: ReturnType<typeof supabase.channel> | null = null;

    const fetchDriverProfile = async (driverId: string) => {
      const { data: d } = await supabase.from('drivers').select('profile_id, availability, average_rating').eq('id', driverId).single();
      if (!d) return;
      const { data: p } = await supabase.from('profiles').select('full_name, phone, avatar_url').eq('id', d.profile_id).single();
      if (cancelled) return;
      if (p) setDriverProfile({ id: driverId, ...p, average_rating: d.average_rating, availability: d.availability });
    };

    const init = async () => {
      const { data: orderData } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (cancelled) return;
      if (orderData) {
        setOrder(orderData);
        const { data: store } = await supabase.from('stores').select('name').eq('id', orderData.store_id).single();
        if (!cancelled && store) setStoreName(store.name);

        if (orderData.assigned_driver_id) {
          await fetchDriverProfile(orderData.assigned_driver_id);
          if (cancelled) return;
          const { data: latest } = await supabase.from('driver_locations').select('*').eq('order_id', orderId).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
          if (latest && !cancelled) setDriverLocation(latest);

          locationChannel = supabase.channel(`customer-driver-loc-${orderId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'driver_locations', filter: `order_id=eq.${orderId}` }, (payload) => {
              setDriverLocation(payload.new as DriverLocations);
            })
            .subscribe();
        }
      }

      if (cancelled) { setLoading(false); return; }

      orderChannel = supabase.channel(`customer-order-${orderId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `id=eq.${orderId}` }, async (payload) => {
          const updated = payload.new as DeliveryOrders;
          setOrder(updated);

          if (updated.assigned_driver_id && !locationChannel) {
            await fetchDriverProfile(updated.assigned_driver_id);
            if (cancelled) return;
            const { data: latest } = await supabase.from('driver_locations').select('*').eq('order_id', orderId).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
            if (latest && !cancelled) setDriverLocation(latest);

            locationChannel = supabase.channel(`customer-driver-loc-${orderId}`)
              .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'driver_locations', filter: `order_id=eq.${orderId}` }, (payload) => {
                setDriverLocation(payload.new as DriverLocations);
              })
              .subscribe();
          }
        })
        .subscribe();

      if (!cancelled) setLoading(false);
    };

    init();

    return () => {
      cancelled = true;
      if (orderChannel) supabase.removeChannel(orderChannel);
      if (locationChannel) { supabase.removeChannel(locationChannel); locationChannel = null; }
    };
  }, [orderId]);

  const confirmDelivery = async () => {
    await supabase.from('delivery_orders').update({ status: 'delivered' }).eq('id', orderId);
    setOrder((prev) => prev ? { ...prev, status: 'delivered' as const } : null);
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  if (!order) return <Text style={{ textAlign: 'center', marginTop: 50 }}>Order not found</Text>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: `Delivery #${orderId?.slice(0, 8)}` }} />
      <ScrollView style={styles.container}>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[order.status] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[order.status] }]}>
            {order.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Store</Text>
        <Text style={styles.value}>{storeName || 'Store'}</Text>

        {driverProfile && (order.status === 'driver_accepted' || order.status === 'driver_arrived_store' || order.status === 'picked_up' || order.status === 'on_the_way') && (
          <View style={styles.driverCard}>
            <Text style={styles.sectionTitle}>Driver</Text>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>{driverProfile.full_name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driverProfile.full_name}</Text>
                <Text style={styles.driverPhone}>{driverProfile.phone ?? ''}</Text>
                <Text style={styles.driverMeta}>⭐ {driverProfile.average_rating.toFixed(1)} · {driverProfile.availability}</Text>
              </View>
              <View style={styles.driverActions}>
                <Link href={`/(app)/(chat)/${orderId}`} style={styles.driverActionBtn}>
                  <Text style={styles.driverActionBtnText}>💬</Text>
                </Link>
                <TouchableOpacity style={styles.driverActionBtn} onPress={() => Linking.openURL(`tel:${driverProfile.phone || ''}`)}>
                  <Text style={styles.driverActionBtnText}>📞</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Pickup</Text>
        <Text style={styles.value}>{order.pickup_address}</Text>

        <Text style={styles.sectionTitle}>Delivery To</Text>
        <Text style={styles.value}>{order.delivery_address}</Text>

        {order.shipment_description ? (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.value}>{order.shipment_description}</Text>
          </>
        ) : null}

        <Link href={`/(app)/(chat)/${orderId}`} style={styles.chatButton}>
          <Text style={styles.chatButtonText}>💬 Chat</Text>
        </Link>

        <Text style={styles.price}>${order.delivery_fee.toFixed(2)}</Text>

        {(order.status === 'driver_accepted' || order.status === 'driver_arrived_store' || order.status === 'picked_up' || order.status === 'on_the_way') && driverLocation ? (
          <View style={styles.trackingCard}>
            <Text style={styles.trackingTitle}>Live Tracking</Text>
            {(() => {
              const dist = calculateDistance(driverLocation.latitude, driverLocation.longitude, order.delivery_latitude, order.delivery_longitude);
              const eta = calculateETA(dist);
              return <Text style={styles.etaText}>{dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`} — {eta} min</Text>;
            })()}
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              mapType="standard"
              loadingEnabled
              region={{
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              <Marker coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }} title="Driver" pinColor="blue" />
              <Marker coordinate={{ latitude: order.pickup_latitude, longitude: order.pickup_longitude }} title="Pickup" pinColor="green" />
              <Marker coordinate={{ latitude: order.delivery_latitude, longitude: order.delivery_longitude }} title="Delivery" pinColor="red" />
              <Polyline
                coordinates={[
                  { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
                  { latitude: order.delivery_latitude, longitude: order.delivery_longitude },
                ]}
                strokeColor={colors.secondary}
                strokeWidth={2}
              />
            </MapView>
          </View>
        ) : order.status === 'driver_accepted' || order.status === 'driver_arrived_store' || order.status === 'picked_up' || order.status === 'on_the_way' ? (
          <View style={styles.trackingCard}>
            <Text style={styles.trackingTitle}>Live Tracking</Text>
            <Text style={styles.trackingSubtitle}>Waiting for driver location...</Text>
          </View>
        ) : null}

        {order.status === 'on_the_way' && (
          <TouchableOpacity style={styles.confirmButton} onPress={confirmDelivery}>
            <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
          </TouchableOpacity>
        )}

        {order.status === 'delivered' && (
          <View style={styles.deliveredBanner}>
            <Text style={styles.deliveredText}>✓ Delivered</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  driverCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  driverAvatarText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  driverInfo: { flex: 1 },
  driverName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  driverPhone: { fontSize: fontSize.sm, color: colors.textSecondary },
  driverMeta: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 1 },
  driverActions: { flexDirection: 'row', gap: spacing.sm },
  driverActionBtn: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.full, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  driverActionBtnText: { fontSize: 16 },
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  statusBadge: { alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.lg },
  statusText: { fontSize: fontSize.sm, fontWeight: '700' },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs, textTransform: 'uppercase' },
  value: { fontSize: fontSize.md, color: colors.text, marginBottom: spacing.xs },
  price: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginTop: spacing.md },
  chatButton: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
  chatButtonText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  trackingCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.lg },
  trackingTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  trackingSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  etaText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.secondary, marginVertical: spacing.xs },
  map: { width: '100%', height: 250, borderRadius: borderRadius.md, marginTop: spacing.sm },
  confirmButton: { backgroundColor: colors.secondary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  confirmButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  deliveredBanner: { backgroundColor: colors.secondaryLight, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  deliveredText: { color: colors.secondary, fontSize: fontSize.lg, fontWeight: '700' },
});
