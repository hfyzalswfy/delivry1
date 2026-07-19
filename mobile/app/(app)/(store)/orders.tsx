import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SearchBar } from '../../../src/components/store/SearchBar';
import { useAuthStore } from '../../../src/store/auth-store';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { DeliveryOrders } from '../../../src/types/database';

const STATUS_TABS = ['All', 'Pending', 'Active', 'Delivered', 'Cancelled'] as const;
const PAGE_SIZE = 20;

const STATUS_FILTER_MAP: Record<string, string[]> = {
  All: [],
  Pending: ['pending', 'published'],
  Active: ['driver_accepted', 'driver_arrived_store', 'picked_up', 'on_the_way', 'driver_arrived_destination'],
  Delivered: ['delivered'],
  Cancelled: ['cancelled'],
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'statusDraft',
  published: 'statusPublished',
  driver_accepted: 'statusAssigned',
  driver_arrived_store: 'statusPublished',
  picked_up: 'statusPickedUp',
  on_the_way: 'statusInTransit',
  driver_arrived_destination: 'statusInTransit',
  delivered: 'statusDelivered',
  cancelled: 'statusCancelled',
};

export default function StoreOrdersScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const [orders, setOrders] = useState<DeliveryOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof typeof STATUS_FILTER_MAP>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const storeIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o) =>
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        o.order_number.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, searchQuery]);

  const fetchOrders = useCallback(async (page = 0, append = false) => {
    if (!storeIdRef.current) return;
    const statuses = STATUS_FILTER_MAP[activeTab];
    
    let query = supabase
      .from('delivery_orders')
      .select('*')
      .eq('store_id', storeIdRef.current)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statuses.length > 0) {
      query = query.in('status', statuses);
    }

    const { data } = await query;
    if (cancelledRef.current) return;

    if (data) {
      if (append) {
        setOrders((prev) => [...prev, ...data]);
      } else {
        setOrders(data);
      }
      setHasMore(data.length === PAGE_SIZE);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!profile) return;
    cancelledRef.current = false;
    let channel: RealtimeChannel | null = null;

    const init = async () => {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_id', profile.id).single();
      if (!store || cancelledRef.current) { setLoading(false); return; }
      storeIdRef.current = store.id;
      pageRef.current = 0;
      await fetchOrders(0, false);
      if (!cancelledRef.current) setLoading(false);

      channel = supabase.channel(`store-orders-list-${profile.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_orders', filter: `store_id=eq.${store.id}` }, () => {
          fetchOrders(0, false);
        })
        .subscribe();
    };

    init();

    return () => {
      cancelledRef.current = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [profile?.id, activeTab]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    pageRef.current = 0;
    await fetchOrders(0, false);
    setRefreshing(false);
  }, [fetchOrders]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    pageRef.current += 1;
    await fetchOrders(pageRef.current, true);
  }, [hasMore, loading, fetchOrders]);

  const handleTabChange = useCallback((tab: keyof typeof STATUS_FILTER_MAP) => {
    setActiveTab(tab);
    pageRef.current = 0;
    setOrders([]);
    setLoading(true);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'All Orders' }} />
        <ActivityIndicator size="large" style={{ flex: 1 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'All Orders' }} />
      
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search by name, phone, or order #" />

      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomWidth: 2, borderBottomColor: colors.primary },
            ]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab ? colors.primary : colors.textSecondary },
              activeTab === tab && { fontWeight: fontWeight.bold },
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="assignment" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No orders found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              {searchQuery ? 'Try a different search term' : 'Create a new order to get started'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const colorKey = STATUS_COLORS[item.status] || 'statusDraft';
          const statusColor = colors[colorKey as keyof typeof colors] as string;
          return (
            <TouchableOpacity
              style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/(app)/(store)/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.orderHeader}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.orderStatus, { color: statusColor }]}>{item.status.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={[styles.orderFee, { color: colors.primary }]}>${Number(item.delivery_fee).toFixed(2)}</Text>
              </View>
              <Text style={[styles.customerName, { color: colors.text }]}>{item.customer_name}</Text>
              <Text style={[styles.orderNum, { color: colors.textTertiary }]}>#{item.order_number}</Text>
              <Text style={[styles.route, { color: colors.textSecondary }]} numberOfLines={1}>{item.delivery_address}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  tab: { marginRight: spacing.lg, paddingBottom: spacing.sm },
  tabLabel: { fontSize: fontSize.sm, textTransform: 'uppercase' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  orderCard: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm },
  orderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: spacing.xs, marginRight: spacing.sm },
  orderStatus: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, flex: 1 },
  orderFee: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  customerName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  orderNum: { fontSize: fontSize.xs, marginTop: 1 },
  route: { fontSize: fontSize.sm, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: spacing.xxl * 2 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginTop: spacing.md },
  emptySubtitle: { fontSize: fontSize.sm, marginTop: spacing.xs, textAlign: 'center' },
});
