import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, SafeAreaView, Linking, Alert } from 'react-native';
import { useLocalSearchParams, Stack, Link, router } from 'expo-router';
import { Marker, Polyline } from 'react-native-maps';
import SharedMap from '../../../src/components/ui/SharedMap';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';
import { supabase } from '../../../src/lib/supabase';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { DeliveryOrders, DriverLocations, OrderStatusHistory } from '../../../src/types/database';
import { calculateDistance, calculateETA, isValidCoordinate } from '../../../src/lib/geo';

interface DriverProfile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  average_rating: number;
  availability: string;
}

export default function StoreOrderDetailScreen() {
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
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocations | null>(null);
  const [timeline, setTimeline] = useState<OrderStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

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
      const { data } = await supabase.from('delivery_orders').select('*').eq('id', orderId).single();
      if (cancelled) return;
      if (data) {
        setOrder(data);
        if (data.assigned_driver_id) {
          await fetchDriverProfile(data.assigned_driver_id);
          if (cancelled) return;
          const { data: latest } = await supabase.from('driver_locations').select('*').eq('order_id', orderId).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
          if (latest && !cancelled) setDriverLocation(latest);
        }
      }

      const { data: history } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      if (!cancelled && history) setTimeline(history);

      if (cancelled) { setLoading(false); return; }

      channel = supabase.channel(`store-order-${orderId}`);

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

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
    statusBadge: { alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.lg },
    statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs, textTransform: 'uppercase' },
    value: { fontSize: fontSize.md, color: colors.text, marginBottom: spacing.xs },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
    price: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
    trackingCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.lg },
    trackingTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
    trackingSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
    etaText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.secondary, marginVertical: spacing.xs },
    map: { width: '100%', height: 250, borderRadius: borderRadius.md, marginTop: spacing.sm },

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
    timelineCard: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md, marginTop: spacing.sm },
    timelineRow: { flexDirection: 'row', minHeight: 40 },
    timelineLeft: { alignItems: 'center', width: 20, marginRight: spacing.sm },
    timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    timelineLine: { width: 2, flex: 1, marginVertical: 2 },
    timelineContent: { flex: 1, paddingBottom: spacing.sm },
    timelineStatus: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    timelineDate: { fontSize: fontSize.xxs, marginTop: 1 },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, gap: spacing.xs },
    actionBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, marginTop: spacing.sm, gap: spacing.xs },
    editBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, marginTop: spacing.sm, gap: spacing.xs },
    cancelBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  }), [colors]);

  const handleCancel = useCallback(async () => {
    if (!order) return;
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        setCancelling(true);
        await supabase.rpc('cancel_order', { p_order_id: order.id, p_reason: 'Cancelled by store' });
        setCancelling(false);
      }},
    ]);
  }, [order]);

  const handleDuplicate = useCallback(() => {
    router.push('/(app)/(store)/create-order');
  }, []);

  const canEdit = order?.status === 'pending' || order?.status === 'published';
  const canCancel = (order?.status === 'pending' || order?.status === 'published') && !order?.assigned_driver_id;

  const TIMELINE_LABELS: Record<string, string> = {
    pending: 'Order Created',
    published: 'Published',
    driver_accepted: 'Driver Accepted',
    driver_arrived_store: 'Driver Arrived at Store',
    picked_up: 'Picked Up',
    on_the_way: 'On The Way',
    driver_arrived_destination: 'Driver Arrived',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

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

        {(order.status === 'driver_accepted' || order.status === 'driver_arrived_store' || order.status === 'picked_up' || order.status === 'on_the_way') && driverLocation ? (
          <View style={styles.trackingCard}>
            <Text style={styles.trackingTitle}>Live Tracking — Driver</Text>
            {(() => {
              const dist = calculateDistance(driverLocation.latitude, driverLocation.longitude, order.pickup_latitude, order.pickup_longitude);
              const eta = calculateETA(dist);
              return <Text style={styles.etaText}>{dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`} from store — {eta} min</Text>;
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
                <Marker coordinate={{ latitude: order.pickup_latitude, longitude: order.pickup_longitude }} title="Store (Pickup)" pinColor="green" />
              )}
              {isValidCoordinate(order.delivery_latitude, order.delivery_longitude) && (
                <Marker coordinate={{ latitude: order.delivery_latitude, longitude: order.delivery_longitude }} title="Delivery" pinColor="red" />
              )}
              {isValidCoordinate(driverLocation.latitude, driverLocation.longitude) && isValidCoordinate(order.pickup_latitude, order.pickup_longitude) && (
                <Polyline
                  coordinates={[
                    { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
                    { latitude: order.pickup_latitude, longitude: order.pickup_longitude },
                  ]}
                  strokeColor={colors.secondary}
                  strokeWidth={2}
                />
              )}
            </SharedMap>
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

        {timeline.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Order Timeline</Text>
            <View style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {timeline.map((entry, idx) => {
                const isLast = idx === timeline.length - 1;
                const statusColor = (statusColors[entry.new_status] || colors.statusDraft) as string;
                return (
                  <View key={entry.id} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: statusColor }]} />
                      {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineStatus, { color: statusColor }]}>
                        {TIMELINE_LABELS[entry.new_status] || entry.new_status.replace(/_/g, ' ')}
                      </Text>
                      <Text style={[styles.timelineDate, { color: colors.textTertiary }]}>
                        {new Date(entry.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.actionRow}>
          <Link href={`/(app)/(chat)/${orderId}`} style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
            <MaterialIcons name={ICONS.chat} size={fontSize.md} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Chat</Text>
          </Link>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]} onPress={handleDuplicate}>
            <MaterialIcons name="content-copy" size={fontSize.md} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Duplicate</Text>
          </TouchableOpacity>
        </View>

        {canEdit && (
          <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]} onPress={handleDuplicate}>
            <MaterialIcons name="edit" size={fontSize.md} color={colors.primary} />
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Order</Text>
          </TouchableOpacity>
        )}

        {canCancel && (
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.dangerLight }]} onPress={handleCancel} disabled={cancelling}>
            {cancelling ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <MaterialIcons name="cancel" size={fontSize.md} color={colors.danger} />
                <Text style={[styles.cancelBtnText, { color: colors.danger }]}>Cancel Order</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

