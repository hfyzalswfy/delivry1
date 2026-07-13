import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Switch, Dimensions, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { DeliveryOrders, Drivers } from '../../../src/types/database';
import { calculateDistance } from '../../../src/lib/geo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;

const accentGreen = '#22C55E';
const darkBg = '#121212';
const cardBg = '#1E1E1E';
const textWhite = '#FFFFFF';
const textGray = '#9CA3AF';
const redBadge = '#EF4444';

export default function DriverHomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(true);
  const [driverRecord, setDriverRecord] = useState<Drivers | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeDeliveries, setActiveDeliveries] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [weeklyDeliveries, setWeeklyDeliveries] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [availableOrders, setAvailableOrders] = useState<DeliveryOrders[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const cancelledRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const driverId = driverRecord?.id;

  const fetchDriverData = useCallback(async () => {
    if (!profile) return;
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('profile_id', profile.id)
      .single();
    if (driver && !cancelledRef.current) {
      setDriverRecord(driver);
      setIsOnline(driver.availability === 'online');
    }
    return driver;
  }, [profile]);

  const fetchStats = useCallback(async (dId: string) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [
      { count: activeCount },
      { count: todayCount },
      { data: earningsData },
      { data: weekData },
      { count: notifCount },
    ] = await Promise.all([
      supabase.from('delivery_orders').select('id', { count: 'exact', head: true })
        .eq('assigned_driver_id', dId).not('status', 'in', '("delivered","cancelled")'),
      supabase.from('delivery_orders').select('id', { count: 'exact', head: true })
        .eq('assigned_driver_id', dId).eq('status', 'delivered').gte('delivered_at', todayStart.toISOString()),
      supabase.from('delivery_orders').select('driver_earnings')
        .eq('assigned_driver_id', dId).eq('status', 'delivered'),
      supabase.from('delivery_orders').select('driver_earnings')
        .eq('assigned_driver_id', dId).eq('status', 'delivered').gte('delivered_at', weekStart.toISOString()),
      supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('profile_id', profile!.id).is('read_at', null),
    ]);

    if (cancelledRef.current) return;
    setActiveDeliveries(activeCount ?? 0);
    setCompletedToday(todayCount ?? 0);
    setTotalEarnings((earningsData ?? []).reduce((s, r) => s + (r.driver_earnings ?? 0), 0));
    setWeeklyDeliveries(weekData?.length ?? 0);
    setWeeklyEarnings((weekData ?? []).reduce((s, r) => s + (r.driver_earnings ?? 0), 0));
    setUnreadNotifCount(notifCount ?? 0);
  }, [profile]);

  const fetchAvailableOrders = useCallback(async () => {
    const { data } = await supabase
      .from('delivery_orders')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data && !cancelledRef.current) setAvailableOrders(data);
  }, []);

  useEffect(() => {
    if (!profile) return;
    cancelledRef.current = false;

    const init = async () => {
      const driver = await fetchDriverData();
      if (!driver || cancelledRef.current) return;
      await Promise.all([fetchStats(driver.id), fetchAvailableOrders()]);
      if (cancelledRef.current) return;

      channelRef.current = supabase.channel('driver-home-orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_orders', filter: 'status=eq.pending' }, (payload) => {
          setAvailableOrders((prev) => [payload.new as DeliveryOrders, ...prev]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders' }, (payload) => {
          const updated = payload.new as DeliveryOrders;
          setAvailableOrders((prev) => {
            if (updated.status !== 'pending') return prev.filter((o) => o.id !== updated.id);
            if (prev.some((o) => o.id === updated.id)) return prev.map((o) => o.id === updated.id ? updated : o);
            return [updated, ...prev];
          });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_orders', filter: `assigned_driver_id=eq.${driver.id}` }, () => {
          fetchStats(driver.id);
        })
        .subscribe();

      if (!cancelledRef.current) setLoading(false);
    };

    init();

    return () => {
      cancelledRef.current = true;
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [profile?.id, fetchDriverData, fetchStats, fetchAvailableOrders]);

  useFocusEffect(
    useCallback(() => {
      if (!driverId) return;
      fetchStats(driverId);
      fetchAvailableOrders();
    }, [driverId, fetchStats, fetchAvailableOrders])
  );

  const onRefresh = useCallback(async () => {
    if (!driverId) return;
    setRefreshing(true);
    await Promise.all([fetchStats(driverId), fetchAvailableOrders()]);
    setRefreshing(false);
  }, [driverId, fetchStats, fetchAvailableOrders]);

  const toggleOnline = async () => {
    if (!driverId) return;
    const newStatus = !isOnline ? 'online' : 'offline';
    setIsOnline(!isOnline);
    await supabase.from('drivers').update({ availability: newStatus }).eq('id', driverId);
  };

  const ordersWithDistance = useMemo(() => {
    if (!driverRecord?.current_latitude) return availableOrders;
    return availableOrders.map((o) => {
      const dist = calculateDistance(
        driverRecord.current_latitude!, driverRecord.current_longitude!,
        o.pickup_latitude, o.pickup_longitude,
      );
      return { ...o, distance: parseFloat(dist.toFixed(1)) };
    });
  }, [availableOrders, driverRecord?.current_latitude, driverRecord?.current_longitude]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: darkBg }} />;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentGreen} />}>
        <Header
          name={profile?.full_name ?? 'Driver'}
          unreadCount={unreadNotifCount}
          isOnline={isOnline}
          onToggleOnline={toggleOnline}
        />
        <StatsGrid
          activeDeliveries={activeDeliveries}
          completedToday={completedToday}
          earnings={totalEarnings}
          rating={driverRecord?.average_rating ?? 0}
        />
        <AvailableOrdersSection orders={ordersWithDistance} />
        <QuickActions />
        <PerformanceSummary weeklyDeliveries={weeklyDeliveries} weeklyEarnings={weeklyEarnings} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function Header({ name, unreadCount, isOnline, onToggleOnline }: { name: string; unreadCount: number; isOnline: boolean; onToggleOnline: () => void }) {
  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.topRow}>
        <Text style={headerStyles.greeting}>Hi, {name} 👋</Text>
        <TouchableOpacity style={headerStyles.bellWrap} onPress={() => router.push('/(app)/(driver)/orders')}>
          <Text style={headerStyles.bellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={headerStyles.badge}>
              <Text style={headerStyles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={headerStyles.toggleRow}>
        <View style={headerStyles.toggleLeft}>
          <Text style={headerStyles.powerIcon}>⚡</Text>
          <Text style={headerStyles.onlineText}>Online</Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={onToggleOnline}
          trackColor={{ false: '#3A3A3A', true: accentGreen }}
          thumbColor={isOnline ? textWhite : textGray}
        />
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 24, fontWeight: '700', color: textWhite },
  bellWrap: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 24 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: redBadge, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: textWhite },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: cardBg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  powerIcon: { fontSize: 18 },
  onlineText: { fontSize: 15, fontWeight: '600', color: textWhite },
});

function StatsGrid({ activeDeliveries, completedToday, earnings, rating }: { activeDeliveries: number; completedToday: number; earnings: number; rating: number }) {
  const stats = useMemo(() => [
    { icon: '📦', value: activeDeliveries.toString(), label: 'Active Deliveries' },
    { icon: '✅', value: completedToday.toString(), label: 'Completed Today' },
    { icon: '👛', value: `$${earnings.toFixed(2)}`, label: 'Earnings' },
    { icon: '⭐', value: rating.toFixed(1), label: 'Rating' },
  ], [activeDeliveries, completedToday, earnings, rating]);

  return (
    <View style={statsGridStyles.grid}>
      {stats.map((s, i) => (
        <View key={i} style={statsGridStyles.card}>
          <Text style={statsGridStyles.icon}>{s.icon}</Text>
          <Text style={statsGridStyles.value}>{s.value}</Text>
          <Text style={statsGridStyles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const statsGridStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  card: { width: '48%', backgroundColor: cardBg, borderRadius: 16, padding: 16, alignItems: 'center' },
  icon: { fontSize: 28, marginBottom: 8 },
  value: { fontSize: 22, fontWeight: '700', color: textWhite, marginBottom: 4 },
  label: { fontSize: 12, color: textGray, textAlign: 'center' },
});

function AvailableOrdersSection({ orders }: { orders: (DeliveryOrders & { distance?: number })[] }) {
  return (
    <View style={availStyles.section}>
      <Text style={availStyles.title}>Available Orders Nearby</Text>
      {orders.length === 0 ? (
        <View style={availStyles.emptyWrap}>
          <Text style={availStyles.emptyText}>No orders available right now</Text>
        </View>
      ) : (
        <FlatList
          horizontal
          data={orders}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 8, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={availStyles.card} onPress={() => router.push(`/(app)/(driver)/${item.id}`)}>
              <Text style={availStyles.cardId}>
                ID: {item.order_number ?? item.id.slice(0, 8)}
                {item.distance != null ? ` | ${item.distance} mi` : ''}
              </Text>
              <Text style={availStyles.cardRoute} numberOfLines={2}>
                {item.pickup_address.split(',')[0]} → {item.delivery_address.split(',')[0]}
              </Text>
              <View style={availStyles.cardBottom}>
                <Text style={availStyles.cardPrice}>${item.delivery_fee.toFixed(2)}</Text>
                <TouchableOpacity style={availStyles.viewBtn} onPress={() => router.push(`/(app)/(driver)/${item.id}`)}>
                  <Text style={availStyles.viewBtnText}>View</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const availStyles = StyleSheet.create({
  section: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: textWhite, marginBottom: 12, paddingHorizontal: 20 },
  emptyWrap: { paddingHorizontal: 20 },
  emptyText: { fontSize: 14, color: textGray, textAlign: 'center', paddingVertical: 24 },
  card: { width: CARD_WIDTH, backgroundColor: cardBg, borderRadius: 16, padding: 16, marginRight: 0 },
  cardId: { fontSize: 14, fontWeight: '600', color: textWhite, marginBottom: 6 },
  cardRoute: { fontSize: 13, color: textGray, lineHeight: 18, marginBottom: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 16, fontWeight: '700', color: accentGreen },
  viewBtn: { backgroundColor: accentGreen, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20 },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: textWhite },
});

function QuickActions() {
  const actions = [
    { icon: '🗺️', label: 'Browse Orders', onPress: () => router.push('/(app)/(driver)/orders') },
    { icon: '👛', label: 'Wallet', onPress: () => router.push('/(app)/(driver)/wallet') },
    { icon: '🎁', label: 'Rewards', onPress: () => router.push('/(app)/(driver)/rewards') },
    { icon: '🕐', label: 'History', onPress: () => router.push('/(app)/(driver)/orders') },
  ];

  return (
    <View style={qaStyles.section}>
      <Text style={qaStyles.title}>Quick Actions</Text>
      <View style={qaStyles.row}>
        {actions.map((a, i) => (
          <TouchableOpacity key={i} style={qaStyles.btn} onPress={a.onPress} activeOpacity={0.7}>
            <View style={qaStyles.iconWrap}>
              <Text style={qaStyles.icon}>{a.icon}</Text>
              {i === 2 && <View style={qaStyles.notifDot} />}
            </View>
            <Text style={qaStyles.label}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const qaStyles = StyleSheet.create({
  section: { marginBottom: 20, paddingHorizontal: 20 },
  title: { fontSize: 18, fontWeight: '700', color: textWhite, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { alignItems: 'center', width: '22%' },
  iconWrap: { position: 'relative', width: 56, height: 56, borderRadius: 16, backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  icon: { fontSize: 24 },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: redBadge },
  label: { fontSize: 11, color: textGray, textAlign: 'center' },
});

const PerformanceSummary = React.memo(function PerformanceSummaryInner({ weeklyDeliveries, weeklyEarnings }: { weeklyDeliveries: number; weeklyEarnings: number }) {
  const deliveryTarget = 60;
  const earningsTarget = 800;
  const deliveryPct = Math.min(weeklyDeliveries / deliveryTarget, 1);
  const earningsPct = Math.min(weeklyEarnings / earningsTarget, 1);

  return (
    <View style={perfStyles.section}>
      <Text style={perfStyles.title}>Performance Summary</Text>
      <View style={perfStyles.card}>
        <View style={perfStyles.row}>
          <Text style={perfStyles.label}>Deliveries This Week</Text>
          <Text style={perfStyles.value}>{weeklyDeliveries} / {deliveryTarget}</Text>
        </View>
        <View style={perfStyles.progressBg}>
          <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ flex: deliveryPct, backgroundColor: accentGreen, height: 8, borderRadius: 4 }} />
            <View style={{ flex: 1 - deliveryPct }} />
          </View>
        </View>
        <View style={[perfStyles.row, { marginTop: 16 }]}>
          <Text style={perfStyles.label}>Earnings Target</Text>
          <Text style={perfStyles.value}>${weeklyEarnings.toFixed(0)} / ${earningsTarget}</Text>
        </View>
        <View style={perfStyles.progressBg}>
          <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ flex: earningsPct, backgroundColor: accentGreen, height: 8, borderRadius: 4 }} />
            <View style={{ flex: 1 - earningsPct }} />
          </View>
        </View>
      </View>
    </View>
  );
});

const perfStyles = StyleSheet.create({
  section: { paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: textWhite, marginBottom: 12 },
  card: { backgroundColor: cardBg, borderRadius: 16, padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, color: textGray },
  value: { fontSize: 14, fontWeight: '600', color: textWhite },
  progressBg: { height: 8, backgroundColor: '#2A2A2A', borderRadius: 4, overflow: 'hidden' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkBg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
});
