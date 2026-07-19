import { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SearchBar } from '../../../src/components/store/SearchBar';
import { supabase } from '../../../src/lib/supabase';
import { useAuthStore } from '../../../src/store/auth-store';
import { useColors } from '../../../src/theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../src/theme/spacing';
import { DeliveryOrders } from '../../../src/types/database';

interface CustomerSummary {
  phone: string;
  name: string;
  totalOrders: number;
  lastOrderDate: string | null;
  sampleOrderId: string | null;
}

export default function StoreCustomersScreen() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_id', profile.id).single();
      if (store) setStoreId(store.id);
    })();
  }, [profile]);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const { data: orders } = await supabase
        .from('delivery_orders')
        .select('customer_name, customer_phone, id, created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (orders) {
        const map = new Map<string, CustomerSummary>();
        for (const o of orders) {
          if (!map.has(o.customer_phone)) {
            map.set(o.customer_phone, {
              phone: o.customer_phone,
              name: o.customer_name,
              totalOrders: 0,
              lastOrderDate: null,
              sampleOrderId: null,
            });
          }
          const entry = map.get(o.customer_phone)!;
          entry.totalOrders += 1;
          if (!entry.lastOrderDate || o.created_at > entry.lastOrderDate) {
            entry.lastOrderDate = o.created_at;
            entry.sampleOrderId = o.id;
          }
        }
        setCustomers(Array.from(map.values()));
      }
      setLoading(false);
    })();
  }, [storeId]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, searchQuery]);

  const handleQuickOrder = (phone: string, name: string) => {
    const store = useAuthStore.getState();
    router.push('/(app)/(store)/create-order');
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Customers' }} />
        <ActivityIndicator size="large" style={{ flex: 1 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Customers' }} />

      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search by name or phone" />

      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.phone}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="people" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              {searchQuery ? 'Try a different search term' : 'Customers appear after their first order'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.customerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => item.sampleOrderId && router.push(`/(app)/(store)/${item.sampleOrderId}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={[styles.customerName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.customerPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
              <Text style={[styles.customerMeta, { color: colors.textTertiary }]}>
                {item.totalOrders} order{item.totalOrders !== 1 ? 's' : ''}
                {item.lastOrderDate ? ` · Last: ${new Date(item.lastOrderDate).toLocaleDateString()}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.quickOrderBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => handleQuickOrder(item.phone, item.name)}
            >
              <MaterialIcons name="add-circle" size={22} color={colors.primary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  customerCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  avatarText: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  customerInfo: { flex: 1 },
  customerName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  customerPhone: { fontSize: fontSize.sm, marginTop: 1 },
  customerMeta: { fontSize: fontSize.xs, marginTop: 1 },
  quickOrderBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.sm },
  emptyState: { alignItems: 'center', paddingTop: spacing.xxl * 2 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginTop: spacing.md },
  emptySubtitle: { fontSize: fontSize.sm, marginTop: spacing.xs, textAlign: 'center' },
});
