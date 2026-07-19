import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../theme/spacing';

interface StatItem {
  value: string | number;
  label: string;
  valueColor?: string;
}

interface ProfileStatsRowProps {
  stats: StatItem[];
}

export function ProfileStatsRow({ stats }: ProfileStatsRowProps) {
  const colors = useColors();

  return (
    <View style={styles.row}>
      {stats.map((stat, idx) => (
        <View key={idx} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.value, { color: stat.valueColor || colors.text }]}>{stat.value}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  card: { flex: 1, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, alignItems: 'center' },
  value: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: 2 },
  label: { fontSize: fontSize.xs },
});
