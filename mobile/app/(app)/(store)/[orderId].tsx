import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, SafeAreaView, Linking } from 'react-native';
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

export default function StoreOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<DeliveryOrders | null>(null);
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
      const { data } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (cancelled) return;
      if (data) {
        setOrder(data);

        if (data.assigned_driver_id) {
          await fetchDriverProfile(data.assigned_driver_id);
          if (cancelled) return;
          const { data: latest } = await supabase.from('driver_locations').select('*').eq('order_id', orderId).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
          if (latest && !cancelled) setDriverLocation(latest);

          locationChannel = supabase.channel(`store-driver-loc-${orderId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'driver_locations', filter: `order_id=eq.${orderId}` }, (payload) => {
              setDriverLocation(payload.new as DriverLocations);
            })
            .subscribe();
        }
      }

      if (cancelled) { setLoading(false); return; }

      orderChannel = supabase.channel(`store-order-${orderId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `id=eq.${orderId}` }, async (payload) => {
          const updated = payload.new as DeliveryOrders;
          setOrder(updated);
          if (updated.assigned_driver_id && !locationChannel) {
            await fetchDriverProfile(updated.assigned_driver_id);
            if (cancelled) return;
            const { data: latest } = await supabase.from('driver_locations').select('*').eq('order_id', orderId).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
            if (latest && !cancelled) setDriverLocation(latest);
            locationChannel = supabase.channel(`store-driver-loc-${orderId}`)
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

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  if (!order) return <Text style={{ textAlign: 'center', marginTop: 50 }}>Order not found</Text>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: `Order #${order.order_number}` }} />
      <ScrollView style={styles.container}>
        <View style={[styles.statusBadge, { backgroundColor: (statusColors[order.status] || colors.statusDraft) + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[order.status] || colors.statusDraft }]}>
            {order.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Customer</Text>
        <Text style={styles.value}>{order.customer_name}</Text>
        <Text style={styles.value}>{order.customer_phone}</Text>

        <Text style={styles.sectionTitle}>Pickup</Text>
        <Text style={styles.value}>{order.pickup_address}</Text>

        <Text style={styles.sectionTitle}>Delivery</Text>
        <Text style={styles.value}>{order.delivery_address}</Text>
        {order.delivery_apartment ? <Text style={styles.value}>Apt: {order.delivery_apartment}</Text> : null}
        {order.delivery_landmark ? <Text style={styles.value}>Landmark: {order.delivery_landmark}</Text> : null}

        {order.shipment_description ? (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.value}>{order.shipment_description}</Text>
          </>
        ) : null}

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

        {(order.status === 'driver_accepted' || order.status === 'driver_arrived_store' || order.status === 'picked_up' || order.status === 'on_the_way') && driverLocation ? (
          <View style={styles.trackingCard}>
            <Text style={styles.trackingTitle}>Live Tracking — Driver</Text>
            {(() => {
              const dist = calculateDistance(driverLocation.latitude, driverLocation.longitude, order.pickup_latitude, order.pickup_longitude);
              const eta = calculateETA(dist);
              return <Text style={styles.etaText}>{dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`} from store — {eta} min</Text>;
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
              <Marker coordinate={{ latitude: order.pickup_latitude, longitude: order.pickup_longitude }} title="Store (Pickup)" pinColor="green" />
              <Marker coordinate={{ latitude: order.delivery_latitude, longitude: order.delivery_longitude }} title="Delivery" pinColor="red" />
              <Polyline
                coordinates={[
                  { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
                  { latitude: order.pickup_latitude, longitude: order.pickup_longitude },
                ]}
                strokeColor={colors.secondary}
                strokeWidth={2}
              />
            </MapView>
          </View>
        ) : order.status === 'driver_accepted' ? (
          <View style={styles.trackingCard}>
            <Text style={styles.trackingTitle}>Live Tracking</Text>
            <Text style={styles.trackingSubtitle}>Waiting for driver location...</Text>
          </View>
        ) : null}

        <View style={styles.priceRow}>
          <Text style={styles.sectionTitle}>Delivery Fee</Text>
          <Text style={styles.price}>${order.delivery_fee.toFixed(2)}</Text>
        </View>

        <Link href={`/(app)/(chat)/${orderId}`} style={styles.chatButton}>
          <Text style={styles.chatButtonText}>💬 Chat</Text>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  statusBadge: { alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.lg },
  statusText: { fontSize: fontSize.sm, fontWeight: '700' },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs, textTransform: 'uppercase' },
  value: { fontSize: fontSize.md, color: colors.text, marginBottom: spacing.xs },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  price: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  trackingCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.lg },
  trackingTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  trackingSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  etaText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.secondary, marginVertical: spacing.xs },
  map: { width: '100%', height: 250, borderRadius: borderRadius.md, marginTop: spacing.sm },
  chatButton: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
  chatButtonText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
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
});
