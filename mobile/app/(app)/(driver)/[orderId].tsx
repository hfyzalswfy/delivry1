import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack, Link } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { useDriverLocation } from '../../../src/hooks/use-driver-location';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';
import { DeliveryOrders } from '../../../src/types/database';
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

export default function DriverOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const profile = useAuthStore((s) => s.profile);
  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [assignment, setAssignment] = useState<{ id: string } | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

  const shouldTrack =
    order &&
    driverId &&
    order.assigned_driver_id === driverId &&
    ['driver_accepted', 'driver_arrived_store', 'picked_up', 'on_the_way'].includes(order.status);

  useDriverLocation(shouldTrack ? orderId : undefined);

  useEffect(() => {
    let cancelled = false;
    let orderChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: orderData } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (orderData && !cancelled) setOrder(orderData);

      if (cancelled) return;
      const { data: driver } = await supabase.from('drivers').select('id').eq('profile_id', profile?.id).single();
      if (driver) {
        setDriverId(driver.id);
        const { data: ass } = await supabase.from('order_assignments').select('id').eq('order_id', orderId).eq('driver_id', driver.id).maybeSingle();
        if (ass && !cancelled) setAssignment(ass);
      }

      if (cancelled) { setLoading(false); return; }

      orderChannel = supabase.channel(`driver-order-${orderId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `id=eq.${orderId}` }, (payload) => {
          setOrder(payload.new as DeliveryOrders);
        })
        .subscribe();

      if (!cancelled) setLoading(false);
    };

    init();

    return () => {
      cancelled = true;
      if (orderChannel) supabase.removeChannel(orderChannel);
    };
  }, [orderId]);

  const acceptOrder = async () => {
    setActionLoading(true);
    const { data: driver } = await supabase.from('drivers').select('id').eq('profile_id', profile?.id).single();
    if (!driver) { setActionLoading(false); return; }

    const { error: assignError } = await supabase.from('order_assignments').insert({
      order_id: orderId,
      driver_id: driver.id,
      status: 'accepted',
      responded_at: new Date().toISOString(),
    });
    if (assignError) { setActionLoading(false); return; }

    setAssignment({ id: 'temp' });
    setActionLoading(false);
  };

  const updateStatus = async (newStatus: string) => {
    setActionLoading(true);
    const timestamps: Record<string, string> = {
      driver_arrived_store: 'driver_arrived_store_at',
      picked_up: 'picked_up_at',
      on_the_way: 'on_the_way_at',
      delivered: 'delivered_at',
    };
    const update: Record<string, unknown> = { status: newStatus };
    if (timestamps[newStatus]) update[timestamps[newStatus]] = new Date().toISOString();
    await supabase.from('delivery_orders').update(update).eq('id', orderId);
    setOrder((prev) => prev ? { ...prev, status: newStatus as any } : null);
    setActionLoading(false);
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  if (!order) return <Text style={{ textAlign: 'center', marginTop: 50 }}>Order not found</Text>;

  const statusFlow = ['driver_accepted', 'driver_arrived_store', 'picked_up', 'on_the_way', 'delivered'];
  const nextStatusIndex = statusFlow.indexOf(order.status) + 1;

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
        <Text style={styles.value}>{order.customer_name} — {order.customer_phone}</Text>

        <Text style={styles.sectionTitle}>Pickup</Text>
        <Text style={styles.value}>{order.pickup_address}</Text>

        <Text style={styles.sectionTitle}>Delivery</Text>
        <Text style={styles.value}>{order.delivery_address}</Text>
        {order.delivery_landmark ? <Text style={styles.value}>Landmark: {order.delivery_landmark}</Text> : null}

        {order.shipment_description ? (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.value}>{order.shipment_description}</Text>
          </>
        ) : null}

        {order.pickup_latitude && order.pickup_longitude && order.delivery_latitude && order.delivery_longitude ? (
          <View style={styles.mapCard}>
            <Text style={styles.mapTitle}>Route</Text>
            {(() => {
              const dist = calculateDistance(order.pickup_latitude, order.pickup_longitude, order.delivery_latitude, order.delivery_longitude);
              const eta = calculateETA(dist);
              return <Text style={styles.etaText}>{dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`} — ~{eta} min</Text>;
            })()}
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              mapType="standard"
              loadingEnabled
              initialRegion={{
                latitude: (order.pickup_latitude + order.delivery_latitude) / 2,
                longitude: (order.pickup_longitude + order.delivery_longitude) / 2,
                latitudeDelta: Math.abs(order.pickup_latitude - order.delivery_latitude) * 1.5 + 0.01,
                longitudeDelta: Math.abs(order.pickup_longitude - order.delivery_longitude) * 1.5 + 0.01,
              }}
            >
              <Marker coordinate={{ latitude: order.pickup_latitude, longitude: order.pickup_longitude }} title="Pickup" pinColor="green" />
              <Marker coordinate={{ latitude: order.delivery_latitude, longitude: order.delivery_longitude }} title="Delivery" pinColor="red" />
              <Polyline
                coordinates={[
                  { latitude: order.pickup_latitude, longitude: order.pickup_longitude },
                  { latitude: order.delivery_latitude, longitude: order.delivery_longitude },
                ]}
                strokeColor={colors.primary}
                strokeWidth={3}
              />
            </MapView>
          </View>
        ) : null}

        <Link href={`/(app)/(chat)/${orderId}`} style={styles.chatButton}>
          <Text style={styles.chatButtonText}>💬 Chat</Text>
        </Link>

        <Text style={styles.price}>${order.delivery_fee.toFixed(2)}</Text>

        {order.status === 'pending' && !assignment && (
          <TouchableOpacity style={styles.acceptButton} onPress={acceptOrder} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptButtonText}>Accept Order</Text>}
          </TouchableOpacity>
        )}

        {assignment && nextStatusIndex < statusFlow.length && (
          <TouchableOpacity style={styles.actionButton} onPress={() => updateStatus(statusFlow[nextStatusIndex])} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Mark as {statusFlow[nextStatusIndex].replace('_', ' ')}</Text>}
          </TouchableOpacity>
        )}

        {order.status === 'driver_accepted' && (
          <TouchableOpacity style={styles.cancelButton} onPress={() => updateStatus('pending')} disabled={actionLoading}>
            <Text style={styles.cancelButtonText}>Cancel Assignment</Text>
          </TouchableOpacity>
        )}
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
  price: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginTop: spacing.md },
  mapCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  mapTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  etaText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.secondary, marginVertical: spacing.xs },
  map: { width: '100%', height: 250, borderRadius: borderRadius.md, marginTop: spacing.sm },
  chatButton: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
  chatButtonText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  acceptButton: { backgroundColor: colors.secondary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  acceptButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  actionButton: { backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  actionButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600', textTransform: 'capitalize' },
  cancelButton: { backgroundColor: colors.dangerLight, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  cancelButtonText: { color: colors.danger, fontSize: fontSize.md, fontWeight: '600' },
});
