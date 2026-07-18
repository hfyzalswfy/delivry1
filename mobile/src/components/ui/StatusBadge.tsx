import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

const statusMap: Record<string, { color: keyof ReturnType<typeof useColors>; bg: keyof ReturnType<typeof useColors>; label: string }> = {
  draft: { color: 'textTertiary', bg: 'borderLight', label: 'Draft' },
  published: { color: 'info', bg: 'infoLight', label: 'Published' },
  driver_accepted: { color: 'purple', bg: 'purpleLight', label: 'Accepted' },
  driver_arrived_store: { color: 'warning', bg: 'warningLight', label: 'At Store' },
  picked_up: { color: 'warning', bg: 'warningLight', label: 'Picked Up' },
  on_the_way: { color: 'primary', bg: 'primaryLight', label: 'On the Way' },
  driver_arrived_destination: { color: 'primary', bg: 'primaryLight', label: 'Arrived' },
  delivered: { color: 'success', bg: 'successLight', label: 'Delivered' },
  cancelled: { color: 'danger', bg: 'dangerLight', label: 'Cancelled' },
  pending: { color: 'info', bg: 'infoLight', label: 'Pending' },
  assigned: { color: 'purple', bg: 'purpleLight', label: 'Assigned' },
  in_transit: { color: 'warning', bg: 'warningLight', label: 'In Transit' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = useColors();
  const config = statusMap[status];
  if (!config) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.borderLight }]}>
        <Text style={[styles.text, { color: colors.textTertiary, fontSize: size === 'sm' ? fontSize.xs : fontSize.sm }]}>
          {status}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: colors[config.bg] as string }]}>
      <Text style={[styles.text, { color: colors[config.color] as string, fontSize: size === 'sm' ? fontSize.xs : fontSize.sm }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, alignSelf: 'flex-start' },
  text: { fontWeight: '700' },
});
