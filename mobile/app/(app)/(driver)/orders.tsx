import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { useDriverOrders } from '../../../src/hooks/use-driver-orders';
import { DeliveryOrders, Stores } from '../../../src/types/database';
import { calculateDistance } from '../../../src/lib/geo';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/index';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';

type SortKey = 'distance' | 'price' | 'reward' | 'area';

const filters: { key: SortKey; label: string }[] = [
  { key: 'distance', label: 'Distance' },
  { key: 'price', label: 'Price' },
  { key: 'reward', label: 'Reward' },
  { key: 'area', label: 'Area' },
];

export default function AvailableOrdersScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DeliveryOrders[]>([]);
  const [storesMap, setStoresMap] = useState<Record<string, Stores>>({});
  const [activeFilter, setActiveFilter] = useState<SortKey>('distance');
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('available');
  const cancelledRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { activeOrders, completedOrders, loading: driverOrdersLoading, refresh: refreshDriverOrders } = useDriverOrders();

  const refreshAll = useCallback(async (dId: string) => {
    const { data: orderData } = await supabase
      .from('delivery_orders')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (orderData && !cancelledRef.current) {
      setOrders(orderData);
      const storeIds = [...new Set(orderData.map((o) => o.store_id))];
      if (storeIds.length > 0) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('*')
          .in('id', storeIds);
        if (storeData) {
          const map: Record<string, Stores> = {};
          storeData.forEach((s) => { map[s.id] = s; });
          setStoresMap(map);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    cancelledRef.current = false;

    const init = async () => {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id, current_latitude, current_longitude')
        .eq('profile_id', profile.id)
        .single();

      if (!driver || cancelledRef.current) return;
      setDriverId(driver.id);
      setDriverLat(driver.current_latitude);
      setDriverLng(driver.current_longitude);

      await refreshAll(driver.id);

      channelRef.current = supabase.channel('orders-available')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_orders', filter: 'status=eq.pending' }, (payload) => {
          const newOrder = payload.new as DeliveryOrders;
          setOrders((prev) => [newOrder, ...prev]);
          if (newOrder.store_id) {
            supabase.from('stores').select('*').eq('id', newOrder.store_id).single().then(({ data }) => {
              if (data) setStoresMap((prev) => ({ ...prev, [data.id]: data }));
            });
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders' }, (payload) => {
          const updated = payload.new as DeliveryOrders;
          setOrders((prev) => {
            if (updated.status !== 'pending') return prev.filter((o) => o.id !== updated.id);
            if (prev.some((o) => o.id === updated.id)) return prev.map((o) => o.id === updated.id ? updated : o);
            return [updated, ...prev];
          });
        })
        .subscribe();

      if (!cancelledRef.current) setLoading(false);
    };

    init();

    return () => {
      cancelledRef.current = true;
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      if (driverId) {
        refreshAll(driverId);
      }
      refreshDriverOrders();
    }, [driverId, refreshAll, refreshDriverOrders])
  );

  const handleAccept = (orderId: string) => {
    router.push(`/(app)/(driver)/confirm-acceptance?orderId=${orderId}`);
  };

  const sortedOrders = useMemo(() => {
    const sorted = [...orders];
    if (activeFilter === 'distance' && driverLat != null && driverLng != null) {
      sorted.sort((a, b) => {
        const dA = calculateDistance(driverLat, driverLng, a.pickup_latitude, a.pickup_longitude);
        const dB = calculateDistance(driverLat, driverLng, b.pickup_latitude, b.pickup_longitude);
        return dA - dB;
      });
    } else if (activeFilter === 'price') {
      sorted.sort((a, b) => b.delivery_fee - a.delivery_fee);
    } else if (activeFilter === 'reward') {
      sorted.sort((a, b) => b.driver_earnings - a.driver_earnings);
    }
    return sorted;
  }, [orders, activeFilter, driverLat, driverLng]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(app)/(driver)'); }} style={styles.headerBtn}>
          <MaterialIcons name={ICONS.back} size={fontSize.xxl} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{activeTab === 'available' ? 'Available Orders' : 'My Orders'}</Text>
        <TouchableOpacity onPress={() => { if (activeTab === 'available' && driverId) refreshAll(driverId); if (activeTab === 'active') refreshDriverOrders(); }} style={styles.headerBtn}>
          <MaterialIcons name={ICONS.refresh} size={fontSize.xxl} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'available' && styles.tabBtnActive]} onPress={() => setActiveTab('available')}>
          <Text style={[styles.tabBtnText, activeTab === 'available' && styles.tabBtnTextActive]}>Available</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]} onPress={() => setActiveTab('active')}>
          <Text style={[styles.tabBtnText, activeTab === 'active' && styles.tabBtnTextActive]}>My Orders</Text>
          {activeOrders.length > 0 && (
            <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{activeOrders.length}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'available' ? (
        <>
          <View style={styles.filterRow}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.key)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                  <MaterialIcons name={ICONS.dropdown} size={fontSize.sm} color={activeFilter === f.key ? colors.text : colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={sortedOrders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={sortedOrders.length === 0 ? styles.emptyState : styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContent}>
                <MaterialIcons name={ICONS.truck} size={fontSize.giant} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No available orders</Text>
                <Text style={styles.emptySubtitle}>New orders will appear here in real-time</Text>
              </View>
            }
            renderItem={({ item }) => (
              <OrderCard
                order={item}
                store={storesMap[item.store_id]}
                driverLat={driverLat}
                driverLng={driverLng}
                isAccepting={false}
                onAccept={() => handleAccept(item.id)}
                onDetails={() => router.push(`/(app)/(driver)/${item.id}`)}
              />
            )}
          />

          <Text style={styles.refreshNote}>Orders are auto-refreshed every 30 seconds</Text>
        </>
      ) : (
        <FlatList
          data={activeOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={activeOrders.length === 0 && !driverOrdersLoading ? styles.emptyState : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={driverOrdersLoading}
          onRefresh={refreshDriverOrders}
          ListEmptyComponent={
            driverOrdersLoading ? (
              <ActivityIndicator size="large" style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.emptyContent}>
                <MaterialIcons name={ICONS.packageIcon} size={fontSize.giant} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No active orders</Text>
                <Text style={styles.emptySubtitle}>Accepted orders will appear here</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={cardStyles.card} onPress={() => router.push(`/(app)/(driver)/${item.id}`)}>
              <View style={cardStyles.headerRow}>
                <Text style={cardStyles.orderId}>DLV-{item.order_number ?? item.id.slice(0, 4).toUpperCase()}</Text>
                <View style={[statusBadge, { backgroundColor: getStatusBg(colors)[item.status] || colors.border }]}>
                  <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primaryDark }}>{STATUS_LABEL[item.status] || item.status.replace(/_/g, ' ')}</Text>
                </View>
              </View>
              <View style={cardStyles.locationBlock}>
                <View style={cardStyles.locationRow}>
                  <MaterialIcons name={ICONS.store} size={fontSize.md} color={colors.primary} />
                  <View style={cardStyles.locationTextWrap}>
                    <Text style={cardStyles.locationLabel}>Pickup</Text>
                    <Text style={cardStyles.locationAddr}>{item.pickup_address}</Text>
                  </View>
                </View>
                <View style={cardStyles.locationRow}>
                  <MaterialIcons name={ICONS.location} size={fontSize.md} color={colors.text} />
                  <View style={cardStyles.locationTextWrap}>
                    <Text style={cardStyles.locationLabel}>Drop-off</Text>
                    <Text style={cardStyles.locationAddr}>{item.delivery_address}</Text>
                  </View>
                </View>
              </View>
              <View style={cardStyles.footerRow}>
                <Text style={cardStyles.meta}>Fee: {(item.delivery_fee ?? 0).toFixed(0)} YER</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function OrderCard({
  order,
  store,
  driverLat,
  driverLng,
  isAccepting,
  onAccept,
  onDetails,
}: {
  order: DeliveryOrders;
  store?: Stores;
  driverLat: number | null;
  driverLng: number | null;
  isAccepting: boolean;
  onAccept: () => void;
  onDetails: () => void;
}) {
  const colors = useColors();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const distance = useMemo(() => {
    if (driverLat == null || driverLng == null) return null;
    const d = calculateDistance(driverLat, driverLng, order.pickup_latitude, order.pickup_longitude);
    return parseFloat(d.toFixed(1));
  }, [driverLat, driverLng, order.pickup_latitude, order.pickup_longitude]);

  const etaMin = distance != null ? Math.max(1, Math.round((distance / 30) * 60)) : null;

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.headerRow}>
        <Text style={cardStyles.orderId}>DLV-{order.order_number ?? order.id.slice(0, 4).toUpperCase()}</Text>
        <View style={cardStyles.priceWrap}>
          <Text style={cardStyles.price}>{order.delivery_fee.toFixed(0)} YER</Text>
          {order.driver_earnings > 0 && order.driver_earnings !== order.delivery_fee && (
            <Text style={cardStyles.reward}>+ {order.driver_earnings.toFixed(0)} YER Reward</Text>
          )}
        </View>
      </View>

      <View style={cardStyles.locationBlock}>
        <View style={cardStyles.locationRow}>
          <View style={cardStyles.dotOuter}>
            <View style={cardStyles.dotInner} />
          </View>
          <View style={cardStyles.locationTextWrap}>
            <Text style={cardStyles.locationLabel}>Pickup</Text>
            <Text style={cardStyles.locationAddr}>
              {store ? `${store.name} – ${order.pickup_address}` : order.pickup_address}
            </Text>
          </View>
        </View>
        <View style={cardStyles.locationRow}>
          <MaterialIcons name={ICONS.location} size={fontSize.md} color={colors.text} />
          <View style={cardStyles.locationTextWrap}>
            <Text style={cardStyles.locationLabel}>Drop-off</Text>
            <Text style={cardStyles.locationAddr}>{order.delivery_address}</Text>
          </View>
        </View>
      </View>

      <View style={cardStyles.metaRow}>
        <Text style={cardStyles.metaCreated}>{new Date(order.created_at).toLocaleDateString()}</Text>
        <Text style={cardStyles.metaStatus}>{order.status.replace(/_/g, ' ')}</Text>
      </View>

      <View style={cardStyles.divider} />

      <View style={cardStyles.footerRow}>
        <Text style={cardStyles.meta}>
          {distance != null ? `${distance} km` : ''}{etaMin != null ? ` – ${etaMin} min` : ''}
        </Text>
        <View style={cardStyles.actionRow}>
          <TouchableOpacity style={cardStyles.detailsBtn} onPress={onDetails}>
            <Text style={cardStyles.detailsBtnText}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cardStyles.acceptBtn, isAccepting && cardStyles.acceptBtnDisabled]}
            onPress={onAccept}
            disabled={isAccepting}
          >
            <Text style={cardStyles.acceptBtnText}>
              {isAccepting ? 'Accepting...' : 'Accept'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + spacing.xs, backgroundColor: colors.background },
  headerBtn: { width: spacing.xl + spacing.sm, height: spacing.xl + spacing.sm, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, flex: 1, textAlign: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  filterChip: { backgroundColor: colors.surface, borderRadius: fontSize.xl, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.xs + 1, fontWeight: fontWeight.medium, color: colors.textSecondary },
  filterChipTextActive: { color: colors.text, fontWeight: fontWeight.semibold },
  listContent: { paddingTop: spacing.xs, paddingBottom: spacing.sm },
  emptyState: { flex: 1, justifyContent: 'center' },
  emptyContent: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl + spacing.sm },
  refreshNote: { fontSize: fontSize.xxs + 1, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.sm + spacing.xs, backgroundColor: colors.background },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md, gap: 0, marginBottom: spacing.xs,
    backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm + spacing.xs, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: colors.primary },
  tabBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  tabBtnTextActive: { color: colors.text },
  tabBadge: {
    marginLeft: spacing.xs + 2, backgroundColor: colors.primary, borderRadius: fontSize.xxs,
    minWidth: fontSize.xl, height: fontSize.xl, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xs + 2,
  },
  tabBadgeText: { fontSize: fontSize.xxs + 1, fontWeight: fontWeight.bold, color: colors.text },
});

const createCardStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm + spacing.xs, marginHorizontal: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm + spacing.xs },
  orderId: { fontSize: fontSize.md - 1, fontWeight: fontWeight.bold, color: colors.text },
  priceWrap: { alignItems: 'flex-end' },
  price: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  reward: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary, marginTop: spacing.xs },
  locationBlock: { marginBottom: spacing.sm },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2, marginBottom: spacing.sm + 2 },
  dotOuter: { width: fontSize.lg, height: fontSize.lg, borderRadius: fontSize.lg / 2, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  dotInner: { width: spacing.sm, height: spacing.sm, borderRadius: spacing.xs, backgroundColor: colors.primary },
  locationTextWrap: { flex: 1 },
  locationLabel: { fontSize: fontSize.xxs + 1, color: colors.textSecondary, marginBottom: spacing.xs },
  locationAddr: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, lineHeight: fontSize.lg },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs, paddingLeft: fontSize.xxxl - spacing.xs },
  metaCreated: { fontSize: fontSize.xxs + 1, color: colors.textTertiary },
  metaStatus: { fontSize: fontSize.xxs + 1, color: colors.textTertiary, textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm + spacing.xs },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, flex: 1 },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  detailsBtn: { backgroundColor: colors.border, borderRadius: fontSize.xxs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  detailsBtnText: { fontSize: fontSize.xs + 1, fontWeight: fontWeight.semibold, color: colors.text },
  acceptBtn: { backgroundColor: colors.primary, borderRadius: fontSize.xxs, paddingVertical: spacing.sm, paddingHorizontal: fontSize.xl },
  acceptBtnDisabled: { opacity: 0.6 },
  acceptBtnText: { fontSize: fontSize.xs + 1, fontWeight: fontWeight.bold, color: colors.text },
});

const STATUS_LABEL: Record<string, string> = {
  driver_accepted: 'Accepted',
  driver_arrived_store: 'At Store',
  picked_up: 'Picked Up',
  on_the_way: 'On The Way',
  driver_arrived_destination: 'Arrived',
};

const getStatusBg = (colors: ReturnType<typeof useColors>): Record<string, string> => ({
  driver_accepted: colors.primaryLight,
  driver_arrived_store: colors.warningLight,
  picked_up: colors.infoLight,
  on_the_way: colors.primaryLight,
  driver_arrived_destination: colors.warningLight,
});

const statusBadge = {
  paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: borderRadius.sm + 2,
} as const;
