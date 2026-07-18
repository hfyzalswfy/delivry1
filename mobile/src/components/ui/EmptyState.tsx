import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize } from '../../theme/spacing';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = '\u{1F4AC}', title, subtitle }: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  icon: { fontSize: 48, marginBottom: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: '600', marginBottom: spacing.xs, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, textAlign: 'center' },
});
