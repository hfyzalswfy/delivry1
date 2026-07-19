import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../theme/spacing';

interface StatisticCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
}

export function StatisticCard({ icon, value, label, color, bgColor }: StatisticCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, minWidth: '45%', padding: spacing.md,
    borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.sm,
  },
  iconWrap: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  value: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginBottom: 2 },
  label: { fontSize: fontSize.xs },
});
