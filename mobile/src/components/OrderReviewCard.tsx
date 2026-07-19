import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../theme/spacing';
import { ICONS } from '../constants/icons';

export type ReviewSection = 'customer' | 'pickup' | 'delivery' | 'details';

export interface ReviewOrderData {
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryApartment?: string;
  deliveryFloor?: string;
  deliveryLandmark?: string;
  deliveryNotes?: string;
  shipmentTypeName?: string;
  shipmentDescription?: string;
  deliveryFee: number;
  paymentMethod: string;
  priority: string;
  notesForDriver?: string;
}

interface OrderReviewCardProps {
  orderData: ReviewOrderData;
  onEdit?: (section: ReviewSection) => void;
}

function ReviewRow({ label, value, onEdit, editLabel }: { label: string; value: string; onEdit?: () => void; editLabel?: string }) {
  const colors = useColors();
  return (
    <View style={styles.reviewRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.reviewValue, { color: colors.text }]}>{value}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <MaterialIcons name={ICONS.edit} size={fontSize.sm} color={colors.textTertiary} />
          <Text style={[styles.editText, { color: colors.textTertiary }]}>{editLabel || 'Edit'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function OrderReviewCard({ orderData, onEdit }: OrderReviewCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Customer</Text>
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit('customer')}>
              <Text style={[styles.editSection, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.value, { color: colors.text }]}>{orderData.customerName}</Text>
        <Text style={[styles.valueSub, { color: colors.textSecondary }]}>{orderData.customerPhone}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Pickup Location</Text>
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit('pickup')}>
              <Text style={[styles.editSection, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.value, { color: colors.text }]}>{orderData.pickupAddress}</Text>
        <Text style={[styles.valueSub, { color: colors.textSecondary }]}>
          {orderData.pickupLat.toFixed(4)}, {orderData.pickupLng.toFixed(4)}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Delivery Location</Text>
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit('delivery')}>
              <Text style={[styles.editSection, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.value, { color: colors.text }]}>{orderData.deliveryAddress}</Text>
        <Text style={[styles.valueSub, { color: colors.textSecondary }]}>
          {orderData.deliveryLat.toFixed(4)}, {orderData.deliveryLng.toFixed(4)}
        </Text>
        {orderData.deliveryLandmark ? (
          <Text style={[styles.valueSub, { color: colors.textSecondary }]}>Landmark: {orderData.deliveryLandmark}</Text>
        ) : null}
        {orderData.deliveryNotes ? (
          <Text style={[styles.valueSub, { color: colors.textSecondary }]}>Notes: {orderData.deliveryNotes}</Text>
        ) : null}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Order Details</Text>
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit('details')}>
              <Text style={[styles.editSection, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        <ReviewRow label="Shipment Type" value={orderData.shipmentTypeName || '—'} />
        <ReviewRow label="Description" value={orderData.shipmentDescription || '—'} />
        <ReviewRow label="Delivery Fee" value={`$${orderData.deliveryFee.toFixed(2)}`} />
        <ReviewRow label="Payment Method" value={orderData.paymentMethod.charAt(0).toUpperCase() + orderData.paymentMethod.slice(1)} />
        <ReviewRow label="Priority" value={orderData.priority.charAt(0).toUpperCase() + orderData.priority.slice(1)} />
        <ReviewRow label="Notes for Driver" value={orderData.notesForDriver || '—'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  section: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editSection: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  value: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  valueSub: {
    fontSize: fontSize.sm,
  },
  divider: {
    height: 1,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  reviewLabel: {
    fontSize: fontSize.sm,
  },
  reviewValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  editText: {
    fontSize: fontSize.xs,
  },
});
