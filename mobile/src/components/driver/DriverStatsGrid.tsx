import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface DriverStatsGridProps {
  activeDeliveries: number;
  completedToday: number;
  earnings: number;
  rating: number;
}

export function DriverStatsGrid({ activeDeliveries, completedToday, earnings, rating }: DriverStatsGridProps) {
  const colors = useColors();

  const stats = [
    { icon: '\u{1F4E6}', value: activeDeliveries.toString(), label: 'Active Deliveries' },
    { icon: '\u{2705}', value: completedToday.toString(), label: 'Completed Today' },
    { icon: '\u{1F9FE}', value: `$${earnings.toFixed(2)}`, label: 'Earnings' },
    { icon: '\u{2B50}', value: rating.toFixed(1), label: 'Rating' },
  ];

  return (
    <View style={styles.grid}>
      {stats.map((s, i) => (
        <View key={i} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={styles.icon}>{s.icon}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{s.value}</Text>
          <Text style={[styles.label, { color: colors.textTertiary }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.lg },
  card: { width: '48%', borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center' },
  icon: { fontSize: 28, marginBottom: spacing.sm },
  value: { fontSize: fontSize.xl, fontWeight: '700', marginBottom: spacing.xs },
  label: { fontSize: fontSize.xs, textAlign: 'center' },
});
