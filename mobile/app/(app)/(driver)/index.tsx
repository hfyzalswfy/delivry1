import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';
import { DeliveryOrders } from '../../../src/types/database';

const statusColors: Record<string, string> = {
  pending: colors.statusDraft,
  driver_accepted: colors.statusAssigned,
  driver_arrived_store: colors.statusPublished,
  picked_up: colors.statusPickedUp,
  on_the_way: colors.statusInTransit,
  delivered: colors.statusDelivered,
  cancelled: colors.statusCancelled,
};

export default function DriverOrdersScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [orders, setOrders] = useState<DeliveryOrders[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data } = await supabase
        .from('delivery_orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (!cancelled && data) setOrders(data);
      if (!cancelled) setLoading(false);

      channel = supabase.channel('driver-orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_orders', filter: 'status=eq.pending' }, (payload) => {
          setOrders((prev) => [payload.new as DeliveryOrders, ...prev]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: 'status=eq.pending' }, (payload) => {
          setOrders((prev) => prev.map((o) => o.id === payload.new.id ? payload.new as DeliveryOrders : o));
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'delivery_orders', filter: 'status=eq.pending' }, (payload) => {
          setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
        })
        .subscribe();
    };

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
      <Text style={styles.welcome}>Welcome, {profile?.full_name ?? 'Driver'}</Text>

      <TouchableOpacity style={styles.myOrdersButton} onPress={() => router.push('/(app)/(driver)/orders')}>
        <Text style={styles.myOrdersButtonText}>📦 My Orders</Text>
      </TouchableOpacity>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orders.length === 0 ? styles.emptyState : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyTitle}>No available orders</Text>
            <Text style={styles.emptySubtitle}>New orders will appear here in real-time</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => router.push(`/(app)/(driver)/${item.id}`)}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderStatus}>AVAILABLE</Text>
              <Text style={styles.orderPrice}>${item.delivery_fee.toFixed(2)}</Text>
            </View>
            <Text style={styles.orderCustomer}>{item.customer_name}</Text>
            <Text style={styles.orderRoute}>{item.pickup_address}</Text>
          </TouchableOpacity>
        )}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  welcome: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  myOrdersButton: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm, alignItems: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  myOrdersButtonText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center' },
  emptyContent: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  orderCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  orderStatus: { fontSize: fontSize.xs, fontWeight: '700', color: colors.statusPublished },
  orderPrice: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
  orderCustomer: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  orderRoute: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
});
