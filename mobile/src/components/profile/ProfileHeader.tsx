import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../../theme/spacing';

interface ProfileHeaderProps {
  name: string;
  role: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export function ProfileHeader({ name, role, phone }: ProfileHeaderProps) {
  const colors = useColors();
  const initial = name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.avatarText, { color: colors.white }]}>{initial}</Text>
      </View>
      <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
      <Text style={[styles.role, { color: colors.primary }]}>{role}</Text>
      {phone && <Text style={[styles.phone, { color: colors.textSecondary }]}>{phone}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.lg, paddingHorizontal: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: borderRadius.full, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold },
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  role: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.xs },
  phone: { fontSize: fontSize.md },
});
