import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../theme/spacing';
import { DeliveryOrders } from '../../types/database';

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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  published: 'Published',
  driver_accepted: 'Driver Accepted',
  driver_arrived_store: 'Driver Arrived',
  picked_up: 'Picked Up',
  on_the_way: 'On The Way',
  driver_arrived_destination: 'Arrived',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

interface RecentOrderItemProps {
  order: DeliveryOrders;
}

export function RecentOrderItem({ order }: RecentOrderItemProps) {
  const colors = useColors();
  const statusKey = STATUS_COLORS[order.status] || 'statusDraft';
  const statusColor = colors[statusKey as keyof typeof colors] as string;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push(`/(app)/(store)/${order.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={styles.content}>
          <Text style={[styles.orderNum, { color: colors.text }]}>#{order.order_number}</Text>
          <Text style={[styles.customer, { color: colors.textSecondary }]} numberOfLines={1}>
            {order.customer_name}
          </Text>
          <Text style={[styles.address, { color: colors.textTertiary }]} numberOfLines={1}>
            {order.delivery_address}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.status, { color: statusColor }]}>{STATUS_LABELS[order.status] || order.status}</Text>
          <Text style={[styles.fee, { color: colors.text }]}>${Number(order.delivery_fee).toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.sm, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: spacing.xs, marginRight: spacing.sm },
  content: { flex: 1 },
  orderNum: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  customer: { fontSize: fontSize.xs, marginTop: 1 },
  address: { fontSize: fontSize.xxs, marginTop: 1 },
  right: { alignItems: 'flex-end', marginLeft: spacing.sm },
  status: { fontSize: fontSize.xxs, fontWeight: fontWeight.bold },
  fee: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 2 },
});
