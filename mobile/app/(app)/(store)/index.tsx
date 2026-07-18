import { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Link, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ICONS } from '../../../src/constants/icons';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { DeliveryOrders } from '../../../src/types/database';

export default function StoreOrdersScreen() {
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

  const profile = useAuthStore((s) => s.profile);
  const [orders, setOrders] = useState<DeliveryOrders[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_id', profile.id).single();
      if (cancelled) return;
      if (!store) { setLoading(false); return; }

      const { data } = await supabase
        .from('delivery_orders')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (!cancelled && data) setOrders(data);
      if (!cancelled) setLoading(false);

      channel = supabase.channel(`store-orders-${profile.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_orders', filter: `store_id=eq.${store.id}` }, (payload) => {
          setOrders((prev) => [payload.new as DeliveryOrders, ...prev]);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `store_id=eq.${store.id}` }, (payload) => {
          setOrders((prev) => prev.map((o) => o.id === payload.new.id ? payload.new as DeliveryOrders : o));
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'delivery_orders', filter: `store_id=eq.${store.id}` }, (payload) => {
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

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
    createButton: { backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
    createButtonText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    emptyState: { flex: 1, justifyContent: 'center' },
    emptyContent: { alignItems: 'center' },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
    emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
    orderCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
    orderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
    statusDot: { width: 8, height: 8, borderRadius: borderRadius.sm, marginRight: spacing.sm },
    orderStatus: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, flex: 1 },
    orderPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
    customerName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
    route: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  }), [colors]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
      <Link href="/(app)/(store)/create-order" style={styles.createButton}>
        <Text style={styles.createButtonText}>+ New Order</Text>
      </Link>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orders.length === 0 ? styles.emptyState : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <MaterialIcons name={ICONS.clipboard} size={fontSize.giant} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>Create your first delivery order to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => router.push(`/(app)/(store)/${item.id}`)}
          >
            <View style={styles.orderHeader}>
              <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] || colors.statusDraft }]} />
              <Text style={[styles.orderStatus, { color: statusColors[item.status] || colors.statusDraft }]}>
                {item.status.toUpperCase()}
              </Text>
              <Text style={styles.orderPrice}>${item.delivery_fee.toFixed(2)}</Text>
            </View>
            <Text style={styles.customerName}>{item.customer_name}</Text>
            <Text style={styles.route}>{item.pickup_address}</Text>
          </TouchableOpacity>
        )}
      />
      </View>
    </SafeAreaView>
  );
}

