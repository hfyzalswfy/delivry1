import { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../theme/spacing';

interface ProfileCardProps {
  title?: string;
  children: ReactNode;
}

export function ProfileCard({ title, children }: ProfileCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      {children}
    </View>
  );
}

interface ProfileInfoRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

export function ProfileInfoRow({ label, value, isLast }: ProfileInfoRowProps) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

interface ProfileDocRowProps {
  icon: ReactNode;
  label: string;
}

export function ProfileDocRow({ icon, label }: ProfileDocRowProps) {
  const colors = useColors();
  return (
    <View style={styles.docRow}>
      {icon}
      <Text style={[styles.docLabel, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.lg, borderWidth: 1 },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm + spacing.xs },
  infoLabel: { fontSize: fontSize.md },
  infoValue: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  docRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm + spacing.xs },
  docLabel: { fontSize: fontSize.md, marginLeft: spacing.sm + spacing.xs },
});
