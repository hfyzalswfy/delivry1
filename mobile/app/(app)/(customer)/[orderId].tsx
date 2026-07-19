import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, SafeAreaView, Linking, Alert } from 'react-native';
import { useLocalSearchParams, Stack, Link } from 'expo-router';
import { Marker, Polyline } from 'react-native-maps';
import SharedMap from '../../../src/components/ui/SharedMap';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';
import { supabase } from '../../../src/lib/supabase';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { DeliveryOrders, DriverLocations } from '../../../src/types/database';
import { calculateDistance, calculateETA, isValidCoordinate } from '../../../src/lib/geo';
import { completeDelivery } from '../../../src/services/delivery-service';

interface DriverProfile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  average_rating: number;
  availability: string;
}

export default function CustomerOrderDetailScreen() {
  const colors = useColors();
  const statusColors: Record<string, string> = {
    pending: colors.statusDraft,
    driver_accepted: colors.statusAssigned,
    driver_arrived_store: colors.statusPublished,
    picked_up: colors.statusPickedUp,
    on_the_way: colors.statusInTransit,
    delivered: colors.statusDelivered,
    cancelled: colors.statusCancelled,
  };
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<DeliveryOrders | null>(null);
  const [storeName, setStoreName] = useState('');
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

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
        }
      }

      if (cancelled) { setLoading(false); return; }

      channel = supabase.channel(`customer-order-${orderId}`);

      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `id=eq.${orderId}` }, async (payload) => {
        const updated = payload.new as DeliveryOrders;
        setOrder(updated);
        if (updated.assigned_driver_id) {
          await fetchDriverProfile(updated.assigned_driver_id);
        }
      });

      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'driver_locations', filter: `order_id=eq.${orderId}` }, (payload) => {
        setDriverLocation(payload.new as DriverLocations);
      });

      channel.subscribe();
      if (!cancelled) setLoading(false);
    };

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId]);

  const confirmDelivery = async () => {
    if (!order?.assigned_driver_id) {
      Alert.alert('Error', 'No driver assigned to this order');
      return;
    }
    const result = await completeDelivery(orderId, order.assigned_driver_id, 'none');
    if (result.success) {
      setOrder((prev) => prev ? { ...prev, status: 'delivered' as const } : null);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const styles = StyleSheet.create({
    driverCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
    driverRow: { flexDirection: 'row', alignItems: 'center' },
    driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
    driverAvatarText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.bold },
    driverInfo: { flex: 1 },
    driverName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
    driverPhone: { fontSize: fontSize.sm, color: colors.textSecondary },
    driverMeta: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 1 },
    driverActions: { flexDirection: 'row', gap: spacing.sm },
    driverActionBtn: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.full, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
    statusBadge: { alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.lg },
    statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs, textTransform: 'uppercase' },
    value: { fontSize: fontSize.md, color: colors.text, marginBottom: spacing.xs },
    price: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary, marginTop: spacing.md },
    chatButton: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
    chatButtonText: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    trackingCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.lg },
    trackingTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
    trackingSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
    etaText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.secondary, marginVertical: spacing.xs },
    map: { width: '100%', height: 250, borderRadius: borderRadius.md, marginTop: spacing.sm },
    confirmButton: { backgroundColor: colors.secondary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.xl },
    confirmButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    deliveredBanner: { backgroundColor: colors.secondaryLight, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.xl },
    deliveredText: { color: colors.secondary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  });

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
                <Text style={styles.driverMeta}><MaterialIcons name={ICONS.star} size={fontSize.xs} color={colors.textTertiary} /> {driverProfile.average_rating.toFixed(1)} · {driverProfile.availability}</Text>
              </View>
              <View style={styles.driverActions}>
                <Link href={`/(app)/(chat)/${orderId}`} style={styles.driverActionBtn}>
                  <MaterialIcons name={ICONS.chat} size={fontSize.md} color={colors.text} />
                </Link>
                <TouchableOpacity style={styles.driverActionBtn} onPress={() => Linking.openURL(`tel:${driverProfile.phone || ''}`)}>
                  <MaterialIcons name={ICONS.phone} size={fontSize.md} color={colors.text} />
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
          <MaterialIcons name={ICONS.chat} size={fontSize.md} color={colors.primary} style={{ marginRight: spacing.xs }} />
          <Text style={styles.chatButtonText}>Chat</Text>
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
            <SharedMap
              style={styles.map}
              loadingEnabled
              region={{
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              <Marker coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }} title="Driver" pinColor="blue" />
              {isValidCoordinate(order.pickup_latitude, order.pickup_longitude) && (
                <Marker coordinate={{ latitude: order.pickup_latitude, longitude: order.pickup_longitude }} title="Pickup" pinColor="green" />
              )}
              {isValidCoordinate(order.delivery_latitude, order.delivery_longitude) && (
                <Marker coordinate={{ latitude: order.delivery_latitude, longitude: order.delivery_longitude }} title="Delivery" pinColor="red" />
              )}
              {isValidCoordinate(driverLocation.latitude, driverLocation.longitude) && isValidCoordinate(order.delivery_latitude, order.delivery_longitude) && (
                <Polyline
                  coordinates={[
                    { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
                    { latitude: order.delivery_latitude, longitude: order.delivery_longitude },
                  ]}
                  strokeColor={colors.secondary}
                  strokeWidth={2}
                />
              )}
            </SharedMap>
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
            <MaterialIcons name={ICONS.check} size={fontSize.lg} color={colors.secondary} style={{ marginRight: spacing.xs }} />
            <Text style={styles.deliveredText}>Delivered</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
