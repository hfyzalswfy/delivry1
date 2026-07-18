import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { DeliveryOrders } from '../../types/database';

interface AvailableOrdersSectionProps {
  orders: (DeliveryOrders & { distance?: number })[];
}

export function AvailableOrdersSection({ orders }: AvailableOrdersSectionProps) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.text }]}>Available Orders Nearby</Text>
      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No orders available right now</Text>
        </View>
      ) : (
        <FlatList
          horizontal
          data={orders}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: spacing.lg, paddingRight: spacing.sm, gap: spacing.sm + 4 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} 
              onPress={() => router.push(`/(app)/(driver)/${item.id}`)}
            >
              <Text style={[styles.cardId, { color: colors.text }]}>
                ID: {item.order_number ?? item.id.slice(0, 8)}
                {item.distance != null ? ` | ${item.distance} mi` : ''}
              </Text>
              <Text style={[styles.cardRoute, { color: colors.textTertiary }]} numberOfLines={2}>
                {item.pickup_address?.split(',')[0]} {'\u2192'} {item.delivery_address?.split(',')[0]}
              </Text>
              <View style={styles.cardBottom}>
                <Text style={[styles.cardPrice, { color: colors.primary }]}>${item.delivery_fee.toFixed(2)}</Text>
                <TouchableOpacity 
                  style={[styles.viewBtn, { backgroundColor: colors.primary }]} 
                  onPress={() => router.push(`/(app)/(driver)/${item.id}`)}
                >
                  <Text style={[styles.viewBtnText, { color: '#fff' }]}>View</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  title: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  emptyWrap: { paddingHorizontal: spacing.lg },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },
  card: { width: 260, borderRadius: borderRadius.lg, padding: spacing.md, marginRight: 0 },
  cardId: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs + 2 },
  cardRoute: { fontSize: fontSize.xs + 1, lineHeight: 18, marginBottom: spacing.sm + 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: fontSize.md, fontWeight: '700' },
  viewBtn: { borderRadius: borderRadius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  viewBtnText: { fontSize: fontSize.xs + 1, fontWeight: '600' },
});
