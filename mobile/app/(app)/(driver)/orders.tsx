import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { useDriverOrders } from '../../../src/hooks/use-driver-orders';
import { DeliveryOrders, Stores } from '../../../src/types/database';
import { calculateDistance } from '../../../src/lib/geo';

const accentGreen = '#22C55E';
const darkBg = '#121212';
const cardBg = '#1E1E1E';
const textWhite = '#FFFFFF';
const textGray = '#9CA3AF';
const textDim = '#6B6B6B';

type SortKey = 'distance' | 'price' | 'reward' | 'area';

const filters: { key: SortKey; label: string }[] = [
  { key: 'distance', label: 'Distance' },
  { key: 'price', label: 'Price' },
  { key: 'reward', label: 'Reward' },
  { key: 'area', label: 'Area' },
];

export default function AvailableOrdersScreen() {
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

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: darkBg }} />;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{activeTab === 'available' ? 'Available Orders' : 'My Orders'}</Text>
        <TouchableOpacity onPress={() => { if (activeTab === 'available' && driverId) refreshAll(driverId); if (activeTab === 'active') refreshDriverOrders(); }} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>↻</Text>
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
                <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                  {f.label} ▾
                </Text>
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
                <Text style={styles.emptyIcon}>🚚</Text>
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
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>No active orders</Text>
                <Text style={styles.emptySubtitle}>Accepted orders will appear here</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={cardStyles.card} onPress={() => router.push(`/(app)/(driver)/${item.id}`)}>
              <View style={cardStyles.headerRow}>
                <Text style={cardStyles.orderId}>DLV-{item.order_number ?? item.id.slice(0, 4).toUpperCase()}</Text>
                <View style={[statusBadge, { backgroundColor: STATUS_BG[item.status] || '#2A2A2A' }]}>
                  <Text style={statusBadgeText}>{STATUS_LABEL[item.status] || item.status.replace(/_/g, ' ')}</Text>
                </View>
              </View>
              <View style={cardStyles.locationBlock}>
                <View style={cardStyles.locationRow}>
                  <Text style={{ fontSize: 16, color: accentGreen }}>{'\u{1F3EA}'}</Text>
                  <View style={cardStyles.locationTextWrap}>
                    <Text style={cardStyles.locationLabel}>Pickup</Text>
                    <Text style={cardStyles.locationAddr}>{item.pickup_address}</Text>
                  </View>
                </View>
                <View style={cardStyles.locationRow}>
                  <Text style={{ fontSize: 16 }}>{'\u{1F4CD}'}</Text>
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
          <Text style={cardStyles.pinIcon}>📍</Text>
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

const cardStyles = StyleSheet.create({
  card: { backgroundColor: cardBg, borderRadius: 16, padding: 16, marginBottom: 12, marginHorizontal: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderId: { fontSize: 15, fontWeight: '700', color: textWhite },
  priceWrap: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '700', color: textWhite },
  reward: { fontSize: 12, fontWeight: '600', color: accentGreen, marginTop: 2 },
  locationBlock: { marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  dotOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: accentGreen, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: accentGreen },
  pinIcon: { fontSize: 16, marginTop: 2 },
  locationTextWrap: { flex: 1 },
  locationLabel: { fontSize: 11, color: textGray, marginBottom: 2 },
  locationAddr: { fontSize: 14, fontWeight: '600', color: textWhite, lineHeight: 18 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, paddingLeft: 28 },
  metaCreated: { fontSize: 11, color: textDim },
  metaStatus: { fontSize: 11, color: textDim, textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: '#2A2A2A', marginVertical: 12 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 12, color: textGray, flex: 1 },
  actionRow: { flexDirection: 'row', gap: 8 },
  detailsBtn: { backgroundColor: '#2A2A2A', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  detailsBtnText: { fontSize: 13, fontWeight: '600', color: textWhite },
  acceptBtn: { backgroundColor: accentGreen, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20 },
  acceptBtnDisabled: { opacity: 0.6 },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: textWhite },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkBg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: darkBg },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { fontSize: 22, color: textWhite },
  headerTitle: { fontSize: 18, fontWeight: '700', color: textWhite, flex: 1, textAlign: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  filterChip: { backgroundColor: cardBg, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: '#2A2A2A' },
  filterChipActive: { backgroundColor: accentGreen, borderColor: accentGreen },
  filterChipText: { fontSize: 13, fontWeight: '500', color: textGray },
  filterChipTextActive: { color: textWhite, fontWeight: '600' },
  listContent: { paddingTop: 4, paddingBottom: 8 },
  emptyState: { flex: 1, justifyContent: 'center' },
  emptyContent: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: textWhite, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: textGray, textAlign: 'center', paddingHorizontal: 40 },
  refreshNote: { fontSize: 11, color: textDim, textAlign: 'center', paddingVertical: 12, backgroundColor: darkBg },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 0, marginBottom: 4,
    backgroundColor: darkBg, borderBottomWidth: 1, borderBottomColor: '#2A2A2A',
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: accentGreen },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: textGray },
  tabBtnTextActive: { color: textWhite },
  tabBadge: {
    marginLeft: 6, backgroundColor: accentGreen, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});

const STATUS_LABEL: Record<string, string> = {
  driver_accepted: 'Accepted',
  driver_arrived_store: 'At Store',
  picked_up: 'Picked Up',
  on_the_way: 'On The Way',
  driver_arrived_destination: 'Arrived',
};

const STATUS_BG: Record<string, string> = {
  driver_accepted: '#064E3B',
  driver_arrived_store: '#713F12',
  picked_up: '#1E3A5F',
  on_the_way: '#064E3B',
  driver_arrived_destination: '#713F12',
};

const statusBadge = {
  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
} as const;

const statusBadgeText = {
  fontSize: 12, fontWeight: '700' as const, color: '#4ADE80',
};
