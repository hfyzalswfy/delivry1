import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, RefreshControl, SafeAreaView,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useDriverOrders } from '../../../src/hooks/use-driver-orders';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';
import { DeliveryOrders } from '../../../src/types/database';
import { calculateDistance, calculateETA } from '../../../src/lib/geo';

type TabKey = 'active' | 'completed' | 'cancelled';

const statusColors: Record<string, string> = {
  driver_accepted: colors.statusAssigned,
  driver_arrived_store: colors.statusPublished,
  picked_up: colors.statusPickedUp,
  on_the_way: colors.statusInTransit,
  delivered: colors.statusDelivered,
  cancelled: colors.statusCancelled,
};

const tabs: { key: TabKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function DriverOrdersScreen() {
  const { activeOrders, completedOrders, cancelledOrders, loading, refresh } = useDriverOrders();
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const ordersMap: Record<TabKey, DeliveryOrders[]> = useMemo(() => ({
    active: activeOrders,
    completed: completedOrders,
    cancelled: cancelledOrders,
  }), [activeOrders, completedOrders, cancelledOrders]);

  const filteredOrders = useMemo(() => {
    const list = ordersMap[activeTab];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((o) =>
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.includes(q) ||
      o.pickup_address?.toLowerCase().includes(q) ||
      o.delivery_address?.toLowerCase().includes(q),
    );
  }, [ordersMap, activeTab, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'My Orders' }} />
      <View style={styles.container}>

      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const count = ordersMap[tab.key].length;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder={`Search ${activeTab} orders...`}
        placeholderTextColor={colors.textSecondary}
      />

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={filteredOrders.length === 0 ? styles.emptyState : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>
              {search ? 'No matching orders' : `No ${activeTab} orders`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try a different search term' : `Your ${activeTab} deliveries will appear here`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => router.push(`/(app)/(driver)/${item.id}`)}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderNumber}>{item.order_number}</Text>
              <Text style={[styles.orderStatus, { color: statusColors[item.status] || colors.textSecondary }]}>
                {item.status.replace(/_/g, ' ').toUpperCase()}
              </Text>
              <Text style={styles.orderFee}>${item.delivery_fee.toFixed(2)}</Text>
            </View>
            <Text style={styles.customerName}>{item.customer_name} — {item.customer_phone}</Text>
            <Text style={styles.route} numberOfLines={1}>
              📍 {item.pickup_address} → {item.delivery_address}
            </Text>
          </TouchableOpacity>
        )}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  tabRow: { flexDirection: 'row', marginBottom: spacing.sm, gap: spacing.xs },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#fff' },
  badge: { marginLeft: spacing.xs, backgroundColor: colors.border, borderRadius: borderRadius.full, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  badgeTextActive: { color: '#fff' },
  searchInput: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm, fontSize: fontSize.sm, backgroundColor: colors.surface, marginBottom: spacing.sm, color: colors.text },
  emptyState: { flex: 1, justifyContent: 'center' },
  emptyContent: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  orderCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  orderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  orderNumber: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary, marginRight: spacing.sm },
  orderStatus: { fontSize: fontSize.xs, fontWeight: '700', flex: 1 },
  orderFee: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  customerName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  route: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
});
