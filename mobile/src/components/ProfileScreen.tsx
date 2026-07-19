import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth-store';
import { colors } from '../theme/colors';
import { spacing, fontSize, borderRadius } from '../theme/spacing';
import { ICONS } from '../constants/icons';

export default function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <Text style={styles.name}>{profile?.full_name ?? 'User'}</Text>
      <Text style={styles.role}>{profile?.role?.toUpperCase() ?? ''}</Text>
      <Text style={styles.phone}>{profile?.phone ?? ''}</Text>

      {profile?.role === 'store' && (
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/(app)/(store)/store-address')}
        >
          <MaterialIcons name={ICONS.store} size={fontSize.lg} color={colors.primary} />
          <Text style={styles.menuText}>Store Address</Text>
          <MaterialIcons name={ICONS.chevronRight} size={fontSize.md} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', paddingTop: spacing.xxl * 2 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: fontSize.xxl, fontWeight: '700', color: '#fff' },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  role: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary, marginTop: spacing.xs },
  phone: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    width: '100%',
    maxWidth: 300,
  },
  menuText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.md,
  },
  signOut: { marginTop: spacing.xxl, backgroundColor: colors.dangerLight, borderRadius: borderRadius.md, padding: spacing.md, paddingHorizontal: spacing.xxl },
  signOutText: { color: colors.danger, fontSize: fontSize.md, fontWeight: '600' },
});
