import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface DriverPerformanceSummaryProps {
  weeklyDeliveries: number;
  weeklyEarnings: number;
}

export function DriverPerformanceSummary({ weeklyDeliveries, weeklyEarnings }: DriverPerformanceSummaryProps) {
  const colors = useColors();
  const deliveryTarget = 60;
  const earningsTarget = 800;
  const deliveryPct = Math.min(weeklyDeliveries / deliveryTarget, 1);
  const earningsPct = Math.min(weeklyEarnings / earningsTarget, 1);

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.text }]}>Performance Summary</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Deliveries This Week</Text>
          <Text style={[styles.value, { color: colors.text }]}>{weeklyDeliveries} / {deliveryTarget}</Text>
        </View>
        <View style={[styles.progressBg, { backgroundColor: colors.borderLight }]}>
          <View style={{ width: `${deliveryPct * 100}%`, height: 8, backgroundColor: colors.primary, borderRadius: 4 }} />
        </View>
        <View style={[styles.row, { marginTop: spacing.md }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Earnings Target</Text>
          <Text style={[styles.value, { color: colors.text }]}>${weeklyEarnings.toFixed(0)} / ${earningsTarget}</Text>
        </View>
        <View style={[styles.progressBg, { backgroundColor: colors.borderLight }]}>
          <View style={{ width: `${earningsPct * 100}%`, height: 8, backgroundColor: colors.primary, borderRadius: 4 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  title: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md },
  card: { borderRadius: borderRadius.lg, padding: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  label: { fontSize: fontSize.sm },
  value: { fontSize: fontSize.sm, fontWeight: '600' },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
});
